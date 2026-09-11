import { useState } from 'react';
import type { Href } from 'expo-router';
import { Linking, RefreshControl, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  FileText,
  LogOut,
  Mail,
  Pencil,
  Star,
  Trash2,
} from '@/components/icons';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import {
  Badge,
  Button,
  Card,
  CompletionRing,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
  SkillTag,
  StatRow,
  Text,
} from '@/components/ui';
import { getApiErrorMessage } from '@/lib/api/errors';
import { colors, radius, spacing } from '@/constants/theme';
import { translate, type TranslationKey } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';
import {
  employerNotificationsRoute,
  workerApplicationsTabRoute,
  workerAssignmentsTabRoute,
  workerNotificationsRoute,
} from '@/utils/routing';
import type {
  EmployerProfile,
  ProfileCompletion,
  TrustSummary,
  WorkerProfile,
} from '@/types';

export interface OwnProfileCardProps {
  role: 'worker' | 'employer';
  profile: WorkerProfile | EmployerProfile | null;
  ratingSummary: TrustSummary;
  stats?: { applications: number; assignments: number; completed: number };
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onRetry: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
  onViewReviews: () => void;
  onNavigate?: (route: string) => void;
  completion?: ProfileCompletion;
  legalLinks?: {
    privacy?: string;
    terms?: string;
    contact?: string;
  };
  onDeleteAccount?: () => Promise<void>;
}

const WORKER_MISSING_HINTS: Record<string, TranslationKey> = {
  NAME: 'profile.completion.addName',
  PROFILE_PHOTO: 'profile.completion.addPhoto',
  SKILLS: 'profile.completion.addSkills',
  EXPERIENCE: 'profile.completion.addExperience',
  BIO: 'profile.completion.addBio',
  PHONE: 'profile.completion.addPhone',
  LOCATION: 'profile.completion.addLocation',
  AVAILABILITY: 'profile.completion.setAvailability',
};

const EMPLOYER_MISSING_HINTS: Record<string, TranslationKey> = {
  COMPANY_NAME: 'profile.completion.addCompanyName',
  COMPANY_LOGO: 'profile.completion.addCompanyLogo',
  COMPANY_DESCRIPTION: 'profile.completion.addCompanyDescription',
  PHONE: 'profile.completion.addPhone',
  ADDRESS: 'profile.completion.addAddress',
  LOCATION: 'profile.completion.addLocation',
};

const WORKER_FIELD_ORDER = [
  'PROFILE_PHOTO',
  'SKILLS',
  'EXPERIENCE',
  'BIO',
  'PHONE',
  'LOCATION',
  'AVAILABILITY',
  'NAME',
];

const EMPLOYER_FIELD_ORDER = [
  'COMPANY_NAME',
  'COMPANY_LOGO',
  'COMPANY_DESCRIPTION',
  'ADDRESS',
  'PHONE',
  'LOCATION',
];

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
      {label.toUpperCase()}
    </Text>
  );
}

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

export function OwnProfileCard({
  role,
  profile,
  ratingSummary,
  stats,
  loading,
  refreshing,
  error,
  onRefresh,
  onRetry,
  onEditProfile,
  onLogout,
  onViewReviews,
  onNavigate,
  completion,
  legalLinks,
  onDeleteAccount,
}: OwnProfileCardProps) {
  const user = useAuthStore((state) => state.user);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!onDeleteAccount) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
      setDeleteVisible(false);
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, translate('account.deleteFailed')));
    } finally {
      setDeleting(false);
    }
  };

  const navigate = (route: Href) => {
    onNavigate?.(route as string);
  };

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
        <ErrorState message={error} onRetry={onRetry} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <EmptyState
          title={translate('marketplace.notAvailable')}
          message={translate('marketplace.notAvailableMessage')}
          action={
            <Button label={translate('profile.editProfile')} variant="secondary" onPress={onEditProfile} fullWidth />
          }
        />
      </Screen>
    );
  }

  const isWorker = role === 'worker';
  const workerProfile = isWorker ? (profile as WorkerProfile) : null;
  const employerProfile = !isWorker ? (profile as EmployerProfile) : null;

  const displayName = isWorker
    ? user?.name ?? translate('common.worker')
    : employerProfile?.companyName || user?.name || translate('profile.yourCompany');
  const photo = isWorker ? workerProfile?.profileImage : employerProfile?.logo;

  const locationLabel = isWorker
    ? workerProfile?.location
      ? [workerProfile.location.city, workerProfile.location.state, workerProfile.location.pincode]
          .filter(Boolean)
          .join(', ')
      : translate('profile.completion.addLocation')
    : [employerProfile?.address, employerProfile?.city, employerProfile?.state, employerProfile?.pincode]
        .filter(Boolean)
        .join(', ');

  const availabilityBadge = (() => {
    if (!isWorker) {
      return null;
    }
    switch (workerProfile?.availability) {
      case 'AVAILABLE':
        return <Badge label={translate('profile.availabilityAvailable')} variant="success" />;
      case 'UNAVAILABLE':
        return <Badge label={translate('profile.availabilityUnavailable')} variant="error" />;
      default:
        return <Badge label={translate('profile.completion.setAvailability')} />;
    }
  })();

  const completionData = completion ?? profile.completion ?? null;
  const completionPct = completionData?.percentage ?? 0;
  const missingFields = completionData?.missingFields ?? [];
  const missingHints = isWorker ? WORKER_MISSING_HINTS : EMPLOYER_MISSING_HINTS;
  const fieldOrder = isWorker ? WORKER_FIELD_ORDER : EMPLOYER_FIELD_ORDER;
  const defaultHint: TranslationKey = isWorker
    ? 'profile.completion.addSkills'
    : 'profile.completion.addCompanyName';

  const nextHint = ((): TranslationKey => {
    if (!completionData || missingFields.length === 0) {
      return 'profile.completion.done';
    }
    const firstMissing = fieldOrder.find((field) => missingFields.includes(field));
    return firstMissing ? (missingHints[firstMissing] ?? defaultHint) : defaultHint;
  })();

  const ratingSubtitle =
    ratingSummary.totalReviews > 0 && ratingSummary.averageRating !== null
      ? `${ratingSummary.averageRating.toFixed(1)} · ${ratingSummary.totalReviews} ${
          ratingSummary.totalReviews === 1 ? 'review' : 'reviews'
        }`
      : translate('marketplace.noReviews');

  const notificationsRoute =
    role === 'worker' ? workerNotificationsRoute() : employerNotificationsRoute();

  const profileInfoRows = isWorker ? (
    <>
      <InfoRow label={translate('profile.email')} value={user?.email ?? ''} />
      <InfoRow label={translate('profile.phone')} value={workerProfile?.phone ?? ''} />
    </>
  ) : (
    <>
      <InfoRow label={translate('profile.email')} value={user?.email ?? ''} />
      <InfoRow label={translate('profile.phone')} value={employerProfile?.phone ?? ''} />
      <InfoRow label={translate('profile.address')} value={employerProfile?.address ?? ''} />
      <InfoRow label={translate('profile.city')} value={employerProfile?.city ?? ''} />
      <InfoRow label={translate('profile.state')} value={employerProfile?.state ?? ''} />
      <InfoRow label={translate('profile.pincode')} value={employerProfile?.pincode ?? ''} />
    </>
  );

  const aboutText = isWorker ? workerProfile?.bio : employerProfile?.companyDescription;

  return (
    <Screen
      scroll
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.primary}
          />
        ),
      }}
    >
      <View style={styles.header}>
        <ProfileAvatar source={photo} name={displayName} size={72} square={!isWorker} />
        <View style={styles.headerInfo}>
          <Text variant="headingLg" color="primary" numberOfLines={1}>
            {displayName}
          </Text>
          {locationLabel ? (
            <Text variant="bodyMd" color="secondary" numberOfLines={1}>
              {locationLabel}
            </Text>
          ) : null}
          <View style={styles.headerMeta}>
            <Badge
              label={translate(isWorker ? 'profile.worker' : 'profile.employer')}
              variant="brand"
            />
            {availabilityBadge}
          </View>
        </View>
      </View>

      {completionData && completionPct < 100 ? (
        <Card style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <CompletionRing
              percentage={completionPct}
              label={translate('profile.completion.label')}
            />
            <View style={styles.completionText}>
              <Text variant="bodyLg" color="primary">
                {translate('profile.completion.percentComplete', { percentage: completionPct })}
              </Text>
              <Text variant="caption" color="secondary" style={styles.completionHint}>
                {translate(nextHint)}
              </Text>
            </View>
          </View>
          {missingFields.length > 0 ? (
            <View style={styles.missingList}>
              {missingFields.map((field) => (
                <View key={field} style={styles.missingRow}>
                  <View style={styles.missingDot} />
                  <Text variant="bodyMd" color="secondary" style={styles.missingText}>
                    {translate(missingHints[field] ?? defaultHint)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Button
            label={translate('profile.editProfile')}
            variant="secondary"
            size="sm"
            onPress={onEditProfile}
            style={styles.completionAction}
          />
        </Card>
      ) : null}

      <SectionHeader label={translate('review.reviews')} />
      <Card style={styles.groupCard}>
        <StatRow
          icon={Star}
          iconColor={colors.semantic.warning}
          iconBackground={colors.semanticTint.warning}
          title={translate('review.reviews')}
          subtitle={ratingSubtitle}
          showChevron
          onPress={onViewReviews}
        />
      </Card>

      <SectionHeader label={translate('profile.profileInformation')} />
      <Card style={styles.groupCard}>{profileInfoRows}</Card>

      {aboutText ? (
        <>
          <SectionHeader label={translate('profile.about')} />
          <Card style={styles.groupCard}>
            <Text variant="bodyMd" color="secondary">
              {aboutText}
            </Text>
          </Card>
        </>
      ) : null}

      {isWorker ? (
        <>
          <SectionHeader label={translate('profile.sections.skillsExperience')} />
          <Card style={styles.groupCard}>
            {workerProfile?.skills?.length ? (
              <View style={styles.skillsRow}>
                {workerProfile.skills.map((skill) => (
                  <SkillTag key={skill} label={skill} variant="accent" />
                ))}
              </View>
            ) : (
              <Text variant="bodyMd" color="secondary">
                {translate('profile.completion.addSkills')}
              </Text>
            )}
            {workerProfile?.experience ? (
              <>
                <View style={styles.divider} />
                <InfoRow label={translate('profile.experience')} value={workerProfile.experience} />
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      {isWorker && stats ? (
        <>
          <SectionHeader label={translate('profile.sections.activity')} />
          <Card style={styles.groupCard}>
            <StatRow
              icon={FileText}
              title={translate('tabs.applications')}
              value={stats.applications}
              showChevron
              onPress={() => navigate(workerApplicationsTabRoute())}
            />
            <View style={styles.divider} />
            <StatRow
              icon={ClipboardList}
              title={translate('tabs.assignments')}
              value={stats.assignments}
              showChevron
              onPress={() => navigate(workerAssignmentsTabRoute())}
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
        </>
      ) : null}

      <SectionHeader label={translate('profile.sections.settings')} />
      <Card style={styles.groupCard}>
        <StatRow
          icon={Pencil}
          title={translate('profile.editProfile')}
          showChevron
          onPress={onEditProfile}
        />
        <View style={styles.divider} />
        <StatRow
          icon={Bell}
          title={translate('common.notifications')}
          showChevron
          onPress={() => navigate(notificationsRoute)}
        />
        {legalLinks?.privacy ? (
          <>
            <View style={styles.divider} />
            <StatRow
              icon={FileText}
              title={translate('legal.privacyPolicy')}
              showChevron
              onPress={() => void Linking.openURL(legalLinks.privacy!)}
            />
          </>
        ) : null}
        {legalLinks?.terms ? (
          <>
            <View style={styles.divider} />
            <StatRow
              icon={FileText}
              title={translate('legal.termsOfService')}
              showChevron
              onPress={() => void Linking.openURL(legalLinks.terms!)}
            />
          </>
        ) : null}
        {legalLinks?.contact ? (
          <>
            <View style={styles.divider} />
            <StatRow
              icon={Mail}
              title={translate('legal.contactSupport')}
              showChevron
              onPress={() => void Linking.openURL(legalLinks.contact!)}
            />
          </>
        ) : null}
        {onDeleteAccount ? (
          <>
            <View style={styles.divider} />
            <StatRow
              icon={Trash2}
              iconColor={colors.semantic.error}
              iconBackground={colors.semanticTint.error}
              title={translate('account.deleteAccount')}
              showChevron
              onPress={() => {
                setDeleteError(null);
                setDeleteVisible(true);
              }}
            />
          </>
        ) : null}
        <View style={styles.divider} />
        <StatRow
          icon={LogOut}
          iconColor={colors.semantic.error}
          iconBackground={colors.semanticTint.error}
          title={translate('profile.logout')}
          showChevron
          onPress={onLogout}
        />
      </Card>

      {onDeleteAccount ? (
        <ConfirmDialog
          visible={deleteVisible}
          title={translate('account.deleteDialogTitle')}
          message={deleteError ?? translate('account.deleteDialogMessage')}
          confirmLabel={translate('account.deleteConfirm')}
          destructive
          loading={deleting}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeleteVisible(false)}
        />
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
  headerInfo: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  completionCard: {
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
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
    alignSelf: 'flex-start',
  },
  missingList: {
    gap: spacing.xs,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  missingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
  },
  missingText: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: spacing.md,
    marginTop: spacing.md,
    letterSpacing: 0.6,
  },
  groupCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoRow: {
    gap: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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