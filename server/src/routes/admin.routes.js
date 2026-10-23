import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateUserStatusSchema, getUsersQuerySchema, getAuditLogsQuerySchema } from '../validators/admin.validator.js';

const router = Router();

// All admin routes require authentication and the admin role
router.use(authenticate, authorize('admin'));

router.get('/users', validate(getUsersQuerySchema, 'query'), adminController.getUsers);
router.patch('/users/:id/status', validate(updateUserStatusSchema, 'body'), adminController.updateUserStatus);
router.get('/audit-logs', validate(getAuditLogsQuerySchema, 'query'), adminController.getAuditLogs);

export default router;
