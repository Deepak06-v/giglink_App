import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerDeviceToken, unregisterDeviceToken } from '@/lib/api/notifications';
import type { DevicePlatform } from '@/lib/api/notifications';
import { NOTIFICATION_STORAGE_KEYS } from '@/lib/notifications/constants';
import { ensureNotificationPermission } from '@/lib/notifications/permissions';
import { secureStorage } from '@/lib/storage/secureStorage';

/**
 * The Expo project ID required to mint Expo push tokens.
 * Comes from the EAS project configuration — never hardcoded.
 */
export function getExpoProjectId(): string | undefined {
  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEasConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return fromExpoConfig ?? fromEasConfig ?? undefined;
}

function platformForRegistration(): DevicePlatform {
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  return 'web';
}

async function readPersistedToken(): Promise<string | null> {
  return secureStorage.get(NOTIFICATION_STORAGE_KEYS.PUSH_TOKEN);
}

async function obtainExpoPushToken(): Promise<string | null> {
  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn(
      '[GigLink] Expo project ID is not configured. Set "extra.eas.projectId" in app.json (or run EAS config) so push tokens can be minted. Token registration skipped.',
    );
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.warn(
      '[GigLink] Failed to obtain Expo push token:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function registerToken(token: string): Promise<void> {
  try {
    await registerDeviceToken(token, platformForRegistration());
    await secureStorage.set(NOTIFICATION_STORAGE_KEYS.PUSH_TOKEN, token);
  } catch (error) {
    console.warn(
      '[GigLink] Failed to register device token with the API:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Entry point run after successful authentication:
 * 1. Request permission (once).
 * 2. Obtain the Expo push token.
 * 3. POST it to the backend (Bearer JWT via the shared Axios interceptor).
 * All failures are non-fatal.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const granted = await ensureNotificationPermission();
  if (!granted) {
    return;
  }

  const token = await obtainExpoPushToken();
  if (!token) {
    return;
  }

  await registerToken(token);
}

/**
 * Called when the native push token changes while the app is running.
 * Re-mints the Expo push token and re-registers it with the backend.
 */
export async function handlePushTokenChange(nativeTokenData: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const lastNativeToken = await secureStorage.get(NOTIFICATION_STORAGE_KEYS.DEVICE_TOKEN);
  if (lastNativeToken === nativeTokenData) {
    return;
  }
  await secureStorage.set(NOTIFICATION_STORAGE_KEYS.DEVICE_TOKEN, nativeTokenData);

  const granted = await ensureNotificationPermission();
  if (!granted) {
    return;
  }

  const token = await obtainExpoPushToken();
  if (!token) {
    return;
  }

  await registerToken(token);
}

/**
 * Best-effort unregistration of the CURRENT device token only.
 * Must never block logout — all errors are swallowed.
 */
export async function unregisterForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const token = await readPersistedToken();
  if (!token) {
    return;
  }

  try {
    await unregisterDeviceToken(token);
  } catch (error) {
    console.warn(
      '[GigLink] Failed to unregister device token (logout continues):',
      error instanceof Error ? error.message : error,
    );
  } finally {
    await secureStorage.delete(NOTIFICATION_STORAGE_KEYS.PUSH_TOKEN);
  }
}