import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { NOTIFICATION_CHANNEL_ID } from '@/lib/notifications/constants';

/**
 * Decide how incoming notifications behave while the app is in the foreground.
 * A banner is shown, but navigation never happens automatically — tapping the
 * banner/notification is what triggers navigation.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ensure the Android notification channel exists. Android 13+ requires at
 * least one channel before the OS permission prompt can appear.
 */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    const existing = await Notifications.getNotificationChannelAsync(NOTIFICATION_CHANNEL_ID);
    if (!existing) {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'GigLink Notifications',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  } catch {
    // Channel creation is best-effort — push still works via the fallback channel.
  }
}
