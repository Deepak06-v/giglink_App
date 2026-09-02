import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock,
  IndianRupee,
  Languages,
  MapPin,
  Shirt,
} from '@/components/icons';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, CompletionRing, ErrorState, Skeleton, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { applyToJob } from '@/lib/api/applications';
import { getApiErrorMessage, getProfileCompletionInfo } from '@/lib/api/errors';
import { getJobById } from '@/lib/api/jobs';
import { getWorkerProfile } from '@/lib/api/profiles';
import { useAuthStore } from '@/store/authStore';
import type { Application, JobListItem } from '@/types';
import type { ProfileCompletionInfo } from '@/types/auth';
import {
  formatCompensation,
  formatDuration,
  formatScheduleRange,
  formatTimeRange,
  getCategoryLabel,
  getEmployerName,
  getStatusLabel,
} from '@/utils/formatJob';
import { openInMaps } from '@/utils/maps';
import { useTranslation } from '@/lib/i18n';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import {
  applicationDetailsRoute,
  workerEditProfileRoute,
  workerMarketplaceProfileRoute,
} from '@/utils/routing';

interface JobDetailScreenProps {
  jobId: string;
}

export function JobDetailScreen({ jobId }: JobDetailScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const [job, setJob] = useState<JobListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [submittedApplication, setSubmittedApplication] = useState<Application | null>(null);
  const [completionPercent, setCompletionPercent] = useState<number | null>(null);
  const [incompleteProfile, setIncompleteProfile] = useState<ProfileCompletionInfo | null>(null);

  useEffect(() => {
    useAuthStore.getState().clearPendingIntent();
  }, []);

  const loadJob = useCallback(async () => {
    if (!jobId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getJobById(jobId);
      setJob(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t('job.unableLoadDetails')));
    } finally {
      setLoading(false);
    }
  }, [jobId, t]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'worker') {
      return;
    }
    let active = true;
    void getWorkerProfile()
      .then((profile) => {
        if (active) {
          setCompletionPercent(profile.completion?.percentage ?? null);
        }
      })
      .catch(() => {
        // The completion hint is optional — a failure never blocks applying.
        if (active) {
          setCompletionPercent(null);
        }
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.role]);

  const hasApplied =
    Boolean(submittedApplication) ||
    job?.applicationState?.hasApplied ||
    job?.hasApplied;
  const canApply =
    !hasApplied &&
    (job?.applicationState?.canApply ?? job?.canApply ?? job?.status === 'OPEN');

  const handleApplyAction = useProtectedAction(
    { action: 'apply', jobId },
    { requiredRole: 'worker', onAuthorized: () => void handleApply() },
  );

  const handleApply = async () => {
    if (!jobId || !canApply) {
      return;
    }
    setApplying(true);
    setApplyError(null);
    try {
      const application = await applyToJob(jobId);
      setSubmittedApplication(application);
      setJob((current) =>
        current
          ? {
              ...current,
              hasApplied: true,
              applicationState: {
                canApply: false,
                hasApplied: true,
                applicationStatus: application.status,
                isAssigned: false,
              },
            }
          : current,
      );
    } catch (err) {
      const info = getProfileCompletionInfo(err);
      if (info) {
        setIncompleteProfile(info);
        return;
      }
      setApplyError(getApiErrorMessage(err, t('job.unableSubmitApplication')));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <DetailHeader title={t('job.details')} />
        <Skeleton width="55%" height={28} />
        <Skeleton width="40%" height={14} style={styles.skeletonInset} />
        <Card style={styles.compensationCard}>
          <Skeleton width={44} height={44} radiusValue={radius.full} />
          <Skeleton width="50%" height={26} />
        </Card>
        <Card style={styles.section}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="80%" height={16} style={styles.skeletonInset} />
          <Skeleton width="60%" height={16} style={styles.skeletonInset} />
        </Card>
        <Card style={styles.section}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="90%" height={14} style={styles.skeletonInset} />
          <Skeleton width="70%" height={14} style={styles.skeletonInset} />
        </Card>
      </Screen>
    );
  }

  if (error || !job) {
    return (
      <Screen>
        <DetailHeader title={t('job.details')} />
        <ErrorState
          message={error ?? t('job.notFound')}
          onRetry={() => void loadJob()}
        />
      </Screen>
    );
  }

  const showCompletionHint =
    isAuthenticated &&
    user?.role === 'worker' &&
    completionPercent !== null &&
    completionPercent < 100 &&
    canApply;

  const completionHintBlock = showCompletionHint ? (
    <Card style={styles.section}>
      <View style={styles.hintRow}>
        <View style={styles.hintText}>
          <Text variant="label" color="accent">
            {t('job.profileCompletionHint', { percentage: completionPercent })}
          </Text>
        </View>
        <Button
          size="sm"
          variant="ghost"
          label={t('job.completeProfile')}
          onPress={() => router.push(workerEditProfileRoute())}
        />
      </View>
    </Card>
  ) : null;

  const { latitude, longitude } = job.location.coordinates || {};
  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  const employerObj = job.employer;
  const isEmployerObj = typeof employerObj !== 'string';
  const employerId = isEmployerObj ? (employerObj.id ?? employerObj._id) : undefined;
  const canViewEmployer = isAuthenticated && Boolean(employerId);

  const footer = !isAuthenticated ? (
    <View style={styles.applyFooter}>
      <Button label={t('job.signInToApply')} onPress={handleApplyAction} fullWidth />
    </View>
  ) : submittedApplication ? (
    <View style={styles.successFooter}>
      <Text variant="headingMd" color="success" align="center">
        {t('job.applicationSubmitted')}
      </Text>
      <Text variant="bodyMd" color="secondary" align="center">
        {t('job.applicationSubmittedMessage', { title: job.title })}
      </Text>
      <Button
        label={t('job.viewApplication')}
        onPress={() => router.push(applicationDetailsRoute(submittedApplication._id))}
        fullWidth
      />
    </View>
  ) : (
    <View style={styles.applyFooter}>
      {applyError ? (
        <Text variant="caption" color="error" align="center" style={styles.applyError}>
          {applyError}
        </Text>
      ) : null}
      <Button
        label={hasApplied ? t('job.applied') : applying ? t('job.applying') : t('job.applyNow')}
        onPress={() => void handleApply()}
        loading={applying}
        disabled={!canApply || hasApplied}
        fullWidth
      />
    </View>
  );

  return (
    <>
    <Screen
      scroll
      footer={footer}
      contentContainerStyle={styles.content}
    >
      <DetailHeader title={t('job.details')} subtitle={getCategoryLabel(job.category)} />

      <View style={styles.titleBlock}>
        <Text variant="headingXl" color="primary">
          {job.title}
        </Text>
        {canViewEmployer && employerId ? (
          <Pressable
            onPress={() => router.push(workerMarketplaceProfileRoute(employerId))}
            accessibilityRole="button"
            style={styles.employerRow}
          >
            <Text variant="bodyLg" color="brand" numberOfLines={1} style={styles.employerLink}>
              {getEmployerName(job.employer)}
            </Text>
            <ChevronRight size={16} color={colors.brand.primary} />
          </Pressable>
        ) : (
          <Text variant="bodyLg" color="secondary">
            {getEmployerName(job.employer)}
          </Text>
        )}
        <Badge label={getStatusLabel(job.status)} variant={job.status === 'OPEN' ? 'brand' : 'default'} />
      </View>

      {completionHintBlock}

      <View style={styles.compensationCard}>
        <View style={styles.payIcon}>
          <IndianRupee size={22} color={colors.brand.primary} />
        </View>
        <View style={styles.payTextBlock}>
          <Text variant="bodySm" color="secondary">
            {t('job.compensation')}
          </Text>
          <Text variant="headingXl" color="primary">
            {formatCompensation(job.compensation)}
          </Text>
        </View>
      </View>

      <Card style={styles.section} variant="elevated">
        <Text variant="label" color="secondary">
          {t('job.essentials')}
        </Text>
        <View style={styles.essentialsList}>
          <View style={styles.essentialsRow}>
            <CalendarDays size={18} color={colors.text.muted} />
            <Text variant="bodyLg" color="primary" style={styles.essentialsValue}>
              {formatScheduleRange(job.schedule)}
            </Text>
          </View>
          <View style={styles.essentialsRow}>
            <Clock size={18} color={colors.text.muted} />
            <Text variant="bodyLg" color="primary" style={styles.essentialsValue}>
              {formatTimeRange(job.schedule) || formatScheduleRange(job.schedule)}
            </Text>
          </View>
          {job.duration ? (
            <View style={styles.essentialsRow}>
              <Briefcase size={18} color={colors.text.muted} />
              <Text variant="bodyLg" color="primary" style={styles.essentialsValue}>
                {formatDuration(job.duration)}
              </Text>
            </View>
          ) : null}
          <View style={styles.essentialsRow}>
            <MapPin size={18} color={colors.text.muted} />
            <Text variant="bodyLg" color="primary" style={styles.essentialsValue}>
              {job.location.address}, {job.location.city}
            </Text>
          </View>
        </View>
        {hasCoordinates && (
          <>
            <View style={styles.mapSpacer}>
              <JobMapPreview latitude={latitude!} longitude={longitude!} />
            </View>
            <Button
              label={t('common.openInMaps')}
              variant="secondary"
              onPress={() =>
                void openInMaps({
                  latitude: latitude!,
                  longitude: longitude!,
                  address: job.location.address,
                  city: job.location.city,
                })
              }
              accessibilityLabel={t('common.openMapsAccessibility')}
            />
          </>
        )}
      </Card>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('job.description')}
        </Text>
        <Text variant="bodyMd" color="primary">
          {job.description}
        </Text>
      </Card>

      {job.requirements ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            {t('job.requirements')}
          </Text>
          {job.requirements.skills?.length ? (
            <View style={styles.skillList}>
              {job.requirements.skills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Text variant="bodySm" color="brand">
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {job.requirements.experience ? (
            <View style={styles.requirementRow}>
              <Briefcase size={16} color={colors.text.muted} />
              <Text variant="bodyMd" color="secondary">
                {t('job.experience')}
                <Text variant="bodyMd" color="primary">
                  {job.requirements.experience}
                </Text>
              </Text>
            </View>
          ) : null}
          {job.requirements.dressCode ? (
            <View style={styles.requirementRow}>
              <Shirt size={16} color={colors.text.muted} />
              <Text variant="bodyMd" color="secondary">
                {t('job.dressCode')}
                <Text variant="bodyMd" color="primary">
                  {job.requirements.dressCode}
                </Text>
              </Text>
            </View>
          ) : null}
          {job.requirements.languages?.length ? (
            <View style={styles.requirementRow}>
              <Languages size={16} color={colors.text.muted} />
              <Text variant="bodyMd" color="secondary">
                {t('job.languages')}
                <Text variant="bodyMd" color="primary">
                  {job.requirements.languages.join(', ')}
                </Text>
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}
    </Screen>

    <Modal
      transparent
      visible={Boolean(incompleteProfile)}
      animationType="fade"
      onRequestClose={() => setIncompleteProfile(null)}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setIncompleteProfile(null)}
          accessibilityLabel={t('common.dismiss')}
        />
        <Card style={styles.dialog}>
          <CompletionRing
            percentage={incompleteProfile?.percentage ?? 0}
            label={t('job.profileIncompleteRingLabel')}
            size={104}
          />
          <Text variant="headingMd" color="primary" align="center">
            {t('job.profileIncompleteTitle')}
          </Text>
          <Text variant="bodyMd" color="secondary" align="center">
            {t('job.profileIncompleteMessage', {
              percentage: incompleteProfile?.percentage ?? 0,
            })}
          </Text>
          <View style={styles.dialogActions}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setIncompleteProfile(null)}
              style={styles.dialogButton}
            />
            <Button
              label={t('job.completeProfile')}
              onPress={() => router.push(workerEditProfileRoute())}
              style={styles.dialogButton}
            />
          </View>
        </Card>
      </View>
    </Modal>
    </>

  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  titleBlock: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  employerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  employerLink: {
    flexShrink: 1,
  },
  section: {
    gap: spacing.sm,
  },
  compensationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brand.tint,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  payIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTextBlock: {
    flex: 1,
    gap: 2,
  },
  skeletonInset: {
    marginTop: spacing.md,
  },
  essentialsList: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  essentialsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  essentialsValue: {
    flex: 1,
  },
  mapSpacer: {
    marginTop: spacing.sm,
  },
  skillList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skillChip: {
    backgroundColor: colors.brand.soft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  applyFooter: {
    gap: spacing.sm,
  },
  applyError: {
    marginBottom: spacing.xs,
  },
  successFooter: {
    gap: spacing.md,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hintText: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.default,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    width: '100%',
  },
  dialogButton: {
    flex: 1,
  },
});
