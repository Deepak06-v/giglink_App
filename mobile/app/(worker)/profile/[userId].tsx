import { useLocalSearchParams, useRouter } from 'expo-router';

import { MarketplaceProfileScreen } from '@/components/profiles/MarketplaceProfileScreen';
import { getEmployerMarketplaceProfile } from '@/lib/api/marketplace';
import type { EmployerMarketplaceProfile } from '@/types';
import { workerReviewsListRoute } from '@/utils/routing';

export default function WorkerEmployerProfileRoute() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <MarketplaceProfileScreen
      title="Company Profile"
      userId={userId}
      loadProfile={(id) => getEmployerMarketplaceProfile(id) as Promise<EmployerMarketplaceProfile>}
      onViewReviews={() => router.push(workerReviewsListRoute(userId))}
    />
  );
}
