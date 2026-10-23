import { Router } from 'express';
import { downloadIcs } from '../controllers/interview.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Shared endpoint: candidate, interviewer, or company recruiter can download .ics
router.get('/:id/ics', downloadIcs);

export default router;
