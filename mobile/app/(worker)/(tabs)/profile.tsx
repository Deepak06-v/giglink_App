import { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import {
  Badge,
  Button,
  Card,
  CompletionRing,
  ErrorState,
  Skeleton,
  SkillTag,
  StatRow,
  Text,
} from '@/components/ui';
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  LogOut,
  User,
} from '@/components/icons';
import { colors, radius, spacing } from '@/constants/theme';
import { getApplications } from '@/lib/api/applications';
import { getAssignments } from '@/lib/api/assignments';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getWorkerProfile } from '@/lib/api/profiles';
import { translate, type TranslationKey } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import { availabilitySummary } from '@/utils/availability';
import {
  workerApplicationsTabRoute,
  workerAssignmentsTabRoute,
  workerAvailabilityRoute,
  workerEditProfileRoute,
  workerNotificationsRoute,
} from '@/utils/routing';
import type { WorkerProfile } from '@/types';

interface ProfileStats {
  applications: number;
  assignments: number;
  completed: number;
}

type WorkerMissingField =
  | 'PROFILE_PHOTO'
  | 'SKILLS'
  | 'EXPERIENCE'
  | 'BIO'
  | 'PHONE'
  | 'LOCATION'
  | 'AVAILABILITY';

const COMPLETION_HINTS: Record<WorkerMissingField, TranslationKey> = {
  PROFILE_PHOTO: 'profile.completion.addPhoto',
  SKILLS: 'profile.completion.addSkills',
  EXPERIENCE: 'profile.completion.addExperience',
  BIO: 'profile.completion.addBio',
  PHONE: 'profile.completion.addPhone',
  LOCATION: 'profile.completion.addLocation',
  AVAILABILITY: 'profile.completion.setAvailability',
};

const PROFILE_SKELETON_ROWS = 4;

function ProfileSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonHeader}>
        <Skeleton width={72} height={72} radiusValue={radius.full} />
        <View style={styles.skeletonHeaderText}>
          <Skeleton width="55%" height={20} />
          <Skeleton width="35%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Card style={styles.completionSkeleton}>
        <Skeleton width={88} height={88} radiusValue={radius.full} />
      </Card>
      {Array.from({ length: PROFILE_SKELETON_ROWS }).map((_, index) => (
        <Skeleton key={index} height={16} width="94%" />
      ))}
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text variant="caption" color="muted" style={styles.sectionHeader}>
      {label}
    </Text>
  );
}

export default function WorkerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
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

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const initials = user?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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

  const completion = profile?.completion;
  const completionPct = completion?.percentage ?? 0;
  const missingFields = completion?.missingFields ?? [];

  const nextHint = ((): TranslationKey => {
    if (!completion || missingFields.length === 0) {
      return 'profile.completion.done';
    }
    const ordered: WorkerMissingField[] = [
      'PROFILE_PHOTO',
      'SKILLS',
      'EXPERIENCE',
      'BIO',
      'PHONE',
      'LOCATION',
      'AVAILABILITY',
    ];
    const firstMissing = ordered.find((field) => missingFields.includes(field));
    return firstMissing ? COMPLETION_HINTS[firstMissing] : COMPLETION_HINTS.SKILLS;
  })();

  const skillsLabel = profile?.skills?.length
    ? `${profile.skills.length} ${profile.skills.length === 1 ? 'skill' : 'skills'}`
    : translate('profile.completion.addSkills');

  const locationLabel = profile?.location?.city
    ? [profile.location.city, profile.location.state].filter(Boolean).join(', ')
    : translate('profile.completion.addLocation');

  const availabilityBadge = (() => {
    switch (profile?.availability) {
      case 'AVAILABLE':
        return <Badge label={translate('profile.availabilityAvailable')} variant="success" />;
      case 'LIMITED':
        return <Badge label={translate('profile.availabilityLimited')} variant="warning" />;
      case 'UNAVAILABLE':
        return <Badge label={translate('profile.availabilityUnavailable')} variant="error" />;
      default:
        return <Badge label={translate('workingHours.title')} />;
    }
  })();

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
        {profile?.profileImage ? (
          <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text variant="headingLg" color="primary">
              {initials}
            </Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text variant="headingLg" color="primary" numberOfLines={1}>
            {user?.name ?? translate('common.worker')}
          </Text>
          <View style={styles.headerMeta}>{availabilityBadge}</View>
        </View>
      </View>

      {completion ? (
        <Card style={styles.completionCard}>
          <CompletionRing percentage={completionPct} label={translate('profile.completion.label')} />
          <View style={styles.completionText}>
            <Text variant="bodyLg" color="primary">
              {translate('profile.completion.percentComplete', { percentage: completionPct })}
            </Text>
            <Text variant="caption" color="secondary" style={styles.completionHint}>
              {translate(nextHint)}
            </Text>
          </View>
          <Button
            label={translate('profile.editProfile')}
            variant="secondary"
            size="sm"
            onPress={() => router.push(workerEditProfileRoute())}
            style={styles.completionAction}
          />
        </Card>
      ) : null}

      <SectionHeader label={translate('profile.sections.profile')} />
      <Card style={styles.groupCard}>
        <StatRow
          icon={User}
          iconColor={colors.brand.primary}
          iconBackground={colors.brand.tint}
          title={translate('profile.sections.personalInformation')}
          subtitle={locationLabel}
          showChevron
          onPress={() => router.push(workerEditProfileRoute())}
        />
        <View style={styles.divider} />
        <StatRow
          icon={Briefcase}
          iconColor={colors.accent.opportunity}
          iconBackground={colors.accent.tint}
          title={translate('profile.sections.skillsExperience')}
          subtitle={skillsLabel}
          showChevron
          onPress={() => router.push(workerEditProfileRoute())}
        />
        <View style={styles.divider} />
        <StatRow
          icon={Clock}
          iconColor={colors.text.secondary}
          iconBackground={colors.surface.elevated}
          title={translate('profile.sections.workingHours')}
          subtitle={availabilitySummary(profile?.weeklyAvailability)}
          showChevron
          onPress={() => router.push(workerAvailabilityRoute())}
        />
      </Card>

      <SectionHeader label={translate('profile.sections.activity')} />
      <Card style={styles.groupCard}>
        <StatRow
          icon={FileText}
          title={translate('tabs.applications')}
          value={stats.applications}
          showChevron
          onPress={() => router.navigate(workerApplicationsTabRoute())}
        />
        <View style={styles.divider} />
        <StatRow
          icon={ClipboardList}
          title={translate('tabs.assignments')}
          value={stats.assignments}
          showChevron
          onPress={() => router.navigate(workerAssignmentsTabRoute())}
        />
        <View style={styles.divider} />
        <StatRow
          icon={CheckCircle2}
          iconColor={colors.semantic.success}
          iconBackground={colors.semanticTint.success}
          title={translate('profile.completed')}
          value={stats.completed}
        />
      </Card>

      <SectionHeader label={translate('profile.sections.settings')} />
      <Card style={styles.groupCard}>
        <StatRow
          icon={Bell}
          title={translate('common.notifications')}
          showChevron
          onPress={() => router.push(workerNotificationsRoute())}
        />
        <View style={styles.divider} />
        <StatRow
          icon={LogOut}
          iconColor={colors.semantic.error}
          iconBackground={colors.semanticTint.error}
          title={translate('profile.logout')}
          showChevron
          onPress={() => void logout()}
        />
      </Card>

      {profile?.skills?.length ? (
        <>
          <SectionHeader label={translate('profile.sections.skillsExperience')} />
          <View style={styles.skillsRow}>
            {profile.skills.map((skill) => (
              <SkillTag key={skill} label={skill} variant="accent" />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
    marginTop: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  headerMeta: {
    flexDirection: 'row',
  },
  completionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  completionText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  completionHint: {
    lineHeight: 18,
  },
  completionAction: {
    alignSelf: 'center',
  },
  sectionHeader: {
    marginBottom: spacing.md,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  groupCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  skeleton: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  skeletonHeaderText: {
    flex: 1,
  },
  completionSkeleton: {
    alignItems: 'center',
  },
});
