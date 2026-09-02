import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Briefcase, Mail, MapPin, User } from '@/components/icons';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Skeleton, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { acceptApplication, getEmployerApplicationById, rejectApplication } from '@/lib/api/applications';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { Application, ApplicationStatus, ApplicationWorker } from '@/types';
import {
  formatCompensation,
  formatScheduleRange,
  formatTimeRange,
  getCategoryLabel,
  getStatusLabel,
} from '@/utils/formatJob';
import { useTranslation, translate } from '@/lib/i18n';
import { openInMaps } from '@/utils/maps';
import { employerMarketplaceProfileRoute } from '@/utils/routing';

function statusVariant(status: ApplicationStatus): BadgeVariant {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'ACCEPTED':
      return 'success';
    case 'REJECTED':
      return 'error';
    default:
      return 'default';
  }
}

function workerName(worker: string | ApplicationWorker): string {
  return typeof worker === 'string' ? translate('common.worker') : worker.name || translate('common.worker');
}

function workerEmail(worker: string | ApplicationWorker): string | null {
  return typeof worker === 'string' ? null : worker.email ?? null;
}

export default function EmployerApplicationDetailsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    if (!applicationId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getEmployerApplicationById(applicationId);
      setApplication(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t('application.unableLoadApplication')));
    } finally {
      setLoading(false);
    }
  }, [applicationId, t]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const handleConfirm = () => {
    const action = confirmAction;
    if (!applicationId || !action) {
      return;
    }
    setConfirmAction(null);
    setActionError(null);
    if (action === 'accept') {
      setAccepting(true);
    } else {
      setRejecting(true);
    }
    void (async () => {
      try {
        if (action === 'accept') {
          const result = await acceptApplication(applicationId);
          await loadApplication();
          setFeedback(
            result.assignment
              ? t('application.acceptedAndAssignment')
              : t('application.acceptedAndAssigned'),
          );
        } else {
          await rejectApplication(applicationId);
          await loadApplication();
          setFeedback(t('application.applicationRejected'));
        }
      } catch (err) {
        setActionError(getApiErrorMessage(err, t('application.pleaseTryAgain')));
      } finally {
        setAccepting(false);
        setRejecting(false);
      }
    })();
  };

  const handleAccept = () => {
    setActionError(null);
    setConfirmAction('accept');
  };

  const handleReject = () => {
    setActionError(null);
    setConfirmAction('reject');
  };

  if (loading) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <DetailHeader title="Application" />
        <Skeleton width="55%" height={26} />
        <Skeleton width="35%" height={20} style={styles.skeletonInset} />
        <Card style={styles.section}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="80%" height={16} style={styles.skeletonInset} />
          <Skeleton width="90%" height={16} style={styles.skeletonInset} />
        </Card>
        <Card style={styles.section}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="70%" height={16} style={styles.skeletonInset} />
        </Card>
      </Screen>
    );
  }

  if (error || !application || typeof application.job === 'string') {
    return (
      <Screen>
        <DetailHeader title="Application" />
        <ErrorState message={error ?? t('application.notFound')} onRetry={() => void loadApplication()} />
      </Screen>
    );
  }

  const job = application.job;
  const canReview = application.status === 'PENDING';
  const email = workerEmail(application.worker);
  const workerId =
    typeof application.worker === 'string' ? undefined : application.worker._id;
  const { latitude, longitude } = job.location.coordinates || {};
  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  const footer =
    canReview || feedback ? (
      <View style={styles.footer}>
        {feedback ? (
          <Text variant="caption" color="success" align="center">
            {feedback}
          </Text>
        ) : null}
        {actionError ? (
          <Text variant="caption" color="error" align="center">
            {actionError}
          </Text>
        ) : null}
        {canReview ? (
          <>
            <Button
              label={accepting ? t('application.accepting') : t('application.acceptApplication')}
              onPress={handleAccept}
              loading={accepting}
              disabled={rejecting}
              fullWidth
            />
            <Button
              label={rejecting ? t('application.rejecting') : t('application.rejectApplication')}
              variant="destructive"
              onPress={handleReject}
              loading={rejecting}
              disabled={accepting}
              fullWidth
            />
          </>
        ) : null}
      </View>
    ) : undefined;

  return (
    <Screen scroll footer={footer} contentContainerStyle={styles.content}>
      <DetailHeader title={t('application.title')} subtitle={job.title} />

      <View style={styles.applicantBlock}>
        <View style={styles.applicantAvatar}>
          <User size={26} color={colors.brand.primary} />
        </View>
        <View style={styles.applicantText}>
          <Text variant="headingXl" color="primary">
            {workerName(application.worker)}
          </Text>
          <Text variant="caption" color="muted">
            {t('application.appliedOn', { date: new Date(application.appliedAt).toLocaleDateString('en-IN') })}
          </Text>
        </View>
        <Badge label={getStatusLabel(application.status)} variant={statusVariant(application.status)} />
      </View>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('application.job')}
        </Text>
        <View style={styles.infoRow}>
          <Briefcase size={16} color={colors.text.muted} />
          <View style={styles.jobText}>
            <Text variant="headingMd" color="primary">
              {job.title}
            </Text>
            <Text variant="caption" color="brand">
              {getCategoryLabel(job.category)}
            </Text>
            <Text variant="bodyMd" color="primary">
              {formatCompensation(job.compensation)}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('application.workerContact')}
        </Text>
        <View style={styles.infoRow}>
          <User size={16} color={colors.text.muted} />
          <Text variant="bodyMd" color="primary">
            {workerName(application.worker)}
          </Text>
        </View>
        {email ? (
          <View style={styles.infoRow}>
            <Mail size={16} color={colors.text.muted} />
            <Text variant="bodyMd" color="primary">
              {email}
            </Text>
          </View>
        ) : null}
      </Card>

      {workerId ? (
        <Button
          label={t('application.viewWorkerProfile')}
          variant="secondary"
          onPress={() => router.push(employerMarketplaceProfileRoute(workerId))}
          fullWidth
        />
      ) : null}

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('job.schedule')}
        </Text>
        <Text variant="bodyMd" color="primary">
          {formatScheduleRange(job.schedule)}
        </Text>
        <Text variant="bodyMd" color="secondary">
          {formatTimeRange(job.schedule)}
        </Text>
      </Card>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('job.location')}
        </Text>
        <View style={styles.infoRow}>
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

      <ConfirmDialog
        visible={confirmAction !== null}
        title={confirmAction === 'accept' ? t('application.acceptTitle') : t('application.rejectTitle')}
        message={
          confirmAction === 'accept'
            ? t('application.acceptMessage')
            : t('application.rejectMessage')
        }
        confirmLabel={confirmAction === 'accept' ? t('application.accept') : t('application.reject')}
        destructive={confirmAction === 'reject'}
        loading={accepting || rejecting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  applicantBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brand.tint,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  applicantAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicantText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  section: {
    gap: spacing.sm,
  },
  jobText: {
    flex: 1,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footer: {
    gap: spacing.sm,
  },
  skeletonInset: {
    marginTop: spacing.md,
  },
});