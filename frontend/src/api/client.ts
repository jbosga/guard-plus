import axios from 'axios';

// In Docker: Vite proxies /api → http://backend:8000
// In local dev without proxy: set VITE_API_URL=http://localhost:8000/api/v1
export const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export const client = axios.create({
  baseURL: API_BASE,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
