import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AssignmentCard } from '@/components/cards/AssignmentCard';
import { ListCardSkeleton } from '@/components/cards/ListCardSkeleton';
import { Screen } from '@/components/layout/Screen';
import { EmptyState, ErrorState, Text } from '@/components/ui';
import { ASSIGNMENT_STATUS_FILTERS, DEFAULT_PAGE_SIZE } from '@/constants/jobs';
import { colors, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { getAssignments } from '@/lib/api/assignments';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Assignment } from '@/types';
import { assignmentDetailsRoute } from '@/utils/routing';
import { getAssignmentBucket } from '@/utils/formatJob';

type AssignmentFilter = (typeof ASSIGNMENT_STATUS_FILTERS)[number]['value'];

export default function WorkerAssignmentsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<AssignmentFilter>('UPCOMING');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const { assignments: items } = await getAssignments(1, DEFAULT_PAGE_SIZE);
      setAssignments(items);
    } catch (err) {
      setAssignments([]);
      setError(getApiErrorMessage(err, t('assignment.unableLoadAssignments')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const filteredAssignments = useMemo(
    () =>
      assignments.filter((assignment) => getAssignmentBucket(assignment) === statusFilter),
    [assignments, statusFilter],
  );

  const emptyMessage =
    statusFilter === 'COMPLETED'
      ? t('assignment.noCompletedGigs')
      : t('assignment.acceptedGigsAppear');

  const listHeader = (
    <View style={styles.header}>
      <Text variant="headingLg" color="primary">
        {t('assignment.myAssignments')}
      </Text>
      <Text variant="bodyMd" color="secondary">
        {t('assignment.selectedToWork')}
      </Text>
      <FlatList
        horizontal
        data={ASSIGNMENT_STATUS_FILTERS}
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
        <ErrorState message={error} onRetry={() => void loadAssignments()} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <FlatList
        data={filteredAssignments}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <AssignmentCard
            assignment={item}
            onPress={() => router.push(assignmentDetailsRoute(item._id))}
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
            <EmptyState title={t('assignment.noAssignmentsYet')} message={emptyMessage} />
          )
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadAssignments('refresh')}
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
});
