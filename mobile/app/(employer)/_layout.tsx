import { Stack } from 'expo-router';

import { EmployerGroupGuard } from '@/components/auth/AuthGuards';
import { colors } from '@/constants/theme';

export default function EmployerLayout() {
  return (
    <EmployerGroupGuard>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="jobs/[jobId]" />
        <Stack.Screen name="jobs/create" />
        <Stack.Screen name="jobs/edit/[jobId]" />
        <Stack.Screen name="applications/[applicationId]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/[userId]" />
        <Stack.Screen name="notifications" />
      </Stack>
    </EmployerGroupGuard>
  );
}