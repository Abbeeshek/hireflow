import mongoose from 'mongoose';

export const APPLICATION_STAGES = [
  'applied',
  'screening',
  'shortlisted',
  'assessment',
  'interview1',
  'interview2',
  'hr_round',
  'offer',
  'hired',
  'rejected'
];

const stageHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: APPLICATION_STAGES,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    at: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: true }
);

const recruiterNoteSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true
    },
    coverNote: {
      type: String,
      default: '',
      trim: true
    },
    stage: {
      type: String,
      enum: APPLICATION_STAGES,
      default: 'applied',
      index: true
    },
    stageHistory: {
      type: [stageHistorySchema],
      default: []
    },
    recruiterNotes: {
      type: [recruiterNoteSchema],
      default: []
    },
    rejectionReason: {
      type: String,
      default: null
    },
    aiConsent: {
      type: Boolean,
      default: false
    },
    aiConsentAt: {
      type: Date,
      default: null
    },
    screening: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
applicationSchema.index({ stage: 1, createdAt: -1 });

export const Application = mongoose.model('Application', applicationSchema);
export default Application;
