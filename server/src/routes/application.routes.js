import { Router } from 'express';
import * as pipelineController from '../controllers/pipeline.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateStageSchema, addNoteSchema } from '../validators/pipeline.validator.js';

const router = Router();

// All application routes require authentication
router.use(authenticate);

router.get('/:id', pipelineController.getApplicationById);
router.post('/:id/screen', authorize('recruiter', 'admin'), pipelineController.rescreenApplication);
router.patch('/:id/stage', authorize('recruiter', 'admin'), validate(updateStageSchema), pipelineController.updateStage);
router.post('/:id/notes', authorize('recruiter', 'admin'), validate(addNoteSchema), pipelineController.addNote);


export default router;
