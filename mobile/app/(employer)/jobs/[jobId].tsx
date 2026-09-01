import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Users } from '@/components/icons';
import { employerJobStatusVariant } from '@/components/cards/EmployerJobCard';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, CompletionRing, ConfirmDialog, ErrorState, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { getApiErrorMessage, getProfileCompletionInfo } from '@/lib/api/errors';
import { completeJobEmployer, deleteJob, getEmployerJobById, updateJob } from '@/lib/api/jobs';
import type { JobCompletionInfo } from '@/lib/api/jobs';
import { getEmployerProfile } from '@/lib/api/profiles';
import type { Job } from '@/types';
import type { ProfileCompletionInfo } from '@/types/auth';
import {
  formatCompensation,
  formatDuration,
  formatScheduleRange,
  formatTimeRange,
  getCategoryLabel,
  getStatusLabel,
} from '@/utils/formatJob';
import { useTranslation } from '@/lib/i18n';
import { openInMaps } from '@/utils/maps';
import { employerEditJobRoute, employerEditProfileRoute } from '@/utils/routing';

export default function EmployerJobDetailsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [completion, setCompletion] = useState<JobCompletionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'delete' | 'complete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [incompleteProfile, setIncompleteProfile] = useState<ProfileCompletionInfo | null>(null);
  const [employerPercent, setEmployerPercent] = useState<number | null>(null);

  const loadJob = useCallback(async () => {
    if (!jobId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getEmployerJobById(jobId);
      setJob(data.job);
      setCompletion(data.completion);
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
    if (job?.status !== 'DRAFT') {
      return;
    }
    let active = true;
    void getEmployerProfile()
      .then((profile) => {
        if (active) {
          setEmployerPercent(profile.completion?.percentage ?? null);
        }
      })
      .catch(() => {
        // Optional fetch — a failure never blocks publishing.
        if (active) {
          setEmployerPercent(null);
        }
      });
    return () => {
      active = false;
    };
  }, [job?.status]);

  const runMutation = async (action: () => Promise<void>, errorMessage: string) => {
    setMutating(true);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(getApiErrorMessage(err, errorMessage));
    } finally {
      setMutating(false);
    }
  };

  const handlePublish = () => {
    if (!jobId) {
      return;
    }
    setMutating(true);
    setActionError(null);
    updateJob(jobId, { status: 'OPEN' })
      .then(() => loadJob())
      .catch((err: unknown) => {
        const info = getProfileCompletionInfo(err);
        if (info) {
          setIncompleteProfile(info);
          return;
        }
        setActionError(getApiErrorMessage(err, t('job.unablePublishJob')));
      })
      .finally(() => setMutating(false));
  };

  const handleCancel = () => {
    setConfirmAction('cancel');
  };

  const handleDelete = () => {
    setConfirmAction('delete');
  };

  const handleComplete = () => {
    setConfirmAction('complete');
  };

  const handleConfirm = () => {
    const action = confirmAction;
    if (!jobId || !action) {
      return;
    }
    setConfirmAction(null);
    if (action === 'cancel') {
      void runMutation(async () => {
        await updateJob(jobId, { status: 'CANCELLED' });
        await loadJob();
      }, t('job.unableCancelJob'));
    } else if (action === 'delete') {
      void runMutation(async () => {
        await deleteJob(jobId);
        router.back();
      }, t('job.unableDeleteJob'));
    } else {
      void runMutation(async () => {
        await completeJobEmployer(jobId);
        await loadJob();
      }, t('job.unableConfirmCompletion'));
    }
  };

  const handleViewApplications = () => {
    if (!job) {
      return;
    }
    router.push({
      pathname: '/(employer)/(tabs)/applications',
      params: { jobId: job._id, jobTitle: job.title },
    });
  };

  if (loading) {
    return (
      <Screen scroll>
        <DetailHeader title={t('job.details')} />
        <View style={styles.skeleton} />
        <View style={styles.skeleton} />
        <View style={styles.skeletonTall} />
      </Screen>
    );
  }

  if (error || !job) {
    return (
      <Screen>
        <DetailHeader title={t('job.details')} />
        <ErrorState message={error ?? t('job.notFound')} onRetry={() => void loadJob()} />
      </Screen>
    );
  }

  const { latitude, longitude } = job.location.coordinates || {};
  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  const canPublish = job.status === 'DRAFT';
  const canEdit = job.status === 'DRAFT' || job.status === 'OPEN';
  const canCancel = job.status === 'DRAFT' || job.status === 'OPEN';
  const canDelete = job.status === 'DRAFT';
  const canViewApplications = job.status === 'OPEN' || job.status === 'FILLED' || job.status === 'IN_PROGRESS';
  const canComplete =
    (job.status === 'FILLED' || job.status === 'IN_PROGRESS') &&
    !completion?.employerCompleted &&
    !completion?.isCompleted;

  const footer = (
    <View style={styles.footer}>
      {actionError ? (
        <Text variant="caption" color="error" align="center">
          {actionError}
        </Text>
      ) : null}
      {canPublish ? (
        <Button
          label={mutating ? t('job.publishing') : t('job.publishJob')}
          onPress={handlePublish}
          loading={mutating}
          fullWidth
        />
      ) : null}
      {canComplete ? (
        <Button
          label={mutating ? t('job.confirmingCompletion') : t('job.confirmCompletion')}
          onPress={handleComplete}
          loading={mutating}
          fullWidth
        />
      ) : null}
      {canViewApplications ? (
        <Button
          label={t('job.viewApplications')}
          variant="secondary"
          onPress={handleViewApplications}
          fullWidth
        />
      ) : null}
      {canEdit ? (
        <Button
          label={t('job.editJob')}
          variant="secondary"
          onPress={() => router.push(employerEditJobRoute(job._id))}
          fullWidth
        />
      ) : null}
      {canCancel ? (
        <Button
          label={t('job.cancelJob')}
          variant="destructive"
          onPress={handleCancel}
          disabled={mutating}
          fullWidth
        />
      ) : null}
      {canDelete ? (
        <Button
          label={t('job.deleteJob')}
          variant="destructive"
          onPress={handleDelete}
          disabled={mutating}
          fullWidth
        />
      ) : null}
    </View>
  );

  return (
    <Screen scroll footer={footer} contentContainerStyle={styles.content}>
      <DetailHeader title={t('job.details')} subtitle={getCategoryLabel(job.category)} />

      <View style={styles.titleBlock}>
        <Text variant="headingXl" color="primary">
          {job.title}
        </Text>
        <Badge label={getStatusLabel(job.status)} variant={employerJobStatusVariant(job.status)} />
      </View>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('job.compensation')}
        </Text>
        <Text variant="headingLg" color="primary">
          {formatCompensation(job.compensation)}
        </Text>
        <View style={styles.metaRow}>
          <Users size={14} color={colors.text.muted} />
          <Text variant="bodyMd" color="secondary">
            {t('job.workersRequired', { count: job.workersRequired })}
          </Text>
        </View>
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

      {completion && (job.status === 'FILLED' || job.status === 'IN_PROGRESS') ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
          {t('job.completion')}
        </Text>
        <Text variant="bodyMd" color="primary">
            {t('job.workersConfirmed', { done: completion.workersCompleted, total: completion.workersRequired })}
          </Text>
          <Text variant="bodyMd" color="secondary">
            {completion.employerCompleted ? t('job.employerConfirmed') : t('job.awaitingEmployerConfirmation')}
          </Text>
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('job.location')}
        </Text>
        <View style={styles.locationRow}>
          <MapPin size={16} color={colors.text.muted} />
          <Text variant="bodyMd" color="primary">
            {job.location.address}, {job.location.city}, {job.location.state} {job.location.pincode}
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

      {job.hiringDeadline ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            {t('job.hiringDeadline')}
          </Text>
          <Text variant="bodyMd" color="primary">
            {new Date(job.hiringDeadline).toLocaleDateString('en-IN')}
          </Text>
        </Card>
      ) : null}

      {job.requirements ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            {t('job.requirements')}
          </Text>
          {job.requirements.skills?.length ? (
            <Text variant="bodyMd" color="primary">
              {t('job.skills')}{job.requirements.skills.join(', ')}
            </Text>
          ) : null}
          {job.requirements.experience ? (
            <Text variant="bodyMd" color="primary">
              {t('job.experience')}{job.requirements.experience}
            </Text>
          ) : null}
          {job.requirements.dressCode ? (
            <Text variant="bodyMd" color="primary">
              {t('job.dressCode')}{job.requirements.dressCode}
            </Text>
          ) : null}
          {job.requirements.languages?.length ? (
            <Text variant="bodyMd" color="primary">
              {t('job.languages')}{job.requirements.languages.join(', ')}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <ConfirmDialog
        visible={confirmAction !== null}
        title={
          confirmAction === 'cancel'
            ? t('job.cancelTitle')
            : confirmAction === 'delete'
              ? t('job.deleteTitle')
              : t('job.confirmCompletionTitle')
        }
        message={
          confirmAction === 'cancel'
            ? t('job.cancelMessage')
            : confirmAction === 'delete'
              ? t('job.deleteMessage')
              : t('job.confirmCompletionMessage')
        }
        confirmLabel={
          confirmAction === 'cancel'
            ? t('job.cancelJob')
            : confirmAction === 'delete'
              ? t('job.deleteJob')
              : t('job.confirmCompletion')
        }
        destructive={confirmAction === 'cancel' || confirmAction === 'delete'}
        loading={mutating}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />

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
              percentage={incompleteProfile?.percentage ?? employerPercent ?? 0}
              label={t('employerPublish.profileIncompleteRingLabel')}
              size={104}
            />
            <Text variant="headingMd" color="primary" align="center">
              {t('employerPublish.profileIncompleteTitle')}
            </Text>
            <Text variant="bodyMd" color="secondary" align="center">
              {t('employerPublish.profileIncompleteMessage', {
                percentage: incompleteProfile?.percentage ?? employerPercent ?? 0,
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
                label={t('employerPublish.completeProfile')}
                onPress={() => router.push(employerEditProfileRoute())}
                style={styles.dialogButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
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
  section: {
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footer: {
    gap: spacing.sm,
  },
  skeleton: {
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
    marginBottom: spacing.md,
  },
  skeletonTall: {
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
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