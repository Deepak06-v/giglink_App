import { useEffect, useRef } from 'react';
import { useRootNavigationState } from 'expo-router';
import { AppState } from 'react-native';

import {
  handleNotificationPayload,
  type NotificationPayload,
} from '@/lib/notifications/navigation';
import { registerPushyTapConsumer } from '@/lib/notifications/pushy';
import { registerForPushNotifications } from '@/lib/notifications/registration';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

/**
 * Central notification lifecycle:
 * - Registers the Pushy device token after authentication.
 * - Keeps the shared unread count fresh (auth, foreground, incoming pushes).
 * - Handles notification taps (foreground banner, background, cold start).
 * Must be mounted exactly once from the root layout.
 */
export function useNotificationLifecycle(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);
  const rootNavigationState = useRootNavigationState();
  const routerReady = rootNavigationState?.key != null;

  const processedRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<NotificationPayload | null>(null);
  const authSessionHandledRef = useRef(false);

  // Pushy taps arrive from its module-scope click listener (registered in the
  // entry). Dedupe them and defer navigation until routing + auth are ready.
  useEffect(() => {
    registerPushyTapConsumer((payload) => {
      queuePayload(payload);
    });
    return () => registerPushyTapConsumer(null);
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