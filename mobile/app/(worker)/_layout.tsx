import { Stack } from 'expo-router';

import { WorkerGroupGuard } from '@/components/auth/AuthGuards';
import { colors } from '@/constants/theme';

export default function WorkerLayout() {
  return (
    <WorkerGroupGuard>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="jobs/[jobId]" />
        <Stack.Screen name="applications/[applicationId]" />
        <Stack.Screen name="assignments/[assignmentId]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/[userId]" />
      </Stack>
    </WorkerGroupGuard>
  );
}
