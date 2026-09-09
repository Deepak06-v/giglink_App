import { StyleSheet, View } from 'react-native';

import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { RatingStars } from '@/components/reviews/RatingStars';
import { Card, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import type { Review } from '@/types';

interface ReviewCardProps {
  review: Review;
}

function formatReviewDate(date?: string): string {
  if (!date) {
    return '';
  }
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Lightweight review card — reviewer identity, rating, comment, and job
 * context. Kept border-free and compact per the summary style.
 */
export function ReviewCard({ review }: ReviewCardProps) {
  const { t } = useTranslation();
  const author = review.reviewer;
  const isCompany = Boolean(author.companyName);
  const name = (isCompany ? author.companyName : author.name) ?? '';
  const photo = isCompany ? author.logo : author.profileImage;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <ProfileAvatar source={photo} name={name} size={36} square={isCompany} />
        <View style={styles.headerText}>
          <Text variant="bodyLg" color="primary" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="muted">
            {formatReviewDate(review.createdAt)}
          </Text>
        </View>
        <RatingStars value={review.rating} size={14} readonly />
      </View>

      {review.comment ? (
        <Text variant="bodyMd" color="secondary">
          {review.comment}
        </Text>
      ) : null}

      {review.job?.title ? (
        <Text variant="caption" color="muted">
          {t('review.duringJob', { job: review.job.title })}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});