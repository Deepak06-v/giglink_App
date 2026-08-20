import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
} from '@/utils/formatJob';
import { openInMaps } from '@/utils/maps';

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
  return typeof worker === 'string' ? 'Worker' : worker.name || 'Worker';
}

function workerEmail(worker: string | ApplicationWorker): string | null {
  return typeof worker === 'string' ? null : worker.email ?? null;
}

export default function EmployerApplicationDetailsScreen() {
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
      setError(getApiErrorMessage(err, 'Unable to load application'));
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

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
              ? 'Application accepted and assignment created.'
              : 'Application accepted and worker assigned.',
          );
        } else {
          await rejectApplication(applicationId);
          await loadApplication();
          setFeedback('Application rejected.');
        }
      } catch (err) {
        setActionError(getApiErrorMessage(err, 'Please try again.'));
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
        <ErrorState message={error ?? 'Application not found'} onRetry={() => void loadApplication()} />
      </Screen>
    );
  }

  const job = application.job;
  const canReview = application.status === 'PENDING';
  const email = workerEmail(application.worker);
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
              label={accepting ? 'Accepting...' : 'Accept Application'}
              onPress={handleAccept}
              loading={accepting}
              disabled={rejecting}
              fullWidth
            />
            <Button
              label={rejecting ? 'Rejecting...' : 'Reject Application'}
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
      <DetailHeader title="Application" subtitle={job.title} />

      <View style={styles.titleBlock}>
        <Text variant="headingXl" color="primary">
          {workerName(application.worker)}
        </Text>
        <Badge label={application.status} variant={statusVariant(application.status)} />
        <Text variant="caption" color="muted">
          Applied {new Date(application.appliedAt).toLocaleDateString('en-IN')}
        </Text>
      </View>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Worker contact
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

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Job
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
          Compensation
        </Text>
        <Text variant="headingMd" color="primary">
          {formatCompensation(job.compensation)}
        </Text>
      </Card>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Schedule
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
          Location
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
              label="Open in Maps"
              variant="secondary"
              onPress={() =>
                void openInMaps({
                  latitude: latitude!,
                  longitude: longitude!,
                  address: job.location.address,
                  city: job.location.city,
                })
              }
              accessibilityLabel="Open job location in maps"
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        visible={confirmAction !== null}
        title={confirmAction === 'accept' ? 'Accept application?' : 'Reject application?'}
        message={
          confirmAction === 'accept'
            ? 'This will create an assignment for the worker.'
            : 'The worker will be notified.'
        }
        confirmLabel={confirmAction === 'accept' ? 'Accept' : 'Reject'}
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