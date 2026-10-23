import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    html: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      default: ''
    },
    ics: {
      type: String,
      default: null
    },
    kind: {
      type: String,
      default: 'general'
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true
    },
    relatedInterview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

emailLogSchema.index({ to: 1, createdAt: -1 });
emailLogSchema.index({ company: 1, createdAt: -1 });

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
