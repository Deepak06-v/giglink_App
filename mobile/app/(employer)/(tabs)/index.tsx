import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmployerApplicationCard } from '@/components/cards/EmployerApplicationCard';
import { EmployerJobCard } from '@/components/cards/EmployerJobCard';
import { EmployerHeader } from '@/components/layout/EmployerHeader';
import { Screen } from '@/components/layout/Screen';
import { Button, Card, ErrorState, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { getEmployerAllApplications } from '@/lib/api/applications';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerJobs } from '@/lib/api/jobs';
import { useAuthStore } from '@/store/authStore';
import type { Application, Job } from '@/types';
import {
  employerApplicationDetailsRoute,
  employerApplicationsRoute,
  employerCreateJobRoute,
  employerJobDetailsRoute,
} from '@/utils/routing';

interface DashboardStats {
  totalPosted: number;
  open: number;
  filled: number;
  inProgress: number;
  draft: number;
  cancelled: number;
  completed: number;
  totalApplications: number;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card style={styles.statCard}>
      <Text variant="headingLg" color="primary">
        {value}
      </Text>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </Card>
  );
}

export default function EmployerDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [applicationsTotal, setApplicationsTotal] = useState(0);

  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [attentionLoading, setAttentionLoading] = useState(true);
  const [attentionError, setAttentionError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [jobsData, appsData] = await Promise.all([
        getEmployerJobs(undefined, 1, 50),
        getEmployerAllApplications(1, 1),
      ]);
      setJobs(jobsData.jobs);
      setJobsTotal(jobsData.pagination.total);
      setApplicationsTotal(appsData.pagination.total);
    } catch (err) {
      setStatsError(getApiErrorMessage(err, 'Unable to load dashboard'));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAttention = useCallback(async () => {
    setAttentionLoading(true);
    setAttentionError(null);
    try {
      const { applications } = await getEmployerAllApplications(1, 5, 'PENDING');
      setPendingApps(applications);
    } catch (err) {
      setAttentionError(getApiErrorMessage(err, 'Unable to load applications'));
    } finally {
      setAttentionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
    void loadAttention();
  }, [loadStats, loadAttention]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStats(), loadAttention()]);
    } finally {
      setRefreshing(false);
    }
  };

  const stats: DashboardStats = useMemo(() => {
    const open = jobs.filter((job) => job.status === 'OPEN').length;
    const filled = jobs.filter((job) => job.status === 'FILLED').length;
    const inProgress = jobs.filter((job) => job.status === 'IN_PROGRESS').length;
    const draft = jobs.filter((job) => job.status === 'DRAFT').length;
    const cancelled = jobs.filter((job) => job.status === 'CANCELLED').length;
    const completed = jobs.filter((job) => job.status === 'COMPLETED').length;
    return {
      totalPosted: jobsTotal,
      open,
      filled,
      inProgress,
      draft,
      cancelled,
      completed,
      totalApplications: applicationsTotal,
    };
  }, [jobs, jobsTotal, applicationsTotal]);

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) => job.status === 'OPEN' || job.status === 'FILLED' || job.status === 'IN_PROGRESS'),
    [jobs],
  );
  const recentActiveJobs = activeJobs.slice(0, 3);

  if (statsError && !statsLoading && jobs.length === 0) {
    return (
      <Screen>
        <EmployerHeader name={user?.name} onNotificationsPress={() => router.push('/(employer)/notifications')} />
        <ErrorState message={statsError} onRetry={() => void loadStats()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.brand.primary}
          />
        }
      >
        <View style={styles.padded}>
          <EmployerHeader
            name={user?.name}
            onNotificationsPress={() => router.push('/(employer)/notifications')}
          />
        </View>

        <View style={styles.padded}>
          {statsLoading ? (
            <View style={styles.statsGrid}>
              {Array.from({ length: 4 }).map((_, index) => (
                <View key={index} style={styles.statSkeleton} />
              ))}
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard label="Total Posted" value={stats.totalPosted} />
              <StatCard label="Open" value={stats.open} />
              <StatCard label="Assigned" value={stats.filled + stats.inProgress} />
              <StatCard label="Completed" value={stats.completed} />
            </View>
          )}
          {jobsTotal > 50 ? (
            <Text variant="caption" color="muted">
              Stats reflect your most recent {jobs.length} jobs.
            </Text>
          ) : null}
        </View>

        <View style={styles.padded}>
          <Text variant="label" color="secondary" style={styles.sectionLabel}>
            Quick actions
          </Text>
          <View style={styles.quickActions}>
            <Button label="+ Post Job" onPress={() => router.push(employerCreateJobRoute())} style={styles.quickAction} />
            <Button
              label="Review Applications"
              variant="secondary"
              onPress={() => router.push(employerApplicationsRoute())}
              style={styles.quickAction}
            />
            <Button
              label="View My Jobs"
              variant="secondary"
              onPress={() => router.push('/(employer)/(tabs)/jobs')}
              style={styles.quickAction}
            />
          </View>
        </View>

        <View style={styles.padded}>
          <View style={styles.sectionHeader}>
            <Text variant="headingMd" color="primary">
              Needs Attention
            </Text>
            {attentionLoading ? null : pendingApps.length > 0 ? (
              <Text variant="caption" color="warning">
                {pendingApps.length} pending
              </Text>
            ) : null}
          </View>

          {attentionLoading ? (
            <View style={styles.attentionSkeleton} />
          ) : attentionError ? (
            <ErrorState message={attentionError} onRetry={() => void loadAttention()} />
          ) : pendingApps.length === 0 ? (
            <Card variant="elevated" style={styles.emptyCard}>
              <Text variant="bodyMd" color="secondary">
                No pending applications. You're all caught up.
              </Text>
            </Card>
          ) : (
            <View style={styles.attentionList}>
              {pendingApps.slice(0, 3).map((application) => (
                <EmployerApplicationCard
                  key={application._id}
                  application={application}
                  onPress={() =>
                    router.push(employerApplicationDetailsRoute(application._id))
                  }
                />
              ))}
              {pendingApps.length > 3 ? (
                <Button
                  label="View all applications"
                  variant="ghost"
                  onPress={() => router.push(employerApplicationsRoute())}
                />
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.padded}>
          <View style={styles.sectionHeader}>
            <Text variant="headingMd" color="primary">
              Recent Active Jobs
            </Text>
            <Button
              label="See all"
              variant="ghost"
              onPress={() => router.push('/(employer)/(tabs)/jobs')}
            />
          </View>

          {statsLoading ? (
            <View style={styles.jobSkeletonList}>
              {Array.from({ length: 2 }).map((_, index) => (
                <View key={index} style={styles.jobSkeleton} />
              ))}
            </View>
          ) : recentActiveJobs.length === 0 ? (
            <Card variant="elevated" style={styles.emptyCard}>
              <Text variant="bodyMd" color="secondary">
                No active jobs right now. Post your first job to get started.
              </Text>
              <Button label="Post a Job" onPress={() => router.push(employerCreateJobRoute())} style={styles.mtSm} />
            </Card>
          ) : (
            <View style={styles.jobList}>
              {recentActiveJobs.map((job) => (
                <EmployerJobCard
                  key={job._id}
                  job={job}
                  onPress={() => router.push(employerJobDetailsRoute(job._id))}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing['2xl'],
    gap: spacing.xl,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  statSkeleton: {
    width: '47%',
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.elevated,
    flexGrow: 1,
  },
  quickActions: {
    gap: spacing.md,
  },
  quickAction: {
    alignSelf: 'stretch',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  attentionList: {
    gap: spacing.md,
  },
  jobList: {
    gap: spacing.md,
  },
  emptyCard: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  mtSm: {
    marginTop: spacing.sm,
  },
  attentionSkeleton: {
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.elevated,
  },
  jobSkeletonList: {
    gap: spacing.md,
  },
  jobSkeleton: {
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.elevated,
  },
});