import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRootNavigationState } from 'expo-router';
import { AppState, Platform } from 'react-native';

import {
  handleNotificationPayload,
  normalizeNotificationPayload,
  type NotificationPayload,
} from '@/lib/notifications/navigation';
import {
  configureNotificationHandler,
  ensureNotificationChannel,
} from '@/lib/notifications/notifications';
import { handlePushTokenChange, registerForPushNotifications } from '@/lib/notifications/registration';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

const isNative = () => Platform.OS !== 'web';

/**
 * Central notification lifecycle:
 * - Registers the device token after authentication.
 * - Keeps the shared unread count fresh (auth, foreground, pushes).
 * - Handles foreground banners, background taps and cold-start taps.
 * Must be mounted exactly once from the root layout.
 */
export function useNotificationLifecycle(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);
  const incrementUnread = useNotificationStore((state) => state.incrementUnread);
  const rootNavigationState = useRootNavigationState();
  const routerReady = rootNavigationState?.key != null;

  const processedRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<NotificationPayload | null>(null);
  const authSessionHandledRef = useRef(false);

  useEffect(() => {
    if (!isNative()) {
      return;
    }
    configureNotificationHandler();
    void ensureNotificationChannel();
  }, []);

  // Per-auth-session: fetch unread count and register the device token.
  useEffect(() => {
    if (!isAuthenticated) {
      authSessionHandledRef.current = false;
      return;
    }
    if (authSessionHandledRef.current) {
      return;
    }
    authSessionHandledRef.current = true;
    void fetchUnreadCount();
    void registerForPushNotifications();
  }, [isAuthenticated, fetchUnreadCount]);

  // Refresh the unread count whenever the app returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        void fetchUnreadCount();
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated, fetchUnreadCount]);

  // Incoming notification (foreground): banner is shown by the handler,
  // unread count is bumped. No auto-navigation, no duplicate writes.
  useEffect(() => {
    if (!isNative()) {
      return;
    }

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const payload = normalizeNotificationPayload(notification.request.content.data);
      if (payload.notificationId && payload.type) {
        incrementUnread();
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      queuePayload(normalizeNotificationPayload(response.notification.request.content.data));
    });

    const tokenSub = Notifications.addPushTokenListener(({ data }) => {
      if (typeof data === 'string') {
        void handlePushTokenChange(data);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
      tokenSub.remove();
    };
  }, [incrementUnread]);

  // Cold start (app was completely closed): recover the tap that launched it.
  useEffect(() => {
    if (!isNative()) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled && response) {
          queuePayload(normalizeNotificationPayload(response.notification.request.content.data));
        }
      } catch {
        // No last response available — nothing to handle.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Navigate the pending payload once Expo Router is ready AND auth is restored.
  useEffect(() => {
    if (!routerReady || !isAuthenticated) {
      return;
    }
    const payload = pendingRef.current;
    if (!payload) {
      return;
    }
    pendingRef.current = null;
    const timeout = setTimeout(() => {
      handleNotificationPayload(payload);
    }, 0);
    return () => clearTimeout(timeout);
  }, [routerReady, isAuthenticated]);

  function queuePayload(payload: NotificationPayload): void {
    const hasTarget =
      payload.relatedJob ||
      payload.relatedApplication ||
      payload.relatedAssignment ||
      payload.notificationId;
    if (!hasTarget) {
      return;
    }

    const key =
      payload.notificationId ??
      `${payload.type ?? ''}:${payload.relatedJob ?? ''}:${payload.relatedApplication ?? ''}:${payload.relatedAssignment ?? ''}`;
    if (processedRef.current.has(key)) {
      return;
    }
    processedRef.current.add(key);
    pendingRef.current = payload;
  }
}