import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin } from '@/components/icons';
import { JobMapPreview } from '@/components/maps/JobMapPreview';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, ErrorState, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { applyToJob } from '@/lib/api/applications';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getJobById } from '@/lib/api/jobs';
import { useAuthStore } from '@/store/authStore';
import type { Application, JobListItem } from '@/types';
import {
  formatCompensation,
  formatDuration,
  formatScheduleRange,
  formatTimeRange,
  getCategoryLabel,
  getEmployerName,
} from '@/utils/formatJob';
import { openInMaps } from '@/utils/maps';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { applicationDetailsRoute } from '@/utils/routing';

interface JobDetailScreenProps {
  jobId: string;
}

export function JobDetailScreen({ jobId }: JobDetailScreenProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [job, setJob] = useState<JobListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [submittedApplication, setSubmittedApplication] = useState<Application | null>(null);

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
      setError(getApiErrorMessage(err, 'Unable to load job details'));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

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
      setApplyError(getApiErrorMessage(err, 'Unable to submit application'));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll>
        <DetailHeader title="Job Details" />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlockTall} />
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

  const footer = !isAuthenticated ? (
    <View style={styles.applyFooter}>
      <Button label="Sign in to apply" onPress={handleApplyAction} fullWidth />
    </View>
  ) : submittedApplication ? (
    <View style={styles.successFooter}>
      <Text variant="headingMd" color="success" align="center">
        Application submitted
      </Text>
      <Text variant="bodyMd" color="secondary" align="center">
        Your application for {job.title} has been submitted successfully.
      </Text>
      <Button
        label="View Application"
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
        label={hasApplied ? 'Applied' : applying ? 'Applying...' : 'Apply Now'}
        onPress={() => void handleApply()}
        loading={applying}
        disabled={!canApply || hasApplied}
        fullWidth
      />
    </View>
  );

  return (
    <Screen
      scroll
      footer={footer}
      contentContainerStyle={styles.content}
    >
      <DetailHeader title="Job Details" subtitle={getCategoryLabel(job.category)} />

      <View style={styles.titleBlock}>
        <Text variant="headingXl" color="primary">
          {job.title}
        </Text>
        <Text variant="bodyLg" color="secondary">
          {getEmployerName(job.employer)}
        </Text>
        <Badge label={job.status} variant={job.status === 'OPEN' ? 'brand' : 'default'} />
      </View>

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Compensation
        </Text>
        <Text variant="headingLg" color="primary">
          {formatCompensation(job.compensation)}
        </Text>
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

      <Card style={styles.section}>
        <Text variant="label" color="secondary">
          Description
        </Text>
        <Text variant="bodyMd" color="primary">
          {job.description}
        </Text>
      </Card>

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
});