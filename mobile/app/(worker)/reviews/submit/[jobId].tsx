import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { ReviewComposer } from '@/components/reviews/ReviewComposer';
import { EmptyState, ErrorState, Skeleton, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getJobById } from '@/lib/api/jobs';
import { getWorkerReviewStatus, submitWorkerReview } from '@/lib/api/reviews';
import { useTranslation } from '@/lib/i18n';

/**
 * Worker submits a review of the employer for a completed job. Eligibility
 * always comes from the backend review-status endpoint.
 */
export default function WorkerReviewSubmitRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [jobTitle, setJobTitle] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [job, status] = await Promise.all([getJobById(jobId), getWorkerReviewStatus(jobId)]);
      setJobTitle(job.title);
      setAlreadyReviewed(status.hasReviewed);
      if (!status.canReview && !status.hasReviewed) {
        setUnavailable(true);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('review.unableSubmit')));
    } finally {
      setLoading(false);
    }
  }, [jobId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (rating: number, comment: string) => {
    if (!jobId) {
      return;
    }
    try {
      await submitWorkerReview(jobId, { rating, comment });
    } catch (err) {
      throw new Error(getApiErrorMessage(err, t('review.unableSubmit')));
    }
  };

  if (loading) {
    return (
      <Screen scroll contentContainerStyle={styles.content}>
        <DetailHeader title={t('review.title')} />
        <Skeleton width="70%" height={20} />
        <Skeleton height={120} width="100%" radiusValue={16} />
        <Skeleton height={120} width="100%" radiusValue={16} />
      </Screen>
    );
  }

  if (error || !jobId) {
    return (
      <Screen>
        <DetailHeader title={t('review.title')} />
        <ErrorState message={error ?? t('common.somethingWentWrong')} onRetry={() => void load()} />
      </Screen>
    );
  }

  if (unavailable) {
    return (
      <Screen>
        <DetailHeader title={t('review.title')} />
        <EmptyState state="empty" title={t('review.unavailableTitle')} message={t('review.unavailableMessage')} />
      </Screen>
    );
  }

  return (
    <ReviewComposer
      headerTitle={t('review.title')}
      heading={t('review.headingWorker')}
      jobTitle={jobTitle || undefined}
      alreadyReviewed={alreadyReviewed}
      onSubmit={handleSubmit}
      onDone={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
});