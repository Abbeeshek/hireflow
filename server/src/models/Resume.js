import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    storedName: {
      type: String,
      required: true,
      unique: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    extractedText: {
      type: String,
      default: null
    },
    parsedProfile: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    parseStatus: {
      type: String,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending',
      index: true
    },
    parseError: {
      type: String,
      default: null
    },
    parsedAt: {
      type: Date,
      default: null
    },
    parserProvider: {
      type: String,
      default: null
    },
    sentences: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;
