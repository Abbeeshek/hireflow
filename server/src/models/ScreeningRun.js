import mongoose from 'mongoose';

const screeningRunSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'running',
      index: true
    },
    total: {
      type: Number,
      default: 0
    },
    completed: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    finishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const ScreeningRun = mongoose.model('ScreeningRun', screeningRunSchema);
export default ScreeningRun;
