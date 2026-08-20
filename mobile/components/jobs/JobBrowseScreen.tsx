import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Search } from '@/components/icons';
import { JobCard } from '@/components/cards/JobCard';
import { JobCardSkeleton } from '@/components/cards/JobCardSkeleton';
import { JobFiltersSheet } from '@/components/jobs/JobFiltersSheet';
import { Screen } from '@/components/layout/Screen';
import { Button, EmptyState, ErrorState, Text } from '@/components/ui';
import { useFontFamily } from '@/constants/fonts';
import { DEFAULT_PAGE_SIZE } from '@/constants/jobs';
import { colors, radius, spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslation } from '@/lib/i18n';
import { getJobs } from '@/lib/api/jobs';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { JobFilters, JobListItem } from '@/types';
import { toIsoDateOnly } from '@/utils/formatJob';

interface JobBrowseScreenProps {
  header?: ReactNode;
  onJobPress: (job: JobListItem) => void;
}

const DEFAULT_FILTERS: JobFilters = {
  sort: 'newest',
  limit: DEFAULT_PAGE_SIZE,
};

export function JobBrowseScreen({ header, onJobPress }: JobBrowseScreenProps) {
  const { t } = useTranslation();
  const fontFamily = useFontFamily(400);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftFilters, setDraftFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(searchQuery);
  const requestIdRef = useRef(0);

  const fetchJobs = useCallback(
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
        const { jobs: items, pagination } = await getJobs({
          ...appliedFilters,
          q: debouncedQuery.trim() || undefined,
          page: pageNum,
          limit: DEFAULT_PAGE_SIZE,
        });

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
          setError(getApiErrorMessage(err, t('home.unableLoadGigs')));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [appliedFilters, debouncedQuery, t],
  );

  useEffect(() => {
    void fetchJobs(1, 'initial');
  }, [fetchJobs]);

  const handleRefresh = () => {
    void fetchJobs(1, 'refresh');
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || refreshing || page >= totalPages) {
      return;
    }
    void fetchJobs(page + 1, 'more');
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...draftFilters, sort: draftFilters.sort ?? 'newest' });
    setFiltersVisible(false);
  };

  const handleClearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setSearchQuery('');
    setFiltersVisible(false);
  };

  const quickFilters = [
    {
      key: 'today',
      label: t('home.today'),
      active: appliedFilters.date === toIsoDateOnly(new Date()),
      onPress: () => {
        const today = toIsoDateOnly(new Date());
        const nextDate = appliedFilters.date === today ? undefined : today;
        setAppliedFilters((current) => ({ ...current, date: nextDate }));
      },
    },
    {
      key: 'pay',
      label: '₹500+',
      active: (appliedFilters.minPay ?? 0) >= 500,
      onPress: () => {
        setAppliedFilters((current) => ({
          ...current,
          minPay: current.minPay && current.minPay >= 500 ? undefined : 500,
        }));
      },
    },
    {
      key: 'category',
      label: t('home.category'),
      active: Boolean(appliedFilters.category),
      onPress: () => {
        setDraftFilters(appliedFilters);
        setFiltersVisible(true);
      },
    },
    {
      key: 'more',
      label: t('home.moreFilters'),
      active: Boolean(
        appliedFilters.city ||
          appliedFilters.maxPay ||
          appliedFilters.compensationType ||
          appliedFilters.fromDate ||
          appliedFilters.toDate,
      ),
      onPress: () => {
        setDraftFilters(appliedFilters);
        setFiltersVisible(true);
      },
    },
  ];

  const listHeader = (
    <View style={styles.headerContent}>
      {header}

      <View style={styles.searchBox}>
        <Search size={18} color={colors.text.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('home.searchJobs')}
          placeholderTextColor={colors.text.muted}
          style={[styles.searchInput, { fontFamily }]}
          accessibilityLabel={t('home.searchJobs')}
          returnKeyType="search"
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')} accessibilityLabel={t('home.clearSearch')}>
            <Text variant="label" color="brand">
              {t('common.clear')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text variant="label" color="secondary" style={styles.sectionLabel}>
        {t('home.quickFilters')}
      </Text>
      <FlatList
        horizontal
        data={quickFilters}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickFilters}
        renderItem={({ item }) => (
          <Pressable
            onPress={item.onPress}
            style={[styles.quickChip, item.active && styles.quickChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: item.active }}
          >
            <Text variant="caption" color={item.active ? 'brand' : 'secondary'}>
              {item.label}
            </Text>
          </Pressable>
        )}
      />

      <Text variant="headingMd" color="primary" style={styles.sectionTitle}>
        {t('home.availableGigs')}
      </Text>
    </View>
  );

  if (error && !loading && jobs.length === 0) {
    return (
      <Screen>
        {listHeader}
        <ErrorState message={error} onRetry={() => void fetchJobs(1, 'initial')} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <JobCard job={item} onPress={() => onJobPress(item)} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonList}>
              {Array.from({ length: 4 }).map((_, index) => (
                <JobCardSkeleton key={index} />
              ))}
            </View>
          ) : (
            <EmptyState
              title={t('home.noGigsFound')}
              message={t('home.changeFilters')}
              action={
                <Button label={t('home.clearFilters')} variant="secondary" onPress={handleClearFilters} />
              }
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
            onRefresh={handleRefresh}
            tintColor={colors.brand.primary}
          />
        }
      />

      <JobFiltersSheet
        visible={filtersVisible}
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onClose={() => setFiltersVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    flexGrow: 1,
  },
  headerContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  quickFilters: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  quickChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  quickChipActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.semanticTint.brand,
  },
  sectionTitle: {
    marginBottom: spacing.md,
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