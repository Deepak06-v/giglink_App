import { router } from 'expo-router';

import { setUnauthorizedHandler } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';

/**
 * Wire API 401 handling to auth state and navigation.
 * Call once from the root layout after the app mounts.
 */
export function setupApiAuthHandlers(): void {
  setUnauthorizedHandler(() => {
    const { clearAuth, isInitializing, guestMode } = useAuthStore.getState();
    void clearAuth();

    if (!isInitializing) {
      router.replace(guestMode ? '/(public)' : '/(auth)/login');
    }
  });
}
