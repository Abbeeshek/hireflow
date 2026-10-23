import { z } from 'zod';
import { APPLICATION_STAGES } from '../models/Application.js';

export const updateStageSchema = z.object({
  stage: z.enum(APPLICATION_STAGES, {
    errorMap: () => ({ message: `Invalid stage. Must be one of: ${APPLICATION_STAGES.join(', ')}` })
  }),
  note: z.string().trim().default('')
});

export const addNoteSchema = z.object({
  text: z.string().trim().min(1, 'Note content cannot be empty')
});
