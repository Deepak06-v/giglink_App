import { useLocalSearchParams } from 'expo-router';

import { MarketplaceProfileScreen } from '@/components/profiles/MarketplaceProfileScreen';
import { getEmployerMarketplaceProfile } from '@/lib/api/marketplace';
import type { EmployerMarketplaceProfile } from '@/types';

export default function WorkerEmployerProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <MarketplaceProfileScreen
      title="Company Profile"
      userId={userId}
      loadProfile={(id) => getEmployerMarketplaceProfile(id) as Promise<EmployerMarketplaceProfile>}
    />
  );
}
