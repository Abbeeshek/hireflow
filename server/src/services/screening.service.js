import mongoose from 'mongoose';
import { Application, Job, Resume, ScreeningRun } from '../models/index.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { matchCandidateToJob } from '../ai/matchEngine.js';
import { ensureResumeParsed } from './resumeParser.service.js';
import { logAudit } from './audit.service.js';

const CONCURRENCY_LIMIT = parseInt(process.env.AI_CONCURRENCY, 10) || 3;

/**
 * Screens a single application.
 */
export async function screenApplication(applicationId, user, { force = false } = {}) {
  const application = await Application.findById(applicationId)
    .populate('job')
    .populate('resume')
    .populate('candidate', 'name email');

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Recruiter authorization check
  const recruiterCompanyId = user.company?._id || user.company;
  if (user.role === 'recruiter') {
    const jobCompanyId = application.job?.company?._id || application.job?.company;
    if (!recruiterCompanyId || String(jobCompanyId) !== String(recruiterCompanyId)) {
      throw new ForbiddenError('You can only screen applications for jobs belonging to your company');
    }
  }

  // Check AI consent
  if (!application.aiConsent) {
    throw new BadRequestError('Application cannot be screened: candidate has not provided AI consent');
  }

  // Check if already screened and not force
  if (!force && application.screening && application.screening.status === 'completed') {
    const isJobStale =
      application.job?.updatedAt &&
      new Date(application.job.updatedAt) > new Date(application.screening.jobUpdatedAtAtScreening);
    if (!isJobStale) {
      return application;
    }
  }

  // Ensure resume text has been extracted and parsed
  const parsedResume = await ensureResumeParsed(application.resume._id);
  if (!parsedResume) {
    throw new BadRequestError('Unable to process resume for screening');
  }

  // Run match engine
  const screeningResult = await matchCandidateToJob({
    job: application.job,
    resume: parsedResume
  });

  application.screening = screeningResult;

  // Auto stage change: applied -> screening with system actor
  if (application.stage === 'applied') {
    application.stage = 'screening';
    application.stageHistory.push({
      stage: 'screening',
      changedBy: null, // actor "system"
      at: new Date(),
      note: 'AI screening completed'
    });
  }

  await application.save();

  await logAudit({
    actor: user._id,
    action: 'AI_SCREEN',
    entityType: 'Application',
    entityId: application._id,
    meta: {
      provider: screeningResult.provider,
      model: screeningResult.model,
      weightsUsed: screeningResult.weightsUsed,
      rules: screeningResult.ruleResults,
      bucket: screeningResult.bucket,
      overall: screeningResult.overall
    }
  });

  return application;
}

/**
 * Starts a background batch screening run for a job opening.
 * Concurrency limited, one failure never stops the run.
 */
export async function startJobScreeningRun(jobId, user, { force = false } = {}) {
  const recruiterCompanyId = user.company?._id || user.company;
  const job = await Job.findOne({ _id: jobId, company: recruiterCompanyId });
  if (!job) {
    throw new NotFoundError('Job opening not found for your company');
  }

  // Find candidate applications eligible for screening
  const query = {
    job: jobId,
    stage: { $in: ['applied', 'screening'] },
    aiConsent: true
  };

  const applications = await Application.find(query)
    .populate('resume')
    .lean();

  // Filter out already screened unless force or job changed
  const eligibleApps = applications.filter((app) => {
    if (force) return true;
    if (!app.screening || app.screening.status !== 'completed') return true;
    const isStale =
      job.updatedAt &&
      new Date(job.updatedAt) > new Date(app.screening.jobUpdatedAtAtScreening);
    return isStale;
  });

  // Create ScreeningRun record
  const screeningRun = await ScreeningRun.create({
    job: jobId,
    startedBy: user._id,
    status: eligibleApps.length > 0 ? 'running' : 'completed',
    total: eligibleApps.length,
    completed: 0,
    failed: 0,
    startedAt: new Date(),
    finishedAt: eligibleApps.length === 0 ? new Date() : null
  });

  if (eligibleApps.length === 0) {
    return { runId: screeningRun._id };
  }

  // Launch background execution with concurrency limit
  processBatchInBackground(screeningRun._id, eligibleApps, user, force).catch((err) => {
    console.error(`[ScreeningRun] Unhandled error in batch screening run ${screeningRun._id}:`, err.message);
  });

  return { runId: screeningRun._id };
}

/**
 * Worker pool processor for batch screening runs.
 */
async function processBatchInBackground(runId, apps, user, force) {
  let completed = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < apps.length) {
      const app = apps[cursor++];
      try {
        await screenApplication(app._id, user, { force });
        completed++;
      } catch (err) {
        console.warn(`[ScreeningRun] Failed to screen application ${app._id}:`, err.message);
        failed++;
      } finally {
        await ScreeningRun.findByIdAndUpdate(runId, {
          $set: { completed, failed }
        });
      }
    }
  }

  const workers = [];
  const workerCount = Math.min(CONCURRENCY_LIMIT, apps.length);
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  await ScreeningRun.findByIdAndUpdate(runId, {
    $set: {
      status: 'completed',
      completed,
      failed,
      finishedAt: new Date()
    }
  });

  try {
    const { createNotification } = await import('./notificationService.js');
    await createNotification({
      user: user._id,
      type: 'screening_completed',
      title: 'AI Screening Complete',
      body: `Batch screening finished for ${completed} applicant(s) (${failed} failed).`,
      link: apps[0]?.job ? `/recruiter/jobs/${apps[0].job}/applicants` : '/recruiter/jobs'
    });
  } catch (notifErr) {
    console.error('[ScreeningService] Notification error:', notifErr.message);
  }
}

/**
 * Retrieves the status of the latest screening run for a job.
 */
export async function getScreeningStatus(jobId, user) {
  const recruiterCompanyId = user.company?._id || user.company;
  const job = await Job.findOne({ _id: jobId, company: recruiterCompanyId });
  if (!job) {
    throw new NotFoundError('Job opening not found for your company');
  }

  const run = await ScreeningRun.findOne({ job: jobId }).sort({ createdAt: -1 }).lean();
  if (!run) {
    return { status: 'none', total: 0, completed: 0, failed: 0 };
  }

  return {
    runId: run._id,
    status: run.status,
    total: run.total,
    completed: run.completed,
    failed: run.failed,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt
  };
}

/**
 * Compares 2 to 3 screened applications for a job side by side.
 * Returns sub-scores, skill matrix, strengths/concerns. No "winner".
 */
export async function compareApplications(jobId, user, applicationIds) {
  const recruiterCompanyId = user.company?._id || user.company;
  const job = await Job.findOne({ _id: jobId, company: recruiterCompanyId });
  if (!job) {
    throw new NotFoundError('Job opening not found for your company');
  }

  if (!Array.isArray(applicationIds) || applicationIds.length < 2 || applicationIds.length > 3) {
    throw new BadRequestError('Must provide between 2 and 3 applications to compare');
  }

  const applications = await Application.find({
    _id: { $in: applicationIds },
    job: jobId
  })
    .populate('candidate', 'name email')
    .populate('resume')
    .lean();

  if (applications.length !== applicationIds.length) {
    throw new BadRequestError('One or more selected applications were not found for this job');
  }

  // Ensure all compared applications have completed screening
  for (const app of applications) {
    if (!app.screening || app.screening.status !== 'completed') {
      throw new BadRequestError('All applications in comparison must be screened first');
    }
  }

  // Build skill matrix across all required and preferred skills
  const allJobSkills = [
    ...(job.requiredSkills || []).map((s) => ({ skill: s, kind: 'required' })),
    ...(job.preferredSkills || []).map((s) => ({ skill: s, kind: 'preferred' }))
  ];

  const skillMatrix = allJobSkills.map(({ skill, kind }) => {
    const row = { skill, kind, candidates: {} };
    applications.forEach((app) => {
      const match = (app.screening.skillMatches || []).find(
        (sm) => sm.skill.toLowerCase() === skill.toLowerCase()
      );
      row.candidates[String(app._id)] = match
        ? {
            status: match.status,
            similarity: match.similarity,
            matchedWith: match.matchedWith,
            hasEvidence: Array.isArray(match.evidence) && match.evidence.length > 0
          }
        : { status: 'missing', similarity: 0, matchedWith: null, hasEvidence: false };
    });
    return row;
  });

  return {
    job: {
      _id: job._id,
      title: job.title,
      scoringWeights: job.scoringWeights
    },
    applications: applications.map((app) => ({
      _id: app._id,
      candidate: {
        _id: app.candidate?._id,
        name: job.blindScreening && ['applied', 'screening'].includes(app.stage)
          ? `Candidate A-${String(app._id).slice(-4)}`
          : app.candidate?.name
      },
      stage: app.stage,
      screening: app.screening
    })),
    skillMatrix
  };
}

export default {
  screenApplication,
  startJobScreeningRun,
  getScreeningStatus,
  compareApplications
};
