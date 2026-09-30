import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(config => {
  const stored = localStorage.getItem('auth');
  if (stored) {
    try {
      const { tokens } = JSON.parse(stored);
      if (tokens?.access) {
        config.headers.Authorization = `Bearer ${tokens.access}`;
      }
    } catch {}
  }
  return config;
});

apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
