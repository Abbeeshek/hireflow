import mongoose from 'mongoose';

export const DUPLICATE_STATUSES = ['open', 'confirmed_duplicate', 'not_duplicate'];

const signalSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    detail: { type: String, default: '' },
    score: { type: Number, default: 0 }
  },
  { _id: false }
);

const duplicateFlagSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    candidateA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    candidateB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    signals: {
      type: [signalSchema],
      default: []
    },
    status: {
      type: String,
      enum: DUPLICATE_STATUSES,
      default: 'open',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    note: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

duplicateFlagSchema.index({ company: 1, status: 1 });
duplicateFlagSchema.index({ company: 1, candidateA: 1, candidateB: 1 });

export const DuplicateFlag = mongoose.model('DuplicateFlag', duplicateFlagSchema);
export default DuplicateFlag;
