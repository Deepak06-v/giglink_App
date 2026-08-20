import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ApplicationCard } from '@/components/cards/ApplicationCard';
import { ListCardSkeleton } from '@/components/cards/ListCardSkeleton';
import { Screen } from '@/components/layout/Screen';
import { EmptyState, ErrorState, Text } from '@/components/ui';
import { APPLICATION_STATUS_FILTERS, DEFAULT_PAGE_SIZE } from '@/constants/jobs';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { getApplications } from '@/lib/api/applications';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Application, ApplicationStatus } from '@/types';
import { applicationDetailsRoute } from '@/utils/routing';

type StatusFilter = (typeof APPLICATION_STATUS_FILTERS)[number]['value'];

export default function WorkerApplicationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const status = statusFilter === 'ALL' ? undefined : (statusFilter as ApplicationStatus);
      const { applications: items } = await getApplications(1, DEFAULT_PAGE_SIZE, status);
      setApplications(items);
    } catch (err) {
      setApplications([]);
      setError(getApiErrorMessage(err, t('application.unableLoadApplications')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const listHeader = (
    <View style={styles.header}>
      <Text variant="headingLg" color="primary">
        {t('application.myApplications')}
      </Text>
      <Text variant="bodyMd" color="secondary">
        {t('application.trackAppliedGigs')}
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
              <Text variant="caption" color={selected ? 'brand' : 'secondary'}>
                {t(item.labelKey)}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  if (error && !loading) {
    return (
      <Screen>
        {listHeader}
        <ErrorState message={error} onRetry={() => void loadApplications()} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <FlatList
        data={applications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <ApplicationCard
            application={item}
            onPress={() => router.push(applicationDetailsRoute(item._id))}
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
              title={t('application.noApplicationsYet')}
              message={t('application.findGigAndApply')}
              action={
                <Pressable
                  onPress={() => router.push('/(worker)/(tabs)')}
                  style={styles.findButton}
                  accessibilityRole="button"
                >
                  <Text variant="label" color="brand">
                    {t('application.findGigs')}
                  </Text>
                </Pressable>
              }
            />
          )
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadApplications('refresh')}
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
    backgroundColor: colors.semanticTint.brand,
  },
  separator: {
    height: spacing.md,
  },
  skeletonList: {
    gap: spacing.md,
  },
  findButton: {
    alignSelf: 'center',
    padding: spacing.md,
  },
});
