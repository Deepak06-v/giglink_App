import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmployerApplicationCard } from '@/components/cards/EmployerApplicationCard';
import { EmployerJobCard } from '@/components/cards/EmployerJobCard';
import { EmployerHeader } from '@/components/layout/EmployerHeader';
import { Screen } from '@/components/layout/Screen';
import {
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Clock,
} from '@/components/icons';
import { Button, Card, ErrorState, StatRow, Text } from '@/components/ui';
import { colors, radius, sizes, spacing } from '@/constants/theme';
import { getEmployerAllApplications } from '@/lib/api/applications';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerJobs } from '@/lib/api/jobs';
import { translate } from '@/lib/i18n';
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
      setStatsError(getApiErrorMessage(err, translate('dashboard.unableLoadDashboard')));
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
      setAttentionError(getApiErrorMessage(err, translate('application.unableLoadApplications')));
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

  const assigned = stats.filled + stats.inProgress;

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
            <Card style={styles.statsSkeleton}>
              {Array.from({ length: 4 }).map((_, index) => (
                <View key={index} style={styles.statRowSkeleton} />
              ))}
            </Card>
          ) : (
            <Card style={styles.statsCard}>
              <StatRow
                icon={Briefcase}
                iconColor={colors.brand.primary}
                iconBackground={colors.brand.tint}
                title={translate('dashboard.totalPosted')}
                value={stats.totalPosted}
              />
              <View style={styles.divider} />
              <StatRow
                icon={Clock}
                iconColor={colors.semantic.warning}
                iconBackground={colors.semanticTint.warning}
                title={translate('dashboard.open')}
                value={stats.open}
              />
              <View style={styles.divider} />
              <StatRow
                icon={ClipboardList}
                iconColor={colors.accent.opportunity}
                iconBackground={colors.accent.tint}
                title={translate('dashboard.assigned')}
                value={assigned}
              />
              <View style={styles.divider} />
              <StatRow
                icon={CheckCircle2}
                iconColor={colors.semantic.success}
                iconBackground={colors.semanticTint.success}
                title={translate('dashboard.completed')}
                value={stats.completed}
              />
            </Card>
          )}
          {jobsTotal > 50 ? (
            <Text variant="caption" color="muted">
              {translate('dashboard.statsNote', { count: jobs.length })}
            </Text>
          ) : null}
        </View>

        <View style={styles.padded}>
          <Button
            label={translate('dashboard.postJob')}
            onPress={() => router.push(employerCreateJobRoute())}
            fullWidth
            style={styles.postCta}
          />
        </View>

        <View style={styles.padded}>
          <View style={styles.sectionHeader}>
            <Text variant="headingMd" color="primary">
              {translate('dashboard.needsAttention')}
            </Text>
            {attentionLoading ? null : pendingApps.length > 0 ? (
              <Text variant="caption" color="warning">
                {translate('dashboard.pendingCount', { count: pendingApps.length })}
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
                {translate('dashboard.noPendingApplications')}
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
                  label={translate('dashboard.viewAllApplications')}
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
              {translate('dashboard.recentActiveJobs')}
            </Text>
            <Button
              label={translate('dashboard.seeAll')}
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
                {translate('dashboard.noActiveJobs')}
              </Text>
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
  statsCard: {
    paddingVertical: spacing.sm,
  },
  statsSkeleton: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  statRowSkeleton: {
    height: sizes.touchTarget,
    borderRadius: radius.md,
    backgroundColor: colors.surface.elevated,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
  },
  postCta: {
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
