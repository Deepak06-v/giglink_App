import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DetailHeader } from '@/components/layout/DetailHeader';
import { Screen } from '@/components/layout/Screen';
import { ReviewComposer } from '@/components/reviews/ReviewComposer';
import { EmptyState, ErrorState, Skeleton, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';
import { getEmployerJobById } from '@/lib/api/jobs';
import { getEmployerReviewStatus, submitEmployerReview } from '@/lib/api/reviews';
import { useTranslation } from '@/lib/i18n';

/**
 * Employer submits a review of one assigned worker for a completed job.
 * Eligibility always comes from the backend review-status endpoint.
 */
export default function EmployerReviewSubmitRoute() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ jobId: string; workerId: string; workerName?: string }>();
  const jobId = params.jobId;
  const workerId = params.workerId;
  const workerName = typeof params.workerName === 'string' ? params.workerName : '';

  const [jobTitle, setJobTitle] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId || !workerId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [job, status] = await Promise.all([getEmployerJobById(jobId), getEmployerReviewStatus(jobId)]);
      setJobTitle(job.job.title);
      const worker = status.workers.find((item) => item.workerId === workerId);
      if (!worker) {
        setUnavailable(true);
        return;
      }
      setAlreadyReviewed(worker.hasReviewed);
      if (!status.canReview && !worker.hasReviewed) {
        setUnavailable(true);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('review.unableSubmit')));
    } finally {
      setLoading(false);
    }
  }, [jobId, workerId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (rating: number, comment: string) => {
    if (!jobId || !workerId) {
      return;
    }
    try {
      await submitEmployerReview(jobId, workerId, { rating, comment });
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

  if (error || !jobId || !workerId) {
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

  const targetName = workerName || t('common.worker');

  return (
    <ReviewComposer
      headerTitle={t('review.title')}
      heading={t('review.headingEmployer')}
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