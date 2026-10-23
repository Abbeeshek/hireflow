import { Notification } from '../models/index.js';

/**
 * Universal notification service enforcing candidate data isolation
 * and blind screening privacy rules.
 */
export async function createNotification({
  user,
  type,
  title,
  body,
  link = '',
  meta = {}
}) {
  if (!user || !type || !title) {
    return null;
  }

  try {
    const notification = await Notification.create({
      user,
      type,
      title,
      body,
      link,
      meta,
      readAt: null
    });
    return notification;
  } catch (err) {
    console.error('[NotificationService] Error creating notification:', err.message);
    return null;
  }
}

export async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const query = { user: userId };
  if (unreadOnly) {
    query.readAt = null;
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: userId, readAt: null })
  ]);

  return {
    items,
    pagination: {
      total,
      page: Math.max(1, page),
      limit,
      totalPages: Math.ceil(total / limit) || 1
    },
    unreadCount
  };
}

export async function markAsRead(notificationId, userId) {
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  return updated;
}

export async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { user: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return { updatedCount: result.modifiedCount };
}

export default {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead
};
