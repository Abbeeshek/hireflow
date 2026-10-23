import mongoose from 'mongoose';
import { DEFAULT_INTERVIEW_PLAN } from '../config/interviewDefaults.js';

const scoringWeightsSchema = new mongoose.Schema(
  {
    skills: { type: Number, required: true, default: 30, min: 0, max: 100 },
    experience: { type: Number, required: true, default: 25, min: 0, max: 100 },
    projects: { type: Number, required: true, default: 20, min: 0, max: 100 },
    education: { type: Number, required: true, default: 15, min: 0, max: 100 },
    roleAlignment: { type: Number, required: true, default: 10, min: 0, max: 100 }
  },
  { _id: false }
);

const criterionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0, max: 100 }
  },
  { _id: false }
);

const roundPlanSchema = new mongoose.Schema(
  {
    round: {
      type: String,
      enum: ['interview1', 'interview2', 'hr_round'],
      required: true
    },
    name: { type: String, required: true, trim: true },
    mode: {
      type: String,
      enum: ['video', 'phone', 'onsite'],
      default: 'video'
    },
    durationMinutes: { type: Number, default: 45, min: 15, max: 180 },
    questionCount: { type: Number, default: 4, min: 1, max: 20 },
    criteria: {
      type: [criterionSchema],
      default: []
    }
  },
  { _id: false }
);

scoringWeightsSchema.pre('validate', function (next) {
  const sum =
    (this.skills || 0) +
    (this.experience || 0) +
    (this.projects || 0) +
    (this.education || 0) +
    (this.roleAlignment || 0);
  if (sum !== 100) {
    this.invalidate('scoringWeights', `Scoring weights must sum to exactly 100 (current sum: ${sum})`);
  }
  next();
});

const jobSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      required: true
    },
    workMode: {
      type: String,
      enum: ['onsite', 'hybrid', 'remote'],
      required: true
    },
    openings: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    experienceMin: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    experienceMax: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: true
    },
    requiredSkills: {
      type: [String],
      default: []
    },
    preferredSkills: {
      type: [String],
      default: []
    },
    mustHaveSkills: {
      type: [String],
      default: []
    },
    enforceMinExperience: {
      type: Boolean,
      default: true
    },
    educationRequirement: {
      minLevel: {
        type: String,
        enum: ['none', 'diploma', 'bachelor', 'master', 'phd'],
        default: 'none'
      },
      preferredFields: {
        type: [String],
        default: []
      }
    },
    blindScreening: {
      type: Boolean,
      default: false
    },
    aiSuggested: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
      index: true
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true
    },
    closesAt: {
      type: Date,
      default: null
    },
    scoringWeights: {
      type: scoringWeightsSchema,
      default: () => ({
        skills: 30,
        experience: 25,
        projects: 20,
        education: 15,
        roleAlignment: 10
      })
    },
    interviewPlan: {
      type: [roundPlanSchema],
      default: () => DEFAULT_INTERVIEW_PLAN
    }
  },
  {
    timestamps: true
  }
);

jobSchema.index({ title: 'text', description: 'text', department: 'text' });
jobSchema.index({ company: 1, status: 1 });

export const Job = mongoose.model('Job', jobSchema);
export default Job;
