import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, MapPin } from '@/components/icons';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, CompletionRing, ErrorState, Text } from '@/components/ui';
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
import { availabilityMatchBadge } from '@/utils/availabilityMatch';
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
      <Screen scroll>
        <DetailHeader title={t('job.details')} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlockTall} />
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
  const matchBadge = availabilityMatchBadge(job.availabilityMatch);

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
        {matchBadge ? (
          <Badge label={t(matchBadge.labelKey)} variant={matchBadge.variant} />
        ) : null}
      </View>

      {completionHintBlock}

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('job.compensation')}
        </Text>
        <Text variant="headingLg" color="primary">
          {formatCompensation(job.compensation)}
        </Text>
      </Card>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('job.schedule')}
        </Text>
        <Text variant="bodyLg" color="primary">
          {formatScheduleRange(job.schedule)}
        </Text>
        <Text variant="bodyMd" color="secondary">
          {formatTimeRange(job.schedule)}
        </Text>
        {job.duration ? (
          <Text variant="caption" color="muted">
            {formatDuration(job.duration)}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('job.location')}
        </Text>
        <View style={styles.locationRow}>
          <MapPin size={16} color={colors.text.muted} />
          <Text variant="bodyMd" color="primary">
            {job.location.address}, {job.location.city}
          </Text>
        </View>
        {hasCoordinates && (
          <>
            <JobMapPreview latitude={latitude!} longitude={longitude!} />
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
            <Text variant="bodyMd" color="primary">
              {t('job.skills')}
              {job.requirements.skills.join(', ')}
            </Text>
          ) : null}
          {job.requirements.experience ? (
            <Text variant="bodyMd" color="primary">
              {t('job.experience')}
              {job.requirements.experience}
            </Text>
          ) : null}
          {job.requirements.dressCode ? (
            <Text variant="bodyMd" color="primary">
              {t('job.dressCode')}
              {job.requirements.dressCode}
            </Text>
          ) : null}
          {job.requirements.languages?.length ? (
            <Text variant="bodyMd" color="primary">
              {t('job.languages')}
              {job.requirements.languages.join(', ')}
            </Text>
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
