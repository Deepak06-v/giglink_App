import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { JobForm } from '@/components/forms/JobForm';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { ErrorState, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerJobById, updateJob } from '@/lib/api/jobs';
import type { JobFormPayload } from '@/lib/jobForm';
import type { Job } from '@/types';

export default function EditJobScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    if (!jobId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getEmployerJobById(jobId);
      setJob(data.job);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load job'));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  const handleSubmit = async (payload: JobFormPayload) => {
    if (!jobId) {
      return;
    }
    try {
      await updateJob(jobId, payload);
      router.back();
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Unable to save job'));
    }
  };

  if (loading) {
    return (
      <Screen scroll>
        <DetailHeader title="Edit Job" />
        <Text variant="bodyMd" color="secondary">
          Loading job...
        </Text>
      </Screen>
    );
  }

  if (error || !job) {
    return (
      <Screen>
        <DetailHeader title="Edit Job" />
        <ErrorState message={error ?? 'Job not found'} onRetry={() => void loadJob()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} style={styles.screen}>
      <View style={styles.header}>
        <DetailHeader title="Edit Job" subtitle={job.title} />
      </View>
      <JobForm initial={job} submitLabel="Save Changes" onSubmit={handleSubmit} />
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