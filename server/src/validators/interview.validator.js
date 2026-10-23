import { z } from 'zod';
import { INTERVIEW_ROUNDS, INTERVIEW_MODES } from '../models/Interview.js';

export const offerSlotsSchema = z.object({
  round: z.enum(INTERVIEW_ROUNDS),
  mode: z.enum(INTERVIEW_MODES).default('video'),
  durationMinutes: z.number().int().min(15).max(180).default(45),
  interviewers: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')).min(1, 'At least one interviewer is required'),
  rangeStart: z.string().datetime({ offset: true }).optional().or(z.string().optional()),
  rangeEnd: z.string().datetime({ offset: true }).optional().or(z.string().optional()),
  selectedSlots: z.array(z.object({
    start: z.string().or(z.date()),
    end: z.string().or(z.date())
  })).optional()
});

export const selectSlotSchema = z.object({
  slotStart: z.string().or(z.date())
});

export const declineSlotsSchema = z.object({
  windows: z.array(z.object({
    start: z.string().or(z.date()),
    end: z.string().or(z.date())
  })).max(3, 'Maximum 3 availability windows allowed').default([]),
  note: z.string().max(500).default('')
});

export const requestRescheduleSchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
  windows: z.array(z.object({
    start: z.string().or(z.date()),
    end: z.string().or(z.date())
  })).max(3).optional()
});

export const manualTimeSchema = z.object({
  scheduledStart: z.string().or(z.date()),
  scheduledEnd: z.string().or(z.date()),
  mode: z.enum(INTERVIEW_MODES).optional(),
  meetingLink: z.string().url().or(z.string()).optional(),
  location: z.string().max(200).optional()
});

export const availabilitySchema = z.object({
  timezone: z.string().min(2, 'Timezone is required'),
  weekly: z.array(z.object({
    day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm')
  })).min(1, 'At least one availability day window required'),
  bufferMinutes: z.number().int().min(0).max(60).default(15)
});

export const teamCreateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Temporary password must be at least 6 characters'),
  role: z.enum(['recruiter']).default('recruiter')
});

export default {
  offerSlotsSchema,
  selectSlotSchema,
  declineSlotsSchema,
  requestRescheduleSchema,
  manualTimeSchema,
  availabilitySchema,
  teamCreateSchema
};
