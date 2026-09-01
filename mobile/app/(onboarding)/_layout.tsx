import { useEffect, useState } from 'react';
import { Redirect, Stack } from 'expo-router';

import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { hasCompletedOnboarding, resolvePostAuthRoute } from '@/utils/onboarding';

export default function OnboardingLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (isAuthenticated && user) {
      void hasCompletedOnboarding(user.id).then((done) => {
        if (active) {
          setOnboarded(done);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (onboarded === null) {
    return <AuthLoadingScreen />;
  }

  if (onboarded) {
    return <Redirect href={useAuthStore.getState().user?.role === 'employer' ? '/(employer)/(tabs)' : '/(worker)/(tabs)'} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'fade',
      }}
    />
  );
}
