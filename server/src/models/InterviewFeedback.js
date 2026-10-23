import mongoose from 'mongoose';

export const RECOMMENDATION_VALUES = ['strong_yes', 'yes', 'no', 'strong_no'];

const questionNoteSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewQuestion'
    },
    note: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: false }
);

const interviewFeedbackSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      index: true
    },
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    scores: {
      type: Map,
      of: Number,
      default: {}
    },
    scoreMeta: {
      type: Map,
      of: new mongoose.Schema(
        {
          aiSuggested: { type: Boolean, default: false },
          changedAfterSuggestion: { type: Boolean, default: false }
        },
        { _id: false }
      ),
      default: {}
    },
    questionNotes: {
      type: [questionNoteSchema],
      default: []
    },
    strengths: {
      type: String,
      default: '',
      trim: true
    },
    concerns: {
      type: String,
      default: '',
      trim: true
    },
    recommendation: {
      type: String,
      enum: RECOMMENDATION_VALUES,
      required: true
    },
    comment: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique feedback per interviewer per interview
interviewFeedbackSchema.index({ interview: 1, interviewer: 1 }, { unique: true });

export const InterviewFeedback = mongoose.model('InterviewFeedback', interviewFeedbackSchema);
export default InterviewFeedback;
