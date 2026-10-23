import api from './axios.js';

export const getUsers = (params = {}) => api.get('/admin/users', { params });
export const updateUserStatus = (id, isActive) =>
  api.patch(`/admin/users/${id}/status`, { isActive });
export const getAuditLogs = (params = {}) => api.get('/admin/audit-logs', { params });
