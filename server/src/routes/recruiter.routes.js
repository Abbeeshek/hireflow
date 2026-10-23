import { Router } from 'express';
import * as recruiterController from '../controllers/recruiter.controller.js';
import * as teamController from '../controllers/team.controller.js';
import * as interviewController from '../controllers/interview.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  generateCriteriaInputSchema
} from '../validators/job.validator.js';

const router = Router();

// Recruiter routes guard
router.use(authenticate, authorize('recruiter'));

// Team & Availability
router.get('/availability', teamController.getAvailability);
router.put('/availability', teamController.updateAvailability);
router.get('/team', teamController.getTeamMembers);
router.post('/team', teamController.createTeammate);

// Interview Scheduling & Management
router.post('/applications/:id/interviews/offer-slots', interviewController.offerSlots);
router.post('/interviews/:id/regenerate-slots', interviewController.regenerateInterviewSlots);
router.post('/interviews/:id/manual-time', interviewController.manualSchedule);
router.post('/interviews/:id/cancel', interviewController.cancel);
router.post('/interviews/:id/complete', interviewController.complete);
router.post('/interviews/:id/no-show', interviewController.noShow);
router.get('/interviews', interviewController.getRecruiterInterviews);
router.get('/interviews/:id', interviewController.getRecruiterInterviewById);

router.get('/dashboard', recruiterController.getDashboard);
router.get('/jobs', recruiterController.getJobs);
router.post('/jobs/ai/criteria', validate(generateCriteriaInputSchema), recruiterController.generateCriteria);
router.post('/jobs', validate(createJobSchema), recruiterController.createJob);
router.put('/jobs/:id', validate(updateJobSchema), recruiterController.updateJob);
router.patch('/jobs/:id/status', validate(updateJobStatusSchema), recruiterController.updateJobStatus);
router.post('/jobs/:id/screen', recruiterController.screenJob);
router.get('/jobs/:id/screen/status', recruiterController.getScreeningStatus);
router.get('/jobs/:id/compare', recruiterController.compareApplications);
router.get('/jobs/:id/applications', recruiterController.getJobApplications);

export default router;


