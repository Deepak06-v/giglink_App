import { Stack } from 'expo-router';

import { AuthGroupGuard } from '@/components/auth/AuthGuards';

export default function AuthLayout() {
  return (
    <AuthGroupGuard>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </AuthGroupGuard>
  );
}
