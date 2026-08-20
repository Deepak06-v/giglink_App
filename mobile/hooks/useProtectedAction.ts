import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';
import type { PendingIntent } from '@/types/auth';
import { getRoleHomeRoute } from '@/utils/routing';

interface UseProtectedActionOptions {
  requiredRole?: UserRole;
  onAuthorized: () => void;
}

export function useProtectedAction(
  intent: PendingIntent,
  { requiredRole, onAuthorized }: UseProtectedActionOptions,
): () => void {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setPendingIntent = useAuthStore((state) => state.setPendingIntent);
  const clearPendingIntent = useAuthStore((state) => state.clearPendingIntent);

  const intentRef = useRef(intent);
  intentRef.current = intent;

  const onAuthorizedRef = useRef(onAuthorized);
  onAuthorizedRef.current = onAuthorized;

  return useCallback(() => {
    if (isAuthenticated && user) {
      if (requiredRole && user.role !== requiredRole) {
        clearPendingIntent();
        router.replace(getRoleHomeRoute(user.role));
        return;
      }
      onAuthorizedRef.current();
      return;
    }
    setPendingIntent(intentRef.current);
    router.push('/(auth)/login');
  }, [isAuthenticated, user, requiredRole, router, setPendingIntent, clearPendingIntent]);
}