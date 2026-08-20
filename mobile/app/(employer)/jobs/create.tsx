import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { JobForm } from '@/components/forms/JobForm';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { createJob } from '@/lib/api/jobs';
import type { JobFormPayload } from '@/lib/jobForm';
import { useAuthStore } from '@/store/authStore';
import { employerJobDetailsRoute } from '@/utils/routing';

export default function CreateJobScreen() {
  const router = useRouter();

  useEffect(() => {
    useAuthStore.getState().clearPendingIntent();
  }, []);

  const handleSubmit = async (payload: JobFormPayload) => {
    try {
      const job = await createJob(payload);
      router.replace(employerJobDetailsRoute(job._id));
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Unable to create job'));
    }
  };

  return (
    <Screen scroll={false} padded={false} style={styles.screen}>
      <View style={styles.header}>
        <DetailHeader title="Post a Job" subtitle="Create a draft to review before publishing" />
      </View>
      <JobForm submitLabel="Create Draft" onSubmit={handleSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  header: {
    paddingHorizontal: spacing.lg,
  },
});