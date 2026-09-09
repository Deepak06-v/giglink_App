import { useLocalSearchParams } from 'expo-router';

import { ReviewListScreen } from '@/components/reviews/ReviewListScreen';
import { useTranslation } from '@/lib/i18n';

export default function EmployerReviewsListRoute() {
  const { t } = useTranslation();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return <ReviewListScreen title={t('review.reviews')} userId={userId} />;
}