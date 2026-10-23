import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Invalid email address').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['candidate', 'recruiter'], {
      errorMap: () => ({ message: 'Role must be candidate or recruiter' })
    }),
    companyName: z.string().trim().optional()
  })
  .refine(
    (data) => {
      if (data.role === 'recruiter') {
        return !!data.companyName && data.companyName.trim().length >= 2;
      }
      return true;
    },
    {
      message: 'Company name is required for recruiters (min 2 characters)',
      path: ['companyName']
    }
  );

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});
