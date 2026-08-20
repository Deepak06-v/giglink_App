import { useLocalSearchParams } from 'expo-router';

import { JobDetailScreen } from '@/components/jobs/JobDetailScreen';

export default function JobDetailRoute() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  return <JobDetailScreen jobId={jobId} />;
}