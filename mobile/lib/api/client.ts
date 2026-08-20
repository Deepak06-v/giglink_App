import axios, { type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/lib/config/env';
import { SECURE_STORAGE_KEYS, secureStorage } from '@/lib/storage/secureStorage';

const AUTH_PUBLIC_SUFFIXES = [
  '/auth/login',
  '/auth/signup',
  '/auth/google',
  '/auth/phone/send-otp',
  '/auth/phone/verify-otp',
] as const;

let unauthorizedHandler: (() => void) | null = null;
let isHandlingUnauthorized = false;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function isPublicAuthRequest(url?: string): boolean {
  if (!url) {
    return false;
  }

  return AUTH_PUBLIC_SUFFIXES.some((suffix) => url.includes(suffix));
}

/**
 * Centralized Axios client for GigLink API requests.
 */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await secureStorage.get(SECURE_STORAGE_KEYS.ACCESS_TOKEN);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url as string | undefined;

    if (status === 401 && !isPublicAuthRequest(requestUrl) && unauthorizedHandler && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true;

      try {
        unauthorizedHandler();
      } finally {
        isHandlingUnauthorized = false;
      }
    }

    return Promise.reject(error);
  },
);
