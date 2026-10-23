import { z } from 'zod';

export const screenJobSchema = z.object({
  force: z.boolean().optional().default(false)
});

export const compareQuerySchema = z.object({
  ids: z.string().trim().min(1, 'ids parameter is required (comma-separated list of 2 to 3 IDs)')
});

export default {
  screenJobSchema,
  compareQuerySchema
};
