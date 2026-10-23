import mongoose from 'mongoose';
import { CandidateProfile, Resume, Application, Job, User } from '../models/index.js';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { logAudit } from './audit.service.js';
import { enqueueResumeParse } from './resumeParser.service.js';

export const getProfile = async (userId) => {
  let profile = await CandidateProfile.findOne({ user: userId }).populate('user', 'name email');
  if (!profile) {
    // If not existing, create default profile
    profile = await CandidateProfile.create({
      user: userId,
      skills: [],
      education: [],
      projects: []
    });
    profile = await CandidateProfile.findById(profile._id).populate('user', 'name email');
  }
  return profile;
};

export const updateProfile = async (userId, data) => {
  const updateData = { ...data };
  if (updateData.talentPoolOptIn !== undefined) {
    updateData.talentPoolOptInAt = updateData.talentPoolOptIn ? new Date() : null;
  }
  const profile = await CandidateProfile.findOneAndUpdate(
    { user: userId },
    { $set: updateData },
    { new: true, upsert: true, runValidators: true }
  ).populate('user', 'name email');
  return profile;
};

export const createResume = async (userId, processedResume) => {
  const resume = await Resume.create({
    candidate: userId,
    originalName: processedResume.originalName,
    storedName: processedResume.storedName,
    mimeType: processedResume.mimeType,
    size: processedResume.size,
    uploadedAt: new Date()
  });

  // Trigger background parsing (in-process queue)
  enqueueResumeParse(resume._id);

  return resume;
};

export const getResumes = async (userId) => {
  return Resume.find({ candidate: userId }).sort({ uploadedAt: -1 }).lean();
};

export const applyJob = async (
  jobId,
  candidateId,
  { resumeId, coverNote = '', aiConsent },
  req = null
) => {
  if (aiConsent !== true) {
    throw new BadRequestError('AI screening consent is required to apply');
  }

  const job = await Job.findById(jobId).populate('company');
  if (!job) {
    throw new NotFoundError('Job opening not found');
  }

  if (job.status !== 'published') {
    throw new BadRequestError('Applications are only accepted for published job openings');
  }

  const resume = await Resume.findOne({ _id: resumeId, candidate: candidateId });
  if (!resume) {
    throw new BadRequestError('Selected resume does not exist or does not belong to you');
  }

  // Check duplicate application
  const existingApp = await Application.findOne({ job: jobId, candidate: candidateId });
  if (existingApp) {
    throw new ConflictError('You have already submitted an application for this job opening');
  }

  const application = await Application.create({
    job: jobId,
    candidate: candidateId,
    resume: resumeId,
    coverNote: coverNote.trim(),
    aiConsent: true,
    aiConsentAt: new Date(),
    stage: 'applied',
    stageHistory: [
      {
        stage: 'applied',
        changedBy: candidateId,
        at: new Date(),
        note: 'Application submitted by candidate'
      }
    ],
    recruiterNotes: []
  });

  await logAudit({
    actor: candidateId,
    action: 'APPLICATION_APPLY',
    entityType: 'Application',
    entityId: application._id,
    meta: { jobId: job._id, jobTitle: job.title, companyId: job.company?._id },
    req
  });

  // Notify recruiter of new application (respect blind screening codename)
  try {
    const candidateUser = await User.findById(candidateId).select('name');
    const candidateDisplayName = job.blindScreening
      ? `Candidate #${String(candidateId).slice(-4).toUpperCase()}`
      : (candidateUser?.name || 'A candidate');

    if (job.createdBy) {
      const { createNotification } = await import('./notificationService.js');
      await createNotification({
        user: job.createdBy,
        type: 'new_application',
        title: `New Applicant: ${job.title}`,
        body: `${candidateDisplayName} has submitted an application for ${job.title}.`,
        link: `/recruiter/applications/${application._id}`,
        meta: { applicationId: application._id, jobId: job._id }
      });
    }
  } catch (notifErr) {
    console.error('[CandidateService] Error creating new application notification:', notifErr.message);
  }

  return application;
};

export const getCandidateApplications = async (candidateId) => {
  const applications = await Application.find({ candidate: candidateId })
    .select('-screening') // Enforce Non-Negotiable Principle #6: Candidate never sees screening data
    .populate({
      path: 'job',
      select: 'title department location employmentType workMode company status',
      populate: { path: 'company', select: 'name website' }
    })
    .populate('resume', 'originalName storedName mimeType size uploadedAt parseStatus')
    .sort({ createdAt: -1 })
    .lean();

  return applications;
};

export const getApplicationById = async (applicationId, user) => {
  const application = await Application.findById(applicationId)
    .populate({
      path: 'job',
      populate: { path: 'company', select: 'name owner' }
    })
    .populate('candidate', 'name email phone location')
    .populate('resume')
    .populate('stageHistory.changedBy', 'name role')
    .populate('recruiterNotes.author', 'name role');

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Authorization check
  if (user.role === 'candidate') {
    if (String(application.candidate._id) !== String(user._id)) {
      throw new ForbiddenError('You can only view your own applications');
    }
  } else if (user.role === 'recruiter') {
    const jobCompanyId = application.job?.company?._id;
    const recruiterCompanyId = user.company?._id || user.company;
    if (!jobCompanyId || String(jobCompanyId) !== String(recruiterCompanyId)) {
      throw new ForbiddenError('You can only view applications for your company jobs');
    }
  }

  const appObj = application.toObject();

  // Enforce Non-Negotiable Principle #6: Candidate NEVER sees screening data
  if (user.role === 'candidate') {
    delete appObj.screening;
    return appObj;
  }

  // Recruiter view: check for screening staleness
  if (appObj.screening && appObj.screening.status === 'completed') {
    const jobUpdated = new Date(application.job?.updatedAt || 0);
    const screenedAtJob = new Date(appObj.screening.jobUpdatedAtAtScreening || 0);
    if (jobUpdated > screenedAtJob) {
      appObj.screening.stale = true;
    }
  }

  // Backend-enforced BLIND SCREENING
  const isBlindActive =
    application.job?.blindScreening &&
    ['applied', 'screening'].includes(application.stage);

  if (isBlindActive) {
    const codename = `Candidate A-${String(application._id).slice(-4)}`;
    appObj.candidate = {
      _id: application.candidate._id,
      name: codename,
      isAnonymized: true
    };

    // Anonymize raw resume file access
    if (appObj.resume) {
      appObj.resume = {
        _id: appObj.resume._id,
        originalName: 'Redacted_Resume.pdf',
        mimeType: appObj.resume.mimeType,
        size: appObj.resume.size,
        parsedProfile: appObj.resume.parsedProfile,
        parseStatus: appObj.resume.parseStatus
      };
    }
    appObj.candidateProfile = null;
  } else {
    // Enrich with candidate profile details
    const candidateProfile = await CandidateProfile.findOne({
      user: application.candidate._id
    }).lean();
    appObj.candidateProfile = candidateProfile || null;
  }

  return appObj;
};

