import { Router } from 'express';
import * as resumeController from '../controllers/resume.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Resume download requires authentication and authorization check in controller/service
router.get('/:id/download', authenticate, resumeController.downloadResume);

export default router;
