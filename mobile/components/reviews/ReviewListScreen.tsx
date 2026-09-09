import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Star } from '@/components/icons';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { Button, EmptyState, ErrorState, Skeleton, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getUserReviews } from '@/lib/api/reviews';
import { useTranslation } from '@/lib/i18n';
import type { Pagination, Review, TrustSummary } from '@/types';

interface ReviewListScreenProps {
  title: string;
  subtitle?: string;
  userId: string;
}

const PAGE_SIZE = 10;

/**
 * Paginated review list for any user (worker or employer). The public
 * reviews endpoint is safe for both authenticated roles.
 */
export function ReviewListScreen({ title, subtitle, userId }: ReviewListScreenProps) {
  const { t } = useTranslation();

  const [summary, setSummary] = useState<TrustSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (page: number) => {
      const data = await getUserReviews(userId, page, PAGE_SIZE);
      setSummary(data.summary);
      setReviews((current) => (page === 1 ? data.reviews : [...current, ...data.reviews]));
      setPagination(data.pagination);
      setError(null);
    },
    [userId],
  );

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadPage(1);
    } catch (err) {
      setError(getApiErrorMessage(err, t('review.unableSubmit')));
      setReviews([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [loadPage, t]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const hasMore = pagination ? pagination.page < pagination.pages : false;

  const loadMore = async () => {
    if (!pagination || !hasMore || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      await loadPage(pagination.page + 1);
    } catch (err) {
      setError(getApiErrorMessage(err, t('review.unableSubmit')));
    } finally {
      setLoadingMore(false);
    }
  };

  const summaryBlock = summary ? (
    <View style={styles.summaryCard}>
      <Star size={26} color={colors.semantic.warning} fill={colors.semantic.warning} />
      <Text variant="headingXl" color="primary">
        {summary.averageRating ? summary.averageRating.toFixed(1) : '—'}
      </Text>
      <View style={styles.ratingDivider} />
      <Text variant="bodyMd" color="secondary">
        {t('review.count', { count: summary.totalReviews })}
      </Text>
    </View>
  ) : null;

  const listHeader = (
    <View style={styles.listHeader}>
      <DetailHeader title={title} subtitle={subtitle} />
      {summaryBlock}
    </View>
  );

  const listFooter = hasMore ? (
    <View style={styles.footer}>
      <Button
        label={loadingMore ? t('review.loadMoreLoading') : t('review.loadMore')}
        variant="secondary"
        loading={loadingMore}
        onPress={() => void loadMore()}
        fullWidth
      />
    </View>
  ) : null;

  if (loading && reviews.length === 0) {
    return (
      <Screen>
        <DetailHeader title={title} subtitle={subtitle} />
        <View style={styles.skeletonList}>
          <Skeleton width="40%" height={14} />
          <Skeleton height={120} width="100%" radiusValue={16} />
          <Skeleton height={120} width="100%" radiusValue={16} />
          <Skeleton height={120} width="100%" radiusValue={16} />
        </View>
      </Screen>
    );
  }

  if (error && reviews.length === 0) {
    return (
      <Screen>
        <DetailHeader title={title} subtitle={subtitle} />
        <ErrorState message={error} onRetry={() => void loadFirst()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ReviewCard review={item} />}
        ItemSeparatorComponent={ReviewSeparator}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              state="noReviews"
              title={t('review.noReviewsTitle')}
              message={t('review.noReviewsMessage')}
            />
          ) : null
        }
      />
    </Screen>
  );
}

function ReviewSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
  },
  listHeader: {
    gap: spacing.md,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'center',
    backgroundColor: colors.surface.sunken,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  ratingDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border.default,
  },
  separator: {
    height: spacing.md,
  },
  footer: {
    marginTop: spacing.lg,
  },
  skeletonList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});