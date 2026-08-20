import { useRouter } from 'expo-router';

import { JobBrowseScreen } from '@/components/jobs/JobBrowseScreen';
import { WorkerHeader } from '@/components/layout/WorkerHeader';
import { useAuthStore } from '@/store/authStore';
import type { JobListItem } from '@/types';
import { jobDetailsRoute, workerNotificationsRoute } from '@/utils/routing';

export default function WorkerJobsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  return (
    <JobBrowseScreen
      header={
        <WorkerHeader
          name={user?.name}
          onNotificationsPress={() => router.push(workerNotificationsRoute())}
        />
      }
      onJobPress={(job: JobListItem) => router.push(jobDetailsRoute(job._id))}
    />
  );
}