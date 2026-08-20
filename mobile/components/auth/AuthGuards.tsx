import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';

import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { setupApiAuthHandlers } from '@/lib/api/setupAuth';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { getRoleHomeRoute, resolvePendingIntentRoute } from '@/utils/routing';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const initializeLanguage = useLanguageStore((state) => state.initialize);

  useEffect(() => {
    setupApiAuthHandlers();
    void initialize();
    void initializeLanguage();
  }, [initialize, initializeLanguage]);

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}

export function AuthGroupGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const pendingIntent = useAuthStore((state) => state.pendingIntent);

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && user) {
    if (pendingIntent) {
      const intentRoute = resolvePendingIntentRoute(pendingIntent, user.role);
      if (intentRoute) {
        return <Redirect href={intentRoute} />;
      }
    }
    return <Redirect href={getRoleHomeRoute(user.role)} />;
  }

  return <>{children}</>;
}

export function WorkerGroupGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role !== 'worker') {
    return <Redirect href="/(employer)/(tabs)" />;
  }

  return <>{children}</>;
}

export function EmployerGroupGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role !== 'employer') {
    return <Redirect href="/(worker)/(tabs)" />;
  }

  return <>{children}</>;
}
