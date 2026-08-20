import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MapPin } from '@/components/icons';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { completeAssignment, getAssignmentById } from '@/lib/api/assignments';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Assignment, AssignmentCompletion } from '@/types';
import {
  formatCompensation,
  formatDuration,
  formatScheduleRange,
  formatTimeRange,
  getEmployerName,
  isAssignmentUpcoming,
} from '@/utils/formatJob';
import { openInMaps } from '@/utils/maps';

function statusLabel(assignment: Assignment): string {
  if (assignment.status === 'COMPLETED') {
    return 'COMPLETED';
  }
  if (assignment.status === 'CANCELLED') {
    return 'CANCELLED';
  }
  return isAssignmentUpcoming(assignment.job) ? 'UPCOMING' : 'ACTIVE';
}

export default function AssignmentDetailsScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [completion, setCompletion] = useState<AssignmentCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const loadAssignment = useCallback(async () => {
    if (!assignmentId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAssignmentById(assignmentId);
      setAssignment(data.assignment);
      setCompletion(data.completion);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load assignment'));
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void loadAssignment();
  }, [loadAssignment]);

  const canComplete =
    assignment?.status === 'ACTIVE' &&
    !assignment.workerCompleted &&
    !completedSuccess;

  const handleComplete = () => {
    if (!assignmentId) {
      return;
    }
    setCompleteError(null);
    setConfirming(true);
  };

  const confirmComplete = async () => {
    if (!assignmentId) {
      return;
    }
    setCompleting(true);
    try {
      await completeAssignment(assignmentId);
      setCompletedSuccess(true);
      setConfirming(false);
      await loadAssignment();
    } catch (err) {
      setCompleteError(getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll>
        <DetailHeader title="Assignment" />
        <View style={styles.skeleton} />
        <View style={styles.skeletonTall} />
      </Screen>
    );
  }

  if (error || !assignment) {
    return (
      <Screen>
        <DetailHeader title="Assignment" />
        <ErrorState message={error ?? 'Assignment not found'} onRetry={() => void loadAssignment()} />
      </Screen>
    );
  }

  const job = assignment.job;
  const { latitude, longitude } = job.location.coordinates || {};
  const hasCoordinates = latitude !== undefined && longitude !== undefined;
  const label = statusLabel(assignment);

  return (
    <Screen
      scroll
      footer={
        canComplete ? (
          <>
            {completeError ? (
              <Text variant="bodyMd" color="error">
                {completeError}
              </Text>
            ) : null}
            <Button
              label={completing ? 'Submitting...' : 'Mark as Completed'}
              onPress={handleComplete}
              loading={completing}
              fullWidth
            />
          </>
        ) : completedSuccess || assignment.workerCompleted ? (
          <View style={styles.successBox}>
            <Text variant="headingMd" color="success" align="center">
              Completion submitted
            </Text>
            {completion?.waitingFor === 'employer' ? (
              <Text variant="bodyMd" color="secondary" align="center">
                Waiting for employer confirmation.
              </Text>
            ) : null}
          </View>
        ) : undefined
      }
      contentContainerStyle={styles.content}
    >
      <DetailHeader title="Assignment" subtitle={job.title} />

      <View style={styles.titleBlock}>
        <Text variant="headingLg" color="primary">
          {job.title}
        </Text>
        <Text variant="bodyMd" color="secondary">
          {getEmployerName(job.employer)}
        </Text>
        <Badge label={label} variant={label === 'COMPLETED' ? 'success' : 'brand'} />
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

      {job.description ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            Instructions
          </Text>
          <Text variant="bodyMd" color="primary">
            {job.description}
          </Text>
        </Card>
      ) : null}

      <ConfirmDialog
        visible={confirming}
        title="Mark this assignment as completed?"
        confirmLabel="Confirm"
        loading={completing}
        onConfirm={() => void confirmComplete()}
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
  skeletonTall: {
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
  },
  successBox: {
    gap: spacing.sm,
  },
});
