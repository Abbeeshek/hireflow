import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      default: null,
      index: true
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ip: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
