import { z } from 'zod';

const scoringWeightsSchema = z
  .object({
    skills: z.number().int().min(0).max(100).default(30),
    experience: z.number().int().min(0).max(100).default(25),
    projects: z.number().int().min(0).max(100).default(20),
    education: z.number().int().min(0).max(100).default(15),
    roleAlignment: z.number().int().min(0).max(100).default(10)
  })
  .refine(
    (weights) => {
      const sum =
        weights.skills +
        weights.experience +
        weights.projects +
        weights.education +
        weights.roleAlignment;
      return sum === 100;
    },
    {
      message: 'Scoring weights must sum to exactly 100%'
    }
  );

export const createJobSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters'),
    department: z.string().trim().min(2, 'Department is required'),
    location: z.string().trim().min(2, 'Location is required'),
    employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']),
    workMode: z.enum(['onsite', 'hybrid', 'remote']),
    openings: z.coerce.number().int().min(1).default(1),
    experienceMin: z.coerce.number().int().min(0).default(0),
    experienceMax: z.coerce.number().int().min(0),
    description: z.string().trim().min(10, 'Description must be at least 10 characters'),
    requiredSkills: z.array(z.string().trim()).default([]),
    preferredSkills: z.array(z.string().trim()).default([]),
    mustHaveSkills: z.array(z.string().trim()).default([]),
    enforceMinExperience: z.boolean().default(true),
    educationRequirement: z
      .object({
        minLevel: z.enum(['none', 'diploma', 'bachelor', 'master', 'phd']).default('none'),
        preferredFields: z.array(z.string().trim()).default([])
      })
      .default({ minLevel: 'none', preferredFields: [] }),
    blindScreening: z.boolean().default(false),
    aiSuggested: z.boolean().default(false),
    status: z.enum(['draft', 'published', 'closed']).default('draft'),
    scoringWeights: scoringWeightsSchema.default({
      skills: 30,
      experience: 25,
      projects: 20,
      education: 15,
      roleAlignment: 10
    })
  })
  .refine((data) => data.experienceMax >= data.experienceMin, {
    message: 'Maximum experience must be greater than or equal to minimum experience',
    path: ['experienceMax']
  });

export const updateJobSchema = createJobSchema;

export const updateJobStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'closed'])
});

export const getJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  location: z.string().trim().optional(),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
  workMode: z.enum(['onsite', 'hybrid', 'remote']).optional(),
  skills: z.string().trim().optional()
});

export const generateCriteriaInputSchema = z.object({
  title: z.string().trim().min(2, 'Job title is required'),
  brief: z.string().trim().min(5, 'Brief is required'),
  experienceMin: z.coerce.number().int().min(0).optional(),
  experienceMax: z.coerce.number().int().min(0).optional()
});

export const criteriaSuggestionOutputSchema = z.object({
  description: z.string().default(''),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  suggestedMustHaveSkills: z.array(z.string()).default([]),
  interviewStages: z.array(z.string()).default(['screening', 'assessment', 'interview1', 'offer']),
  scoringWeights: scoringWeightsSchema.default({
    skills: 35,
    experience: 25,
    projects: 20,
    education: 10,
    roleAlignment: 10
  })
});

