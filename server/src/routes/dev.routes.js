import { Router } from 'express';
import * as devController from '../controllers/dev.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/mailbox', devController.getDevMailbox);
router.post('/run-jobs', devController.runDevJobs);

export default router;
