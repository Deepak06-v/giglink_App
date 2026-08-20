import { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button, Card, ErrorState, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { getApplications } from '@/lib/api/applications';
import { getAssignments } from '@/lib/api/assignments';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getWorkerProfile } from '@/lib/api/profiles';
import { useAuthStore } from '@/store/authStore';
import type { WorkerProfile } from '@/types';

interface ProfileStats {
  totalJobs: number;
  applications: number;
  assignments: number;
  completed: number;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card style={styles.statCard}>
      <Text variant="headingLg" color="primary">
        {value}
      </Text>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.avatarSkeleton} />
      <View style={styles.lineSkeleton} />
      <View style={[styles.lineSkeleton, styles.lineShort]} />
      <View style={styles.statsGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.statSkeleton} />
        ))}
      </View>
    </View>
  );
}

export default function WorkerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    totalJobs: 0,
    applications: 0,
    assignments: 0,
    completed: 0,
  });
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
      const [profileData, applicationsData, assignmentsData] = await Promise.all([
        getWorkerProfile(),
        getApplications(1, 50),
        getAssignments(1, 50),
      ]);

      const completed = assignmentsData.assignments.filter((item) => item.status === 'COMPLETED').length;

      setProfile(profileData);
      setStats({
        totalJobs: completed,
        applications: applicationsData.pagination.total,
        assignments: assignmentsData.pagination.total,
        completed,
      });
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
        <ProfileSkeleton />
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

  const initials = user?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Screen scroll scrollViewProps={{
      refreshControl: (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadProfile('refresh')}
          tintColor={colors.brand.primary}
        />
      ),
    }}>
      <View style={styles.header}>
        {profile?.profileImage ? (
          <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text variant="headingLg" color="primary">
              {initials}
            </Text>
          </View>
        )}
        <Text variant="headingLg" color="primary">
          {user?.name}
        </Text>
        <Text variant="bodyMd" color="secondary">
          Worker
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Total Jobs" value={stats.totalJobs} />
        <StatCard label="Applications" value={stats.applications} />
        <StatCard label="Assignments" value={stats.assignments} />
        <StatCard label="Completed" value={stats.completed} />
      </View>

      <Text variant="headingMd" color="primary" style={styles.sectionTitle}>
        Profile Information
      </Text>
      <Card style={styles.infoCard}>
        <InfoRow label="Email" value={user?.email ?? '—'} />
        <InfoRow label="Phone" value={profile?.phone ?? '—'} />
        <InfoRow label="City" value={profile?.location?.city ?? '—'} />
        <InfoRow label="State" value={profile?.location?.state ?? '—'} />
        <InfoRow label="Availability" value={profile?.availability ?? '—'} />
        {profile?.bio ? <InfoRow label="Bio" value={profile.bio} /> : null}
      </Card>

      <View style={styles.actions}>
        <Button label="Edit Profile" onPress={() => router.push('/(worker)/profile/edit')} />
        <Button label="Logout" variant="secondary" onPress={() => void logout()} />
      </View>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="bodyMd" color="primary">
        {value}
      </Text>
    </View>
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
    width: 88,
    height: 88,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    alignItems: 'flex-start',
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
  },
  avatarSkeleton: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    alignSelf: 'center',
  },
  lineSkeleton: {
    height: 18,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.elevated,
    width: '50%',
    alignSelf: 'center',
  },
  lineShort: {
    width: '30%',
    height: 14,
  },
  statSkeleton: {
    width: '47%',
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.elevated,
  },
});
