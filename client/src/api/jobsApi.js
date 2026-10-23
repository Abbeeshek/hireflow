import api from './axios.js';

export const getPublicJobs = (params = {}) => api.get('/jobs', { params });
export const getPublicJobById = (id) => api.get(`/jobs/${id}`);
export const applyToJob = (id, data) => api.post(`/jobs/${id}/apply`, data);
