import { Platform } from 'react-native';
import Pushy from 'pushy-react-native';

import { registerDeviceToken, unregisterDeviceToken } from '@/lib/api/notifications';
import type { DevicePlatform } from '@/lib/api/notifications';

// Pushy persists the device token natively. Keep the last one in memory so a
// logout can unregister it from the backend without re-prompting Pushy.
let registeredPushyToken: string | null = null;

function platformForRegistration(): DevicePlatform {
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  return 'web';
}

async function obtainPushyToken(): Promise<string | null> {
  try {
    const token = (await Pushy.register()) as string;
    registeredPushyToken = token;
    return token;
  } catch (error) {
    console.warn(
      '[GigLink] Failed to register with Pushy:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Entry point run after successful authentication:
 * 1. Register the device with Pushy (asks for notification permission once on
 *    Android 13+).
 * 2. POST the Pushy token to the backend (Bearer JWT via the shared Axios
 *    interceptor).
 * All failures are non-fatal.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const token = await obtainPushyToken();
  if (!token) {
    return;
  }

  try {
    await registerDeviceToken(token, platformForRegistration(), 'pushy');
  } catch (error) {
    console.warn(
      '[GigLink] Failed to register device token with the API:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Best-effort unregistration of the CURRENT device token only.
 * Must never block logout — all errors are swallowed.
 */
export async function unregisterForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const token = registeredPushyToken;
  registeredPushyToken = null;
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
  }
}