import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ShieldCheck } from 'lucide-react';
import { getUserReviews } from '@/lib/api/reviews';
import type { Review, TrustSummary } from '@/types/jobs';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { RatingStars } from '@/components/reviews/RatingStars';

export const ReviewsListView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<TrustSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);

    getUserReviews(userId, 1, 50)
      .then((data) => {
        setReviews(data.reviews || []);
        setSummary(data.summary || null);
      })
      .catch((err) => setError(err.message || 'Could not load reviews'))
      .finally(() => setIsLoading(false));
  }, [userId]);

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-20 md:pb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 p-2 rounded-2xl bg-white border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Community Reviews
        </span>
      </div>

      {/* Summary Card */}
      {summary && (
        <Card className="p-6 text-center">
          <span className="text-4xl font-black text-text-primary block">
            {summary.averageRating?.toFixed(1) || '0.0'}
          </span>
          <div className="flex justify-center my-2">
            <RatingStars rating={summary.averageRating || 0} size={22} />
          </div>
          <span className="text-xs font-semibold text-text-muted">
            Based on {summary.totalReviews} verified community review{summary.totalReviews === 1 ? '' : 's'}
          </span>
        </Card>
      )}

      {/* Reviews Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <ErrorState
            title="Could not load reviews"
            message={error}
            onRetry={() => window.location.reload()}
          />
        ) : reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Reviews are submitted by employers and workers upon completing gigs."
          />
        ) : (
          reviews.map((rev) => <ReviewCard key={rev._id} review={rev} />)
        )}
      </div>

      {/* Trust Footer */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted py-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Reviews are verified and submitted only after completed gigs</span>
      </div>
    </div>
  );
};
