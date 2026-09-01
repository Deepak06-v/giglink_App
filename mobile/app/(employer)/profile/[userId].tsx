import { useLocalSearchParams } from 'expo-router';

import { MarketplaceProfileScreen } from '@/components/profiles/MarketplaceProfileScreen';
import { getWorkerMarketplaceProfile } from '@/lib/api/marketplace';
import type { WorkerMarketplaceProfile } from '@/types';

export default function EmployerWorkerProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <MarketplaceProfileScreen
      title="Worker Profile"
      userId={userId}
      loadProfile={(id) => getWorkerMarketplaceProfile(id) as Promise<WorkerMarketplaceProfile>}
    />
  );
}
