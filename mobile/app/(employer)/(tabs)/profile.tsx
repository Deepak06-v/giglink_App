import { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2 } from '@/components/icons';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, ErrorState, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerProfile } from '@/lib/api/profiles';
import { useAuthStore } from '@/store/authStore';
import type { EmployerProfile as EmployerProfileType } from '@/types';
import { employerEditProfileRoute } from '@/utils/routing';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="bodyMd" color="primary">
        {value || '—'}
      </Text>
    </View>
  );
}

export default function EmployerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<EmployerProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const data = await getEmployerProfile();
      setProfile(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load profile'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <Screen scroll>
        <View style={styles.skeleton}>
          <View style={styles.avatarSkeleton} />
          <View style={[styles.lineSkeleton, styles.lineTitle]} />
          <View style={[styles.lineSkeleton, styles.lineShort]} />
          <View style={styles.cardSkeleton} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={() => void loadProfile()} />
      </Screen>
    );
  }

  const companyName = profile?.companyName || user?.name || 'Your Company';

  return (
    <Screen
      scroll
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadProfile('refresh')}
            tintColor={colors.brand.primary}
          />
        ),
      }}
    >
      <View style={styles.header}>
        {profile?.logo ? (
          <Image source={{ uri: profile.logo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Building2 size={40} color={colors.brand.primary} />
          </View>
        )}
        <Text variant="headingLg" color="primary" align="center">
          {companyName}
        </Text>
        <Badge label="Employer" variant="brand" />
      </View>

      <Text variant="headingMd" color="primary" style={styles.sectionTitle}>
        Profile Information
      </Text>
      <Card style={styles.infoCard}>
        <InfoRow label="Email" value={user?.email ?? '—'} />
        <InfoRow label="Phone" value={profile?.phone ?? '—'} />
        <InfoRow label="Address" value={profile?.address ?? '—'} />
        <InfoRow label="City" value={profile?.city ?? '—'} />
        <InfoRow label="State" value={profile?.state ?? '—'} />
        <InfoRow label="Pincode" value={profile?.pincode ?? '—'} />
      </Card>

      {profile?.companyDescription ? (
        <Text variant="headingMd" color="primary" style={styles.sectionTitle}>
          About
        </Text>
      ) : null}
      {profile?.companyDescription ? (
        <Card style={styles.infoCard}>
          <Text variant="bodyMd" color="secondary">
            {profile.companyDescription}
          </Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button label="Edit Profile" onPress={() => router.push(employerEditProfileRoute())} />
        <Button label="Logout" variant="secondary" onPress={() => void logout()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
    marginTop: spacing.sm,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  infoCard: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  infoRow: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  skeleton: {
    gap: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  avatarSkeleton: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.elevated,
  },
  lineSkeleton: {
    height: 18,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.elevated,
  },
  lineTitle: {
    width: '50%',
  },
  lineShort: {
    width: '30%',
    height: 14,
  },
  cardSkeleton: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.elevated,
    marginTop: spacing.lg,
  },
});