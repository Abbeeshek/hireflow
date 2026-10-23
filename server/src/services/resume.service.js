import path from 'path';
import fs from 'fs';
import { Resume, Application, Job } from '../models/index.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { UPLOAD_DIR } from '../middleware/upload.js';
import { logAudit } from './audit.service.js';

export const getResumeForDownload = async (resumeId, user, req = null) => {
  const resume = await Resume.findById(resumeId);
  if (!resume) {
    throw new NotFoundError('Resume file not found');
  }

  let authorized = false;

  if (user.role === 'admin') {
    authorized = true;
  } else if (user.role === 'candidate') {
    if (String(resume.candidate) === String(user._id)) {
      authorized = true;
    }
  } else if (user.role === 'recruiter') {
    const recruiterCompanyId = user.company?._id || user.company;
    if (recruiterCompanyId) {
      // Find jobs belonging to recruiter company
      const companyJobIds = await Job.find({ company: recruiterCompanyId }).distinct('_id');
      // Check if an application exists for one of these jobs with this resume
      const application = await Application.findOne({
        resume: resume._id,
        job: { $in: companyJobIds }
      }).populate('job');
      if (application) {
        // Enforce blind screening: block raw resume download before shortlisting
        if (application.job?.blindScreening && ['applied', 'screening'].includes(application.stage)) {
          throw new ForbiddenError('revealed after shortlisting');
        }
        authorized = true;
      }
    }
  }

  if (!authorized) {
    throw new ForbiddenError('You do not have permission to download this resume');
  }

  const filePath = path.join(UPLOAD_DIR, resume.storedName);
  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('Resume file does not exist on disk');
  }

  await logAudit({
    actor: user._id,
    action: 'RESUME_DOWNLOAD',
    entityType: 'Resume',
    entityId: resume._id,
    meta: { originalName: resume.originalName },
    req
  });

  return {
    filePath,
    originalName: resume.originalName,
    mimeType: resume.mimeType
  };
};
