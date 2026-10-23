import {
  getUserNotifications,
  markAsRead,
  markAllAsRead
} from '../services/notificationService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function getNotifications(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const unreadOnly = req.query.unread === 'true';

    const result = await getUserNotifications(req.user._id, { page, limit, unreadOnly });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function readNotification(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await markAsRead(id, req.user._id);
    return sendSuccess(res, { notification: updated });
  } catch (err) {
    next(err);
  }
}

export async function readAllNotifications(req, res, next) {
  try {
    const result = await markAllAsRead(req.user._id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export default {
  getNotifications,
  readNotification,
  readAllNotifications
};
