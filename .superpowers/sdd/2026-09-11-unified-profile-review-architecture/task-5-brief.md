# Task 5: Refactor Worker Self-Profile to Use OwnProfileCard

## Goal

Replace the worker self-profile tab's custom layout with the shared `OwnProfileCard` component.

## Files

- Modify: `mobile/app/(worker)/(tabs)/profile.tsx`

## Implementation (replace entire file content)

```tsx
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { OwnProfileCard } from '@/components/profiles/OwnProfileCard';
import { getApplications } from '@/lib/api/applications';
import { getAssignments } from '@/lib/api/assignments';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getWorkerProfile } from '@/lib/api/profiles';
import { getUserReviews } from '@/lib/api/reviews';
import { translate } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import type { TrustSummary, WorkerProfile } from '@/types';
import { workerEditProfileRoute, workerReviewsListRoute } from '@/utils/routing';

const NO_REVIEWS_SUMMARY: TrustSummary = { averageRating: null, totalReviews: 0 };

export default function WorkerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [ratingSummary, setRatingSummary] = useState<TrustSummary>(NO_REVIEWS_SUMMARY);
  const [stats, setStats] = useState({ applications: 0, assignments: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (mode: 'initial' | 'refresh' | 'focus' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else if (mode === 'refresh') setRefreshing(true);
    setError(null);

    try {
      const currentUser = useAuthStore.getState().user;
      const [profileData, applicationsData, assignmentsData, reviewData] = await Promise.all([
        getWorkerProfile(),
        getApplications(1, 50),
        getAssignments(1, 50),
        currentUser?.id
          ? getUserReviews(currentUser.id, 1, 1).catch(() => null)
          : Promise.resolve(null),
      ]);

      const completed = assignmentsData.assignments.filter(
        (item) => item.status === 'COMPLETED',
      ).length;

      setProfile(profileData);
      setRatingSummary(reviewData?.summary ?? NO_REVIEWS_SUMMARY);
      setStats({
        applications: applicationsData.pagination.total,
        assignments: assignmentsData.pagination.total,
        completed,
      });
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
      role="worker"
      profile={profile}
      ratingSummary={ratingSummary}
      stats={stats}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={() => void loadProfile('refresh')}
      onRetry={() => void loadProfile()}
      onEditProfile={() => router.push(workerEditProfileRoute())}
      onLogout={() => void logout()}
      onViewReviews={() => {
        if (user?.id) router.push(workerReviewsListRoute(user.id));
      }}
      completion={profile?.completion}
    />
  );
}
```

## Verify

Run: `cd C:\dev\giglink\mobile && npx tsc --noEmit`
Expected: No errors.

## Commit

```
git add 'mobile/app/(worker)/(tabs)/profile.tsx'
git commit -m "refactor: worker self-profile uses shared OwnProfileCard"
```

Note: In PowerShell use quoted paths: `git add 'mobile/app/(worker)/(tabs)/profile.tsx'`. If the parens cause issues, stage with `git add -A` after confirming only this file changed.

## Global Constraints

- Expo SDK 53.0.27, React Native 0.79.6
- Do not break existing API contracts
- Use existing components/design tokens
- No new npm dependencies

## Work from: C:\dev\giglink