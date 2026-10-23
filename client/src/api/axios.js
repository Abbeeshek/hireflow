import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => {
    // Return standard success payload
    return response.data;
  },
  (error) => {
    const customError = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || 'Something went wrong'
    };
    return Promise.reject(customError);
  }
);

export default api;
