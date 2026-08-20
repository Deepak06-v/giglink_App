import { Redirect } from 'expo-router';

import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { useAuthStore } from '@/store/authStore';
import { getRoleHomeRoute } from '@/utils/routing';

/**
 * Root index — routes authenticated users to their role home.
 */
export default function IndexScreen() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const guestMode = useAuthStore((state) => state.guestMode);

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated && user) {
    return <Redirect href={getRoleHomeRoute(user.role)} />;
  }

  if (guestMode) {
    return <Redirect href="/(public)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
