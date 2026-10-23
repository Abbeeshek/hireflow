import { User, AuditLog } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { logAudit } from './audit.service.js';

export const getUsers = async ({ page = 1, limit = 10, search = '', role, status }) => {
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  if (role) {
    query.role = role;
  }

  if (status) {
    query.isActive = status === 'active';
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash')
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query)
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

export const updateUserStatus = async (userId, isActive, adminUser, req = null) => {
  if (String(userId) === String(adminUser._id)) {
    throw new BadRequestError('Administrators cannot deactivate their own account');
  }

  const user = await User.findById(userId).populate('company');
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.isActive = isActive;
  await user.save();

  await logAudit({
    actor: adminUser._id,
    action: isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
    entityType: 'User',
    entityId: user._id,
    meta: { targetEmail: user.email, targetRole: user.role, isActive },
    req
  });

  const updatedUser = await User.findById(user._id).select('-passwordHash').populate('company');
  return updatedUser;
};

export const getAuditLogs = async ({ page = 1, limit = 20, action, entityType }) => {
  const query = {};

  if (action) {
    query.action = action;
  }

  if (entityType) {
    query.entityType = entityType;
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query)
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};
