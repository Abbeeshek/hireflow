import * as candidateService from '../services/candidate.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getProfile = async (req, res, next) => {
  try {
    const profile = await candidateService.getProfile(req.user._id);
    return sendSuccess(res, { profile });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const profile = await candidateService.updateProfile(req.user._id, req.body);
    return sendSuccess(res, { profile });
  } catch (err) {
    next(err);
  }
};

export const uploadResume = async (req, res, next) => {
  try {
    const resume = await candidateService.createResume(req.user._id, req.processedResume);
    return sendSuccess(res, { resume }, 201);
  } catch (err) {
    next(err);
  }
};

export const getResumes = async (req, res, next) => {
  try {
    const resumes = await candidateService.getResumes(req.user._id);
    return sendSuccess(res, { resumes });
  } catch (err) {
    next(err);
  }
};

export const applyJob = async (req, res, next) => {
  try {
    const application = await candidateService.applyJob(
      req.params.id,
      req.user._id,
      req.body,
      req
    );
    return sendSuccess(res, { application }, 201);
  } catch (err) {
    next(err);
  }
};

export const getMyApplications = async (req, res, next) => {
  try {
    const applications = await candidateService.getCandidateApplications(req.user._id);
    return sendSuccess(res, { applications });
  } catch (err) {
    next(err);
  }
};
