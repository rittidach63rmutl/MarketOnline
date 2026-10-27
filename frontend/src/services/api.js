import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Volatile in-memory access token (NEVER persisted to localStorage or sessionStorage)
let inMemoryAccessToken = null;

export function setInMemoryToken(token) {
  inMemoryAccessToken = token;
}

export function getInMemoryToken() {
  return inMemoryAccessToken;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Sends HttpOnly cookies (access_token & refresh_token) automatically
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach volatile in-memory Bearer token as secondary auth channel
api.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Automatic Refresh Token Rotation on 401 TOKEN_EXPIRED
let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token = null) {
  pendingQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loops on auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await api.post('/auth/refresh');
        const newAccessToken = refreshRes.data?.data?.accessToken || null;
        setInMemoryToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        setInMemoryToken(null);
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Extracts a safe, user-friendly error message without exposing internal stack traces
 */
export function getSafeErrorMessage(error, fallback = 'Unable to complete the request. Please try again.') {
  if (error?.response?.data) {
    const data = error.response.data;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e) => e.message).join(' ');
    }
    if (typeof data.message === 'string' && data.message.trim() !== '') {
      return data.message;
    }
  }
  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Please check your network connection.';
  }
  return fallback;
}

export default api;

