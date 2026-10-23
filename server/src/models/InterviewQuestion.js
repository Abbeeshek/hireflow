import mongoose from 'mongoose';

export const QUESTION_KINDS = ['skill_check', 'gap_probe', 'scenario', 'behavioral'];
export const QUESTION_SOURCES = ['ai', 'manual'];

const interviewQuestionSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      index: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    competencyKey: {
      type: String,
      required: true,
      trim: true
    },
    kind: {
      type: String,
      enum: QUESTION_KINDS,
      required: true,
      default: 'skill_check'
    },
    expectedPoints: {
      type: [String],
      default: []
    },
    difficulty: {
      type: String,
      default: 'mid'
    },
    linkedSkill: {
      type: String,
      default: '',
      trim: true
    },
    source: {
      type: String,
      enum: QUESTION_SOURCES,
      default: 'ai'
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

interviewQuestionSchema.index({ interview: 1, order: 1 });

export const InterviewQuestion = mongoose.model('InterviewQuestion', interviewQuestionSchema);
export default InterviewQuestion;
