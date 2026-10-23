import { Router } from 'express';
import * as candidateController from '../controllers/candidate.controller.js';
import * as interviewController from '../controllers/interview.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { processResumeUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/candidate.validator.js';

const router = Router();

// Guard for candidate routes
router.use(authenticate, authorize('candidate'));

router.get('/profile', candidateController.getProfile);
router.put('/profile', validate(updateProfileSchema), candidateController.updateProfile);
router.post('/resumes', processResumeUpload, candidateController.uploadResume);
router.get('/resumes', candidateController.getResumes);
router.get('/applications', candidateController.getMyApplications);

// Interview Endpoints
router.get('/interviews', interviewController.getCandidateInterviews);
router.post('/interviews/:id/select-slot', interviewController.candidateSelectSlot);
router.post('/interviews/:id/decline-slots', interviewController.candidateDeclineSlots);
router.post('/interviews/:id/request-reschedule', interviewController.candidateRequestReschedule);

export default router;
