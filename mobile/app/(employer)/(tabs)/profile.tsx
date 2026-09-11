import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { OwnProfileCard } from '@/components/profiles/OwnProfileCard';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerProfile } from '@/lib/api/profiles';
import { getUserReviews } from '@/lib/api/reviews';
import { translate } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import type { EmployerProfile as EmployerProfileType, TrustSummary } from '@/types';
import { employerEditProfileRoute, employerReviewsListRoute } from '@/utils/routing';

const NO_REVIEWS_SUMMARY: TrustSummary = { averageRating: null, totalReviews: 0 };

export default function EmployerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<EmployerProfileType | null>(null);
  const [ratingSummary, setRatingSummary] = useState<TrustSummary>(NO_REVIEWS_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (mode: 'initial' | 'refresh' | 'focus' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else if (mode === 'refresh') setRefreshing(true);
    setError(null);

    try {
      const currentUser = useAuthStore.getState().user;
      const [data, reviewData] = await Promise.all([
        getEmployerProfile(),
        currentUser?.id
          ? getUserReviews(currentUser.id, 1, 1).catch(() => null)
          : Promise.resolve(null),
      ]);
      setProfile(data);
      setRatingSummary(reviewData?.summary ?? NO_REVIEWS_SUMMARY);
    } catch (err) {
      setError(getApiErrorMessage(err, translate('profile.unableLoadProfile')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile('focus');
    }, [loadProfile]),
  );

  return (
    <OwnProfileCard
      role="employer"
      profile={profile}
      ratingSummary={ratingSummary}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={() => void loadProfile('refresh')}
      onRetry={() => void loadProfile()}
      onEditProfile={() => router.push(employerEditProfileRoute())}
      onLogout={() => void logout()}
      onViewReviews={() => {
        if (user?.id) router.push(employerReviewsListRoute(user.id));
      }}
      onNavigate={(route) => router.navigate(route as Href)}
      completion={profile?.completion}
    />
  );
}
