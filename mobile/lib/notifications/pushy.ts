import { Platform } from 'react-native';
import Pushy from 'pushy-react-native';

import {
  normalizeNotificationPayload,
  type NotificationPayload,
} from '@/lib/notifications/navigation';
import { useNotificationStore } from '@/store/notificationStore';

// Pushy only delivers the `data` block of a push to the JS listener (never a
// `notification` title/body block), so the title and message must travel inside
// `data` (see the backend payload builder) to display a useful notification.

// Pushy delivers taps at module scope (it cannot navigate a component once the
// app has been backgrounded/killed). The root layout registers a consumer via
// registerPushyTapConsumer(); a tap that arrives before that consumer is
// registered (cold start — Pushy.listen() replays the launch-intent tap) is
// retained and flushed as soon as the consumer appears.
let tapConsumer: ((payload: NotificationPayload) => void) | null = null;
let pendingTap: NotificationPayload | null = null;

export function registerPushyTapConsumer(
  consumer: ((payload: NotificationPayload) => void) | null,
): void {
  tapConsumer = consumer;
  if (consumer && pendingTap) {
    const payload = pendingTap;
    pendingTap = null;
    consumer(payload);
  }
}

function dispatchTap(payload: NotificationPayload): void {
  if (tapConsumer) {
    tapConsumer(payload);
  } else {
    pendingTap = payload;
  }
}

function stringValue(data: unknown, key: string): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Called for every push received by Pushy (foreground, background and killed
 * states — Pushy runs this listener as a headless task). Pushy does NOT
 * auto-post a notification in RN, so we render the system notification
 * ourselves with Pushy.notify() (the canonical RN pattern — no double display).
 */
async function onPushyNotification(data: string | object): Promise<void> {
  console.log('[GigLink][Pushy] Headless notification received, type:', typeof data);
  console.log('[GigLink][Pushy] Data keys:', data && typeof data === 'object' ? Object.keys(data) : 'N/A');

  const payload = normalizeNotificationPayload(data);
  if (payload.notificationId && payload.type) {
    useNotificationStore.getState().incrementUnread();
  }

  const copy = stringValue(data, 'title');
  const title = copy ?? 'GigLink';
  const message = stringValue(data, 'message') ?? 'You have a new notification';

  console.log('[GigLink][Pushy] Displaying notification:', title, '-', message);
  Pushy.notify(title, message, data);
}

function onPushyNotificationClick(data: string | object): void {
  console.log('[GigLink][Pushy] Notification clicked');
  dispatchTap(normalizeNotificationPayload(data));
}

/**
 * Wire up Pushy's module-scope listeners. MUST run from the app entry
 * (index.ts) — never from inside a component lifecycle.
 */
export function setupPushyListeners(): void {
  if (Platform.OS === 'web') {
    return;
  }

  console.log('[GigLink][Pushy] Setting up Pushy listeners (module scope)');

  // Enable the foreground service so the MQTT connection survives Doze mode
  // and app standby. This keeps a persistent notification that ensures reliable
  // push delivery when the app is backgrounded.
  try {
    Pushy.toggleForegroundService(true);
    console.log('[GigLink][Pushy] Foreground service enabled');
  } catch (e) {
    console.warn('[GigLink][Pushy] Failed to enable foreground service:', e);
  }

  // Listeners must be registered at module scope, BEFORE Pushy.listen(): the
  // cold-start NotificationClick (replayed from a launch intent) is emitted
  // synchronously by listen() and would be lost otherwise.
  Pushy.setNotificationListener(onPushyNotification);
  Pushy.setNotificationClickListener(onPushyNotificationClick);
  Pushy.listen();
  // setNotificationIcon must be called AFTER listen() (per the SDK docs).
  Pushy.setNotificationIcon('ic_launcher');

  console.log('[GigLink][Pushy] Listeners registered, Pushy.listen() called');
}