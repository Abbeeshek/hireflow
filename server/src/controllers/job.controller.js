import * as jobService from '../services/job.service.js';
import { sendPaginated, sendSuccess } from '../utils/apiResponse.js';

export const getPublicJobs = async (req, res, next) => {
  try {
    const result = await jobService.getPublicJobs(req.query);
    return sendPaginated(res, result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id, req.user || null);
    return sendSuccess(res, { job });
  } catch (err) {
    next(err);
  }
};
