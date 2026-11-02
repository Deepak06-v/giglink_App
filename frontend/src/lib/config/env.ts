const DEFAULT_API_URL = 'https://giglink-app.onrender.com/api';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const apiUrl = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : DEFAULT_API_URL;

const legalBaseUrl = apiUrl.replace(/\/api\/?$/, '');
const googleWebClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim() || '';

export const env = {
  apiUrl,
  googleWebClientId,
  isDev: import.meta.env.DEV,
  legalBaseUrl,
} as const;
