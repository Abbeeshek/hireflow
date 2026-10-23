import { Application } from '../models/index.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { logAudit } from './audit.service.js';
import { createNotification } from './notificationService.js';

export const updateApplicationStage = async (applicationId, recruiterUser, { stage, note = '' }, req = null) => {
  const application = await Application.findById(applicationId).populate({
    path: 'job',
    select: 'title company'
  });

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Verify recruiter owns the company of this job
  const jobCompanyId = application.job?.company;
  const recruiterCompanyId = recruiterUser.company?._id || recruiterUser.company;

  if (recruiterUser.role !== 'admin') {
    if (!jobCompanyId || String(jobCompanyId) !== String(recruiterCompanyId)) {
      throw new ForbiddenError('You can only update application stages for your own company jobs');
    }
  }

  const previousStage = application.stage;
  application.stage = stage;
  application.stageHistory.push({
    stage,
    changedBy: recruiterUser._id,
    at: new Date(),
    note: note.trim()
  });

  await application.save();

  // Notify candidate of stage change (strictly stage name, zero AI data)
  await createNotification({
    user: application.candidate,
    type: 'application_stage_changed',
    title: `Application Status Updated: ${application.job?.title || 'Job'}`,
    body: `Your application stage is now "${stage}".`,
    link: '/candidate/dashboard',
    meta: { stage, jobId: application.job?._id }
  });

  const aiBucket = application.screening?.bucket || null;
  const auditMeta = {
    jobId: application.job._id,
    previousStage,
    newStage: stage,
    note
  };
  if (aiBucket) {
    auditMeta.aiBucket = aiBucket;
    auditMeta.action = stage;
  }

  await logAudit({
    actor: recruiterUser._id,
    action: 'STAGE_CHANGE',
    entityType: 'Application',
    entityId: application._id,
    meta: auditMeta,
    req
  });

  return Application.findById(application._id)
    .populate('candidate', 'name email')
    .populate('stageHistory.changedBy', 'name role')
    .populate('recruiterNotes.author', 'name role');
};

export const addRecruiterNote = async (applicationId, recruiterUser, text, req = null) => {
  const application = await Application.findById(applicationId).populate({
    path: 'job',
    select: 'company'
  });

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  const jobCompanyId = application.job?.company;
  const recruiterCompanyId = recruiterUser.company?._id || recruiterUser.company;

  if (recruiterUser.role !== 'admin') {
    if (!jobCompanyId || String(jobCompanyId) !== String(recruiterCompanyId)) {
      throw new ForbiddenError('You can only add notes to applicants for your company jobs');
    }
  }

  application.recruiterNotes.push({
    author: recruiterUser._id,
    text: text.trim(),
    at: new Date()
  });

  await application.save();

  return Application.findById(application._id)
    .populate('recruiterNotes.author', 'name role');
};
