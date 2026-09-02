import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmployerJobCard } from '@/components/cards/EmployerJobCard';
import { ListCardSkeleton } from '@/components/cards/ListCardSkeleton';
import { Screen } from '@/components/layout/Screen';
import { Button, EmptyState, ErrorState, Text } from '@/components/ui';
import { DEFAULT_PAGE_SIZE, EMPLOYER_JOB_STATUS_FILTERS } from '@/constants/jobs';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerJobs } from '@/lib/api/jobs';
import type { Job, JobStatus } from '@/types';
import { employerCreateJobRoute, employerJobDetailsRoute } from '@/utils/routing';

type StatusFilter = (typeof EMPLOYER_JOB_STATUS_FILTERS)[number]['value'];

export default function EmployerMyJobsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const loadJobs = useCallback(
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
        const status = statusFilter === 'ALL' ? undefined : (statusFilter as JobStatus);
        const { jobs: items, pagination } = await getEmployerJobs(status, pageNum, DEFAULT_PAGE_SIZE);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setJobs((current) => (pageNum === 1 ? items : [...current, ...items]));
        setPage(pagination.page);
        setTotalPages(pagination.pages);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        if (pageNum === 1) {
          setJobs([]);
          setError(getApiErrorMessage(err, t('myJobs.unableLoadJobs')));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [statusFilter, t],
  );

  useEffect(() => {
    void loadJobs(1, 'initial');
  }, [loadJobs]);

  const handleLoadMore = () => {
    if (loading || loadingMore || refreshing || page >= totalPages) {
      return;
    }
    void loadJobs(page + 1, 'more');
  };

  const listHeader = (
    <View style={styles.header}>
      <Text variant="headingLg" color="primary">
        {t('myJobs.myJobs')}
      </Text>
      <Text variant="bodyMd" color="secondary">
        {t('myJobs.subtitle')}
      </Text>
      <FlatList
        horizontal
        data={EMPLOYER_JOB_STATUS_FILTERS}
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

  if (error && !loading && jobs.length === 0) {
    return (
      <Screen>
        {listHeader}
        <ErrorState message={error} onRetry={() => void loadJobs(1, 'initial')} />
      </Screen>
    );
  }

  return (
    <Screen
      style={styles.screen}
      padded={false}
      footer={
        <View style={styles.footer}>
          <Button label={t('myJobs.postAJob')} onPress={() => router.push(employerCreateJobRoute())} fullWidth />
        </View>
      }
    >
      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <EmployerJobCard
            job={item}
            onPress={() => router.push(employerJobDetailsRoute(item._id))}
          />
        )}
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
              title={t('myJobs.noJobsYet')}
              message={t('myJobs.postFirstJobMessage')}
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
            onRefresh={() => void loadJobs(1, 'refresh')}
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
  footer: {
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