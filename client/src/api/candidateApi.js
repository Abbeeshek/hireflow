import api from './axios.js';

export const getProfile = () => api.get('/candidate/profile');
export const updateProfile = (data) => api.put('/candidate/profile', data);
export const getResumes = () => api.get('/candidate/resumes');
export const uploadResume = (formData) =>
  api.post('/candidate/resumes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const getMyApplications = () => api.get('/candidate/applications');
export const getApplicationDetail = (id) => api.get(`/applications/${id}`);
