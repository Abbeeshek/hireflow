import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' })
});

export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  role: z.enum(['candidate', 'recruiter', 'admin']).optional(),
  status: z.enum(['active', 'inactive']).optional()
});

export const getAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional()
});
