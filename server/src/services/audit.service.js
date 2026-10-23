import { AuditLog } from '../models/index.js';

export const logAudit = async ({
  actor = null,
  action,
  entityType,
  entityId = null,
  meta = {},
  req = null
}) => {
  try {
    const ip = req ? req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '' : '';
    const actorId = actor || (req?.user?._id ?? null);

    const logEntry = await AuditLog.create({
      actor: actorId,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      meta,
      ip: String(ip),
      createdAt: new Date()
    });

    return logEntry;
  } catch (err) {
    // Audit logging should not crash the primary operational flow
    console.error('[AuditLog] Failed to record audit log:', err.message);
    return null;
  }
};

export default logAudit;
