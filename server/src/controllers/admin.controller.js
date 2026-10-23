import * as adminService from '../services/admin.service.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';

export const getUsers = async (req, res, next) => {
  try {
    const result = await adminService.getUsers(req.query);
    return sendPaginated(res, result.users, result.pagination);
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const user = await adminService.updateUserStatus(req.params.id, req.body.isActive, req.user, req);
    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await adminService.getAuditLogs(req.query);
    return sendPaginated(res, result.logs, result.pagination);
  } catch (err) {
    next(err);
  }
};
