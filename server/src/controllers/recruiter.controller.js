import * as jobService from '../services/job.service.js';
import * as screeningService from '../services/screening.service.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { BadRequestError } from '../utils/errors.js';

export const getJobs = async (req, res, next) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      throw new BadRequestError('Recruiter account is not associated with any company');
    }
    const result = await jobService.getRecruiterJobs(companyId, req.query);
    return sendPaginated(res, result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

export const createJob = async (req, res, next) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      throw new BadRequestError('Recruiter account is not associated with any company');
    }
    const job = await jobService.createJob(companyId, req.user._id, req.body, req);
    return sendSuccess(res, { job }, 201);
  } catch (err) {
    next(err);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      throw new BadRequestError('Recruiter account is not associated with any company');
    }
    const job = await jobService.updateJob(req.params.id, companyId, req.user._id, req.body, req);
    return sendSuccess(res, { job }, 200);
  } catch (err) {
    next(err);
  }
};

export const updateJobStatus = async (req, res, next) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      throw new BadRequestError('Recruiter account is not associated with any company');
    }
    const job = await jobService.updateJobStatus(req.params.id, companyId, req.user._id, req.body.status, req);
    return sendSuccess(res, { job }, 200);
  } catch (err) {
    next(err);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      throw new BadRequestError('Recruiter account is not associated with any company');
    }
    const dashboardData = await jobService.getRecruiterDashboard(companyId);
    return sendSuccess(res, dashboardData, 200);
  } catch (err) {
    next(err);
  }
};

export const getJobApplications = async (req, res, next) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      throw new BadRequestError('Recruiter account is not associated with any company');
    }
    const result = await jobService.getJobApplications(req.params.id, companyId, req.query);
    return sendPaginated(res, result.items, result.pagination, { bucketCounts: result.bucketCounts });
  } catch (err) {
    next(err);
  }
};

export const generateCriteria = async (req, res, next) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      throw new BadRequestError('Recruiter account is not associated with any company');
    }
    const criteria = await jobService.generateJobCriteria(
      companyId,
      req.user._id,
      req.body,
      req
    );
    return sendSuccess(res, { criteria }, 200);
  } catch (err) {
    next(err);
  }
};

export const screenJob = async (req, res, next) => {
  try {
    const result = await screeningService.startJobScreeningRun(
      req.params.id,
      req.user,
      { force: req.body?.force }
    );
    return sendSuccess(res, result, 202);
  } catch (err) {
    next(err);
  }
};

export const getScreeningStatus = async (req, res, next) => {
  try {
    const status = await screeningService.getScreeningStatus(req.params.id, req.user);
    return sendSuccess(res, status, 200);
  } catch (err) {
    next(err);
  }
};

export const compareApplications = async (req, res, next) => {
  try {
    const idsQuery = req.query.ids;
    if (!idsQuery) {
      throw new BadRequestError('ids query parameter is required (e.g. ?ids=id1,id2)');
    }
    const ids = Array.isArray(idsQuery)
      ? idsQuery
      : idsQuery.split(',').map((id) => id.trim()).filter(Boolean);

    const comparison = await screeningService.compareApplications(req.params.id, req.user, ids);
    return sendSuccess(res, comparison, 200);
  } catch (err) {
    next(err);
  }
};


