import { useLocalSearchParams, useRouter } from 'expo-router';

import { MarketplaceProfileScreen } from '@/components/profiles/MarketplaceProfileScreen';
import { getWorkerMarketplaceProfile } from '@/lib/api/marketplace';
import type { WorkerMarketplaceProfile } from '@/types';
import { employerReviewsListRoute } from '@/utils/routing';

export default function EmployerWorkerProfileRoute() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <MarketplaceProfileScreen
      title="Worker Profile"
      userId={userId}
      loadProfile={(id) => getWorkerMarketplaceProfile(id) as Promise<WorkerMarketplaceProfile>}
      onViewReviews={() => router.push(employerReviewsListRoute(userId))}
    />
  );
}
