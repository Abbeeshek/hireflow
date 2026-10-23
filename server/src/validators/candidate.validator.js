import { z } from 'zod';

const educationItemSchema = z.object({
  degree: z.string().trim().min(1, 'Degree is required'),
  institution: z.string().trim().min(1, 'Institution is required'),
  year: z.coerce.number().int().min(1950).max(2100, 'Invalid year')
});

const projectItemSchema = z.object({
  title: z.string().trim().min(1, 'Project title is required'),
  description: z.string().trim().default(''),
  techStack: z.array(z.string().trim()).default([])
});

export const updateProfileSchema = z.object({
  phone: z.string().trim().default(''),
  headline: z.string().trim().default(''),
  location: z.string().trim().default(''),
  totalExperienceYears: z.coerce.number().min(0).default(0),
  skills: z.array(z.string().trim()).default([]),
  education: z.array(educationItemSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
  links: z
    .object({
      linkedin: z.string().trim().default(''),
      github: z.string().trim().default(''),
      portfolio: z.string().trim().default('')
    })
    .default({}),
  talentPoolOptIn: z.boolean().optional()
});

export const applyJobSchema = z.object({
  resumeId: z.string().trim().min(1, 'Resume selection is required'),
  coverNote: z.string().trim().default(''),
  aiConsent: z.boolean().refine((val) => val === true, {
    message: 'You must consent to AI-assisted screening to submit your application'
  })
});

