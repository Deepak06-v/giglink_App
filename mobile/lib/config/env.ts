/**
 * Public environment configuration for the GigLink mobile app.
 * Only non-sensitive values belong here (EXPO_PUBLIC_*).
 */
import { Platform } from 'react-native';

const DEFAULT_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:7000/api' : 'http://localhost:7000/api';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

if (__DEV__ && !apiUrl) {
  console.warn(
    '[GigLink] EXPO_PUBLIC_API_URL is not set. Using development fallback:',
    DEFAULT_API_URL,
  );
}

if (__DEV__ && !googleWebClientId) {
  console.warn(
    '[GigLink] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. Google sign-in will not return a verifiable ID token.',
  );
}

export const env = {
  apiUrl: apiUrl || DEFAULT_API_URL,
  googleWebClientId,
  isDev: __DEV__,
} as const;
