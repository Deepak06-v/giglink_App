import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Users } from '@/components/icons';
import {
  employerJobStatusLabel,
  employerJobStatusVariant,
} from '@/components/cards/EmployerJobCard';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { completeJobEmployer, deleteJob, getEmployerJobById, updateJob } from '@/lib/api/jobs';
import type { JobCompletionInfo } from '@/lib/api/jobs';
import type { Job } from '@/types';
import {
  formatCompensation,
  formatDuration,
  formatScheduleRange,
  formatTimeRange,
  getCategoryLabel,
} from '@/utils/formatJob';
import { openInMaps } from '@/utils/maps';
import { employerEditJobRoute } from '@/utils/routing';

export default function EmployerJobDetailsScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [completion, setCompletion] = useState<JobCompletionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'delete' | 'complete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
      setError(getApiErrorMessage(err, 'Unable to load job'));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

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
    void runMutation(async () => {
      await updateJob(jobId, { status: 'OPEN' });
      await loadJob();
    }, 'Unable to publish job');
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
      }, 'Unable to cancel job');
    } else if (action === 'delete') {
      void runMutation(async () => {
        await deleteJob(jobId);
        router.back();
      }, 'Unable to delete job');
    } else {
      void runMutation(async () => {
        await completeJobEmployer(jobId);
        await loadJob();
      }, 'Unable to confirm completion');
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
        <DetailHeader title="Job Details" />
        <View style={styles.skeleton} />
        <View style={styles.skeleton} />
        <View style={styles.skeletonTall} />
      </Screen>
    );
  }

  if (error || !job) {
    return (
      <Screen>
        <DetailHeader title="Job Details" />
        <ErrorState message={error ?? 'Job not found'} onRetry={() => void loadJob()} />
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
          label={mutating ? 'Publishing...' : 'Publish Job'}
          onPress={handlePublish}
          loading={mutating}
          fullWidth
        />
      ) : null}
      {canComplete ? (
        <Button
          label={mutating ? 'Confirming...' : 'Confirm Completion'}
          onPress={handleComplete}
          loading={mutating}
          fullWidth
        />
      ) : null}
      {canViewApplications ? (
        <Button
          label="View Applications"
          variant="secondary"
          onPress={handleViewApplications}
          fullWidth
        />
      ) : null}
      {canEdit ? (
        <Button
          label="Edit Job"
          variant="secondary"
          onPress={() => router.push(employerEditJobRoute(job._id))}
          fullWidth
        />
      ) : null}
      {canCancel ? (
        <Button
          label="Cancel Job"
          variant="destructive"
          onPress={handleCancel}
          disabled={mutating}
          fullWidth
        />
      ) : null}
      {canDelete ? (
        <Button
          label="Delete Job"
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
      <DetailHeader title="Job Details" subtitle={getCategoryLabel(job.category)} />

      <View style={styles.titleBlock}>
        <Text variant="headingXl" color="primary">
          {job.title}
        </Text>
        <Badge label={employerJobStatusLabel(job.status)} variant={employerJobStatusVariant(job.status)} />
      </View>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Compensation
        </Text>
        <Text variant="headingLg" color="primary">
          {formatCompensation(job.compensation)}
        </Text>
        <View style={styles.metaRow}>
          <Users size={14} color={colors.text.muted} />
          <Text variant="bodyMd" color="secondary">
            {job.workersRequired} worker{job.workersRequired === 1 ? '' : 's'} required
          </Text>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Schedule
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
            Completion
          </Text>
          <Text variant="bodyMd" color="primary">
            Workers confirmed: {completion.workersCompleted}/{completion.workersRequired}
          </Text>
          <Text variant="bodyMd" color="secondary">
            {completion.employerCompleted ? 'Employer confirmed' : 'Awaiting employer confirmation'}
          </Text>
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Location
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

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Description
        </Text>
        <Text variant="bodyMd" color="primary">
          {job.description}
        </Text>
      </Card>

      {job.hiringDeadline ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            Hiring deadline
          </Text>
          <Text variant="bodyMd" color="primary">
            {new Date(job.hiringDeadline).toLocaleDateString('en-IN')}
          </Text>
        </Card>
      ) : null}

      {job.requirements ? (
        <Card style={styles.section}>
          <Text variant="label" color="secondary">
            Requirements
          </Text>
          {job.requirements.skills?.length ? (
            <Text variant="bodyMd" color="primary">
              Skills: {job.requirements.skills.join(', ')}
            </Text>
          ) : null}
          {job.requirements.experience ? (
            <Text variant="bodyMd" color="primary">
              Experience: {job.requirements.experience}
            </Text>
          ) : null}
          {job.requirements.dressCode ? (
            <Text variant="bodyMd" color="primary">
              Dress code: {job.requirements.dressCode}
            </Text>
          ) : null}
          {job.requirements.languages?.length ? (
            <Text variant="bodyMd" color="primary">
              Languages: {job.requirements.languages.join(', ')}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <ConfirmDialog
        visible={confirmAction !== null}
        title={
          confirmAction === 'cancel'
            ? 'Cancel this job?'
            : confirmAction === 'delete'
              ? 'Delete this job?'
              : 'Confirm completion?'
        }
        message={
          confirmAction === 'cancel'
            ? 'The job will be marked as cancelled.'
            : confirmAction === 'delete'
              ? 'This action cannot be undone.'
              : 'Confirm that this job has been completed.'
        }
        confirmLabel={
          confirmAction === 'cancel' ? 'Cancel Job' : confirmAction === 'delete' ? 'Delete' : 'Confirm'
        }
        destructive={confirmAction === 'cancel' || confirmAction === 'delete'}
        loading={mutating}
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
});