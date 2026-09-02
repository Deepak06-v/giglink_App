import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmployerApplicationCard } from '@/components/cards/EmployerApplicationCard';
import { ListCardSkeleton } from '@/components/cards/ListCardSkeleton';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { EmptyState, ErrorState, Text } from '@/components/ui';
import { APPLICATION_STATUS_FILTERS, DEFAULT_PAGE_SIZE } from '@/constants/jobs';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { getEmployerAllApplications, getEmployerApplicationsForJob } from '@/lib/api/applications';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Application, ApplicationStatus, ApplicationWorker } from '@/types';
import { employerApplicationDetailsRoute, employerMarketplaceProfileRoute } from '@/utils/routing';

type StatusFilter = (typeof APPLICATION_STATUS_FILTERS)[number]['value'];

export default function EmployerApplicationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ jobId?: string; jobTitle?: string }>();
  const jobId = params.jobId;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [applications, setApplications] = useState<Application[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const loadApplications = useCallback(
    async (pageNum: number, mode: 'initial' | 'refresh' | 'more') => {
      const requestId = ++requestIdRef.current;

      if (mode === 'initial') {
        setLoading(true);
        setError(null);
      } else if (mode === 'refresh') {
        setRefreshing(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const status = statusFilter === 'ALL' ? undefined : (statusFilter as ApplicationStatus);
        const result = jobId
          ? await getEmployerApplicationsForJob(jobId, pageNum, DEFAULT_PAGE_SIZE, status)
          : await getEmployerAllApplications(pageNum, DEFAULT_PAGE_SIZE, status);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setApplications((current) => (pageNum === 1 ? result.applications : [...current, ...result.applications]));
        setPage(result.pagination.page);
        setTotalPages(result.pagination.pages);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        if (pageNum === 1) {
          setApplications([]);
          setError(getApiErrorMessage(err, t('application.unableLoadApplications')));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [jobId, statusFilter, t],
  );

  useEffect(() => {
    void loadApplications(1, 'initial');
  }, [loadApplications]);

  const handleLoadMore = () => {
    if (loading || loadingMore || refreshing || page >= totalPages) {
      return;
    }
    void loadApplications(page + 1, 'more');
  };

  const listHeader = (
    <View style={styles.header}>
      <Text variant="headingLg" color="primary">
        {jobId ? params.jobTitle || t('application.jobApplications') : t('tabs.applications')}
      </Text>
      <Text variant="bodyMd" color="secondary">
        {jobId ? t('application.applicationsForJob') : t('application.reviewApplications')}
      </Text>
      <FlatList
        horizontal
        data={APPLICATION_STATUS_FILTERS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => {
          const selected = statusFilter === item.value;
          return (
            <Pressable
              onPress={() => setStatusFilter(item.value)}
              style={[styles.filterChip, selected && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text variant="label" color={selected ? 'onBrand' : 'secondary'} style={styles.filterChipText}>
                {t(item.labelKey)}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  const header = jobId ? (
    <View style={styles.paddedHeader}>
      <DetailHeader title={params.jobTitle || t('application.jobApplications')} />
    </View>
  ) : null;

  if (error && !loading && applications.length === 0) {
    return (
      <Screen>
        {header}
        {listHeader}
        <ErrorState message={error} onRetry={() => void loadApplications(1, 'initial')} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen} padded={false}>
      {header}
      <FlatList
        data={applications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const workerId =
            typeof item.worker === 'string' ? undefined : (item.worker as ApplicationWorker)._id;
          return (
            <EmployerApplicationCard
              application={item}
              onPress={() => router.push(employerApplicationDetailsRoute(item._id))}
              onViewProfile={
                workerId
                  ? () => router.push(employerMarketplaceProfileRoute(workerId))
                  : undefined
              }
            />
          );
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonList}>
              {Array.from({ length: 4 }).map((_, index) => (
                <ListCardSkeleton key={index} />
              ))}
            </View>
          ) : (
            <EmptyState
              title={t('application.noApplicationsYet')}
              message={t('application.applicationsFromWorkers')}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.brand.primary} style={styles.footerLoader} />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadApplications(1, 'refresh')}
            tintColor={colors.brand.primary}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  paddedHeader: {
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    flexGrow: 1,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  filters: {
    marginTop: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  filterChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary,
  },
  filterChipText: {
    fontSize: 13,
  },
  separator: {
    height: spacing.md,
  },
  skeletonList: {
    gap: spacing.md,
  },
  footerLoader: {
    marginVertical: spacing.lg,
  },
});