import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { NOTIFICATION_STORAGE_KEYS } from '@/lib/notifications/constants';
import { secureStorage } from '@/lib/storage/secureStorage';

export type NotificationPermissionState = 'granted' | 'denied';

async function readPersistedPermission(): Promise<NotificationPermissionState | null> {
  const value = await secureStorage.get(NOTIFICATION_STORAGE_KEYS.PERMISSION_STATE);
  return value === 'granted' || value === 'denied' ? value : null;
}

async function writePersistedPermission(state: NotificationPermissionState): Promise<void> {
  await secureStorage.set(NOTIFICATION_STORAGE_KEYS.PERMISSION_STATE, state);
}

/**
 * Request notification permission once per app install.
 *
 * - Never blocks the app: denial just returns `false`.
 * - Never re-prompts once the user has already answered (persisted locally).
 * - If the permission was previously granted, returns `true` without prompting.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const persisted = await readPersistedPermission();

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      if (persisted !== 'granted') {
        await writePersistedPermission('granted');
      }
      return true;
    }

    if (persisted) {
      // The user already answered — don't nag them again.
      return false;
    }

    const result = await Notifications.requestPermissionsAsync();
    const granted = result.granted;
    await writePersistedPermission(granted ? 'granted' : 'denied');
    return granted;
  } catch {
    await writePersistedPermission('denied');
    return false;
  }
}