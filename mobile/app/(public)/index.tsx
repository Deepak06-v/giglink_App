import { useRouter } from 'expo-router';

import { GuestBrowseHeader } from '@/components/auth/GuestBrowseHeader';
import { JobBrowseScreen } from '@/components/jobs/JobBrowseScreen';
import type { JobListItem } from '@/types';
import { guestJobDetailsRoute } from '@/utils/routing';

export default function PublicJobsScreen() {
  const router = useRouter();

  return (
    <JobBrowseScreen
      header={<GuestBrowseHeader />}
      onJobPress={(job: JobListItem) => router.push(guestJobDetailsRoute(job._id))}
    />
  );
}