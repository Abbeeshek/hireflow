import mongoose from 'mongoose';

export const INTERVIEW_ROUNDS = ['interview1', 'interview2', 'hr_round'];
export const INTERVIEW_MODES = ['video', 'phone', 'onsite'];
export const INTERVIEW_STATUSES = [
  'slots_offered',
  'slots_declined',
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
  'reschedule_requested',
  'expired'
];

const slotSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true
    },
    round: {
      type: String,
      enum: INTERVIEW_ROUNDS,
      required: true
    },
    mode: {
      type: String,
      enum: INTERVIEW_MODES,
      default: 'video'
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 45,
      min: 15,
      max: 180
    },
    interviewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    status: {
      type: String,
      enum: INTERVIEW_STATUSES,
      default: 'slots_offered',
      index: true
    },
    offeredSlots: {
      type: [slotSchema],
      default: []
    },
    offerCreatedAt: {
      type: Date,
      default: Date.now
    },
    offerExpiresAt: {
      type: Date
    },
    scheduledStart: {
      type: Date,
      default: null,
      index: true
    },
    scheduledEnd: {
      type: Date,
      default: null
    },
    meetingLink: {
      type: String,
      default: '',
      trim: true
    },
    location: {
      type: String,
      default: '',
      trim: true
    },
    candidateAvailability: {
      windows: {
        type: [slotSchema],
        default: []
      },
      note: {
        type: String,
        default: '',
        trim: true
      }
    },
    rescheduleCount: {
      type: Number,
      default: 0,
      min: 0
    },
    reminders: {
      h24SentAt: { type: Date, default: null },
      h1SentAt: { type: Date, default: null },
      nudgeSentAt: { type: Date, default: null },
      feedbackPending1SentAt: { type: Date, default: null },
      feedbackPending2SentAt: { type: Date, default: null }
    },
    notes: {
      text: { type: String, default: '' },
      source: { type: String, default: 'manual' }, // manual | transcript | upload
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      updatedAt: { type: Date, default: null }
    },
    aiSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

interviewSchema.index({ interviewers: 1, scheduledStart: 1 });
interviewSchema.index({ application: 1, round: 1 });
interviewSchema.index({ job: 1, status: 1 });

export const Interview = mongoose.model('Interview', interviewSchema);
export default Interview;
