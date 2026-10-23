import api from './axios.js';

export const getDashboard = () => api.get('/recruiter/dashboard');
export const getRecruiterJobs = (params = {}) => api.get('/recruiter/jobs', { params });
export const createJob = (data) => api.post('/recruiter/jobs', data);
export const updateJob = (id, data) => api.put(`/recruiter/jobs/${id}`, data);
export const updateJobStatus = (id, status) => api.patch(`/recruiter/jobs/${id}/status`, { status });
export const getJobApplications = (jobId, params = {}) =>
  api.get(`/recruiter/jobs/${jobId}/applications`, { params });
export const updateApplicationStage = (applicationId, data) =>
  api.patch(`/applications/${applicationId}/stage`, data);
export const addRecruiterNote = (applicationId, text) =>
  api.post(`/applications/${applicationId}/notes`, { text });

// Phase 2 AI Screening endpoints
export const generateJobCriteria = (data) =>
  api.post('/recruiter/jobs/ai/criteria', data);
export const screenJob = (jobId, data = {}) =>
  api.post(`/recruiter/jobs/${jobId}/screen`, data);
export const getScreeningStatus = (jobId) =>
  api.get(`/recruiter/jobs/${jobId}/screen/status`);
export const rescreenApplication = (applicationId) =>
  api.post(`/applications/${applicationId}/screen`);
export const compareApplications = (jobId, ids) =>
  api.get(`/recruiter/jobs/${jobId}/compare`, {
    params: { ids: Array.isArray(ids) ? ids.join(',') : ids }
  });

