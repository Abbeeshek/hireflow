import { Router } from 'express';
import * as jobController from '../controllers/job.controller.js';
import * as candidateController from '../controllers/candidate.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getJobsQuerySchema } from '../validators/job.validator.js';
import { applyJobSchema } from '../validators/candidate.validator.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const router = Router();

// Optional authentication middleware for public job detail
const optionalAuthenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.hireflow_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const secret = process.env.JWT_SECRET || 'hireflow_dev_secret_key_change_in_production_2026';
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).populate('company');
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore error in optional auth
  }
  next();
};

router.get('/', validate(getJobsQuerySchema, 'query'), jobController.getPublicJobs);
router.get('/:id', optionalAuthenticate, jobController.getJobById);
router.post('/:id/apply', authenticate, authorize('candidate'), validate(applyJobSchema), candidateController.applyJob);

export default router;
