import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import type { Href } from 'expo-router';

import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { useAuthStore } from '@/store/authStore';
import { resolvePostAuthRoute } from '@/utils/onboarding';

/**
 * Root index — routes authenticated users to their role home.
 *
 * Brand-new accounts (that have not completed onboarding) are routed to the
 * onboarding flow before reaching their role home. Returning users go straight
 * to their role home.
 */
export default function IndexScreen() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const guestMode = useAuthStore((state) => state.guestMode);
  const [redirect, setRedirect] = useState<Href | null>(null);

  useEffect(() => {
    if (isInitializing || !user) {
      return;
    }
    let active = true;
    void resolvePostAuthRoute(user).then((route) => {
      if (active) {
        setRedirect(route);
      }
    });
    return () => {
      active = false;
    };
  }, [isInitializing, isAuthenticated, user]);

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && user && redirect) {
    return <Redirect href={redirect} />;
  }

  if (isAuthenticated && user) {
    return <AuthLoadingScreen />;
  }

  if (guestMode) {
    return <Redirect href="/(public)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
