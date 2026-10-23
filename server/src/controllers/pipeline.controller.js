import * as pipelineService from '../services/pipeline.service.js';
import * as candidateService from '../services/candidate.service.js';
import * as screeningService from '../services/screening.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getApplicationById = async (req, res, next) => {
  try {
    const application = await candidateService.getApplicationById(req.params.id, req.user);
    return sendSuccess(res, { application }, 200);
  } catch (err) {
    next(err);
  }
};

export const rescreenApplication = async (req, res, next) => {
  try {
    const application = await screeningService.screenApplication(
      req.params.id,
      req.user,
      { force: true }
    );
    return sendSuccess(res, { application }, 200);
  } catch (err) {
    next(err);
  }
};

export const updateStage = async (req, res, next) => {
  try {
    const application = await pipelineService.updateApplicationStage(
      req.params.id,
      req.user,
      req.body,
      req
    );
    return sendSuccess(res, { application }, 200);
  } catch (err) {
    next(err);
  }
};

export const addNote = async (req, res, next) => {
  try {
    const application = await pipelineService.addRecruiterNote(
      req.params.id,
      req.user,
      req.body.text,
      req
    );
    return sendSuccess(res, { application }, 200);
  } catch (err) {
    next(err);
  }
};

