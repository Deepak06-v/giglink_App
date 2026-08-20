import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin } from '@/components/icons';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getApplicationById, withdrawApplication } from '@/lib/api/applications';
import { getAssignments } from '@/lib/api/assignments';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Application, Assignment } from '@/types';
import {
  formatCompensation,
  formatDuration,
  formatScheduleRange,
  formatTimeRange,
  getEmployerName,
} from '@/utils/formatJob';
import { openInMaps } from '@/utils/maps';
import { assignmentDetailsRoute } from '@/utils/routing';

function statusVariant(status: Application['status']): 'warning' | 'success' | 'error' | 'default' {
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

export default function ApplicationDetailsScreen() {
  const router = useRouter();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();

  const [application, setApplication] = useState<Application | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    if (!applicationId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getApplicationById(applicationId);
      setApplication(data);

      if (data.status === 'ACCEPTED' && typeof data.job !== 'string') {
        const jobId = data.job._id;
        const { assignments } = await getAssignments(1, 100);
        const match = assignments.find((item) => item.job._id === jobId);
        setAssignment(match ?? null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load application'));
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const handleWithdraw = () => {
    if (!applicationId) {
      return;
    }
    setWithdrawError(null);
    setConfirming(true);
  };

  const confirmWithdraw = async () => {
    if (!applicationId) {
      return;
    }
    setWithdrawing(true);
    try {
      const updated = await withdrawApplication(applicationId);
      setApplication(updated);
      setConfirming(false);
    } catch (err) {
      setWithdrawError(getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setWithdrawing(false);
    }
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
  const { latitude, longitude } = job.location.coordinates || {};
  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  return (
    <Screen
      scroll
      footer={
        application.status === 'PENDING' ? (
          <>
            {withdrawError ? (
              <Text variant="bodyMd" color="error">
                {withdrawError}
              </Text>
            ) : null}
            <Button
              label={withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
              variant="destructive"
              onPress={handleWithdraw}
              loading={withdrawing}
              fullWidth
            />
          </>
        ) : assignment ? (
          <Button
            label="View Assignment"
            onPress={() => router.push(assignmentDetailsRoute(assignment._id))}
            fullWidth
          />
        ) : undefined
      }
      contentContainerStyle={styles.content}
    >
      <DetailHeader title="Application" subtitle={job.title} />

      <View style={styles.titleBlock}>
        <Text variant="headingLg" color="primary">
          {job.title}
        </Text>
        <Text variant="bodyMd" color="secondary">
          {getEmployerName(job.employer)}
        </Text>
        <Badge label={application.status} variant={statusVariant(application.status)} />
        <Text variant="caption" color="muted">
          Applied {new Date(application.appliedAt).toLocaleDateString('en-IN')}
        </Text>
      </View>

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
        {job.duration ? (
          <Text variant="caption" color="muted">
            {formatDuration(job.duration)}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Location
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
        visible={confirming}
        title="Withdraw application?"
        message="You can apply again later if the job is still open."
        confirmLabel="Withdraw"
        destructive
        loading={withdrawing}
        onConfirm={() => void confirmWithdraw()}
        onCancel={() => setConfirming(false)}
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
  locationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  skeleton: {
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
    marginBottom: spacing.md,
  },
});
