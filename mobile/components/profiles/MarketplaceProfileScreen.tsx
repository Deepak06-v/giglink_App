import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Star } from '@/components/icons';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { Badge, Card, EmptyState, ErrorState, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { translate } from '@/lib/i18n';
import type {
  EmployerMarketplaceProfile,
  WorkerMarketplaceProfile,
} from '@/types';

type MarketplaceProfile = WorkerMarketplaceProfile | EmployerMarketplaceProfile;

interface MarketplaceProfileScreenProps {
  title: string;
  subtitle?: string;
  userId: string;
  loadProfile: (userId: string) => Promise<MarketplaceProfile>;
}

const AVAILABILITY_VARIANT: Record<
  string,
  'success' | 'default'
> = {
  AVAILABLE: 'success',
  UNAVAILABLE: 'default',
};

const AVAILABILITY_LABEL_KEYS: Record<string, 'profile.availabilityAvailable' | 'profile.availabilityUnavailable'> = {
  AVAILABLE: 'profile.availabilityAvailable',
  UNAVAILABLE: 'profile.availabilityUnavailable',
};

export function MarketplaceProfileScreen({
  title,
  subtitle,
  userId,
  loadProfile,
}: MarketplaceProfileScreenProps) {
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await loadProfile(userId);
      setProfile(data);
    } catch (err) {
      setProfile(null);
      setError(getApiErrorMessage(err, translate('profile.unableLoadProfile')));
    } finally {
      setLoading(false);
    }
  }, [userId, loadProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen scroll>
        <DetailHeader title={title} subtitle={subtitle} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlockTall} />
      </Screen>
    );
  }

  if (error && !profile) {
    return (
      <Screen>
        <DetailHeader title={title} subtitle={subtitle} />
        <ErrorState message={error} onRetry={() => void load()} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <DetailHeader title={title} subtitle={subtitle} />
        <EmptyState
          title={translate('marketplace.notAvailable')}
          message={translate('marketplace.notAvailableMessage')}
        />
      </Screen>
    );
  }

  const isWorker = 'availability' in profile;
  const isEmployer = 'companyName' in profile;
  const displayName = isEmployer
    ? (profile as EmployerMarketplaceProfile).companyName
    : (profile as WorkerMarketplaceProfile).name;
  const photo = isEmployer
    ? (profile as EmployerMarketplaceProfile).logo
    : (profile as WorkerMarketplaceProfile).profileImage;
  const location = profile.location
    ? [profile.location.city, profile.location.state].filter(Boolean).join(', ')
    : '';
  const avail = (profile as WorkerMarketplaceProfile).availability;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <DetailHeader title={title} subtitle={subtitle} />

      <View style={styles.header}>
        <ProfileAvatar source={photo} name={displayName} size={88} square={isEmployer} />
        <Text variant="headingLg" color="primary" align="center">
          {displayName ?? translate('marketplace.profile')}
        </Text>
        {isWorker && avail ? (
          <Badge
            label={translate(AVAILABILITY_LABEL_KEYS[avail] ?? 'profile.availabilityAvailable')}
            variant={AVAILABILITY_VARIANT[avail] ?? 'default'}
          />
        ) : null}
        {location ? (
          <Text variant="bodyMd" color="secondary" align="center">
            {location}
          </Text>
        ) : null}
      </View>

      {profile.rating.totalReviews > 0 ? (
        <View style={styles.ratingRow}>
          <Star size={16} color={colors.semantic.warning} fill={colors.semantic.warning} />
          <Text variant="bodyLg" color="primary">
            {profile.rating.averageRating?.toFixed(1) ?? '—'}
          </Text>
          <Text variant="bodyMd" color="secondary">
            {translate('marketplace.reviewCount', { count: profile.rating.totalReviews })}
          </Text>
        </View>
      ) : (
        <Text variant="bodyMd" color="secondary" align="center" style={styles.noRating}>
          {translate('marketplace.noReviews')}
        </Text>
      )}

      {isWorker ? (
        <WorkerSections profile={profile as WorkerMarketplaceProfile} />
      ) : null}

      {isEmployer ? (
        <EmployerSections profile={profile as EmployerMarketplaceProfile} />
      ) : null}
    </Screen>
  );
}

function WorkerSections({ profile }: { profile: WorkerMarketplaceProfile }) {
  return (
    <>
      {profile.bio ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            {translate('marketplace.about')}
          </Text>
          <Text variant="bodyMd" color="primary">
            {profile.bio}
          </Text>
        </Card>
      ) : null}

      {profile.skills?.length ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            {translate('marketplace.skills')}
          </Text>
          <Text variant="bodyMd" color="primary">
            {profile.skills.join(', ')}
          </Text>
        </Card>
      ) : null}

      {profile.experience ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            {translate('profile.experience')}
          </Text>
          <Text variant="bodyMd" color="primary">
            {profile.experience}
          </Text>
        </Card>
      ) : null}

      {profile.languages?.length ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            {translate('marketplace.languages')}
          </Text>
          <Text variant="bodyMd" color="primary">
            {profile.languages.join(', ')}
          </Text>
        </Card>
      ) : null}
    </>
  );
}

function EmployerSections({ profile }: { profile: EmployerMarketplaceProfile }) {
  if (!profile.companyDescription) {
    return null;
  }
  return (
    <Card style={styles.section}>
      <Text variant="label" color="secondary">
        {translate('marketplace.about')}
      </Text>
      <Text variant="bodyMd" color="primary">
        {profile.companyDescription}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  noRating: {
    marginBottom: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  skeletonBlock: {
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
    marginBottom: spacing.md,
  },
  skeletonBlockTall: {
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
  },
});
