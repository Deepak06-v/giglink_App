import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Mail, MapPin, User } from '@/components/icons';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
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
      <Screen scroll>
        <DetailHeader title="Application" />
        <View style={styles.skeleton} />
        <View style={styles.skeleton} />
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

      <View style={styles.titleBlock}>
        <Text variant="headingXl" color="primary">
          {workerName(application.worker)}
        </Text>
        <Badge label={getStatusLabel(application.status)} variant={statusVariant(application.status)} />
        <Text variant="caption" color="muted">
          Applied {new Date(application.appliedAt).toLocaleDateString('en-IN')}
        </Text>
      </View>

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
          {t('application.job')}
        </Text>
        <Text variant="headingMd" color="primary">
          {job.title}
        </Text>
        <Text variant="caption" color="brand">
          {getCategoryLabel(job.category)}
        </Text>
      </Card>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          {t('job.compensation')}
        </Text>
        <Text variant="headingMd" color="primary">
          {formatCompensation(job.compensation)}
        </Text>
      </Card>

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
  titleBlock: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footer: {
    gap: spacing.sm,
  },
  skeleton: {
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
    marginBottom: spacing.md,
  },
});