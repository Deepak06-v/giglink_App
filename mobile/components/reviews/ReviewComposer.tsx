import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { CheckCircle2 } from '@/components/icons';
import { RatingStars } from '@/components/reviews/RatingStars';
import { Button, Card, Input, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

interface ReviewComposerProps {
  headerTitle: string;
  headerSubtitle?: string;
  heading: string;
  jobTitle?: string;
  /** True when the user already reviewed the target for this job. */
  alreadyReviewed: boolean;
  /** Throws on failure so the composer can surface the message. */
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onDone?: () => void;
}

const COMMENT_MAX_LENGTH = 1000;

/**
 * Review submission form: required star rating + optional comment, with
 * submitted / already-reviewed success states.
 */
export function ReviewComposer({
  headerTitle,
  headerSubtitle,
  heading,
  jobTitle,
  alreadyReviewed,
  onSubmit,
  onDone,
}: ReviewComposerProps) {
  const { t } = useTranslation();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const settled = alreadyReviewed || submitted;

  const handleSubmit = async () => {
    if (rating < 1 || submitting) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(rating, comment.trim());
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (settled) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <DetailHeader title={headerTitle} subtitle={headerSubtitle} />
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={44} color={colors.semantic.success} />
          </View>
          <Text variant="headingMd" color="primary" align="center">
            {alreadyReviewed ? t('review.alreadyTitle') : t('review.successTitle')}
          </Text>
          <Text variant="bodyMd" color="secondary" align="center">
            {alreadyReviewed ? t('review.alreadyMessage') : t('review.successMessage')}
          </Text>
          {onDone ? (
            <Button label={t('common.done')} onPress={onDone} style={styles.doneButton} fullWidth />
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      keyboardAvoiding
      contentContainerStyle={styles.content}
      footer={
        <Button
          label={submitting ? t('review.submitting') : t('review.submit')}
          loading={submitting}
          disabled={rating < 1}
          onPress={() => void handleSubmit()}
          fullWidth
        />
      }
    >
      <DetailHeader title={headerTitle} subtitle={headerSubtitle} />

      <Card style={styles.card}>
        <Text variant="headingMd" color="primary">
          {heading}
        </Text>
        {jobTitle ? (
          <Text variant="caption" color="muted">
            {t('review.duringJob', { job: jobTitle })}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text variant="label" color="secondary">
          {t('review.rateLabel')}
        </Text>
        <RatingStars value={rating} onChange={setRating} />
        <Text variant="caption" color="muted">
          {t('review.ratingHint')}
        </Text>
        {rating < 1 ? (
          <Text variant="caption" color="error">
            {t('review.ratingMissing')}
          </Text>
        ) : null}
      </Card>

      <Input
        label={t('review.commentLabel')}
        value={comment}
        onChangeText={(value) => {
          setSubmitError(null);
          setComment(value);
        }}
        multiline
        maxLength={COMMENT_MAX_LENGTH}
        numberOfLines={4}
        textAlignVertical="top"
        placeholder={t('review.commentPlaceholder')}
        editable={!submitting}
      />

      {submitError ? (
        <Text variant="bodyMd" color="error">
          {submitError}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing['3xl'],
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: colors.semanticTint.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  doneButton: {
    marginTop: spacing.lg,
  },
});