import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const AUTH_STORAGE_KEY = 'auth';

interface StoredAuth {
  user: unknown;
  tokens: { access?: string; refresh?: string };
}

interface RetriableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export interface Page<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

function readAuth(): StoredAuth | null {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as StoredAuth;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

apiClient.interceptors.request.use(config => {
  const access = readAuth()?.tokens?.access;
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshRequest: Promise<{ access: string; refresh?: string }> | null = null;

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableRequest | undefined;
    const authRequest = /\/auth\/(login|register|token\/refresh|logout)\//.test(request?.url || '');
    if (error.response?.status !== 401 || !request || request._retry || authRequest) {
      return Promise.reject(error);
    }

    const auth = readAuth();
    if (!auth?.tokens?.refresh) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.assign('/login');
      return Promise.reject(error);
    }

    request._retry = true;
    try {
      if (!refreshRequest) {
        refreshRequest = axios
          .post<{ access: string; refresh?: string }>(
            `${BASE_URL.replace(/\/$/, '')}/auth/token/refresh/`,
            { refresh: auth.tokens.refresh },
          )
          .then(response => response.data)
          .finally(() => {
            refreshRequest = null;
          });
      }
      const tokens = await refreshRequest;
      const latestAuth = readAuth() || auth;
      const updatedTokens = { ...latestAuth.tokens, ...tokens };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...latestAuth, tokens: updatedTokens }));
      request.headers.Authorization = `Bearer ${tokens.access}`;
      return apiClient(request);
    } catch (refreshError) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.assign('/login');
      return Promise.reject(refreshError);
    }
  },
);

export function asArray<T>(data: T[] | Page<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

function messageFrom(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(messageFrom);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(messageFrom);
  }
  return [];
}

export function apiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown; errors?: unknown } | undefined;
    const messages = [
      ...messageFrom(data?.detail),
      ...messageFrom(data?.errors),
      ...messageFrom(data),
    ];
    return [...new Set(messages)].join(' ') || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
