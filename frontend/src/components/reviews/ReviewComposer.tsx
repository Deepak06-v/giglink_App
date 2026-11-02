import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { RatingStars } from './RatingStars';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslation } from '@/lib/i18n';

export interface ReviewComposerProps {
  title: string;
  subtitle?: string;
  targetName: string;
  alreadyReviewed?: boolean;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onDone?: () => void;
}

export const ReviewComposer: React.FC<ReviewComposerProps> = ({
  title,
  subtitle,
  targetName,
  alreadyReviewed = false,
  onSubmit,
  onDone,
}) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompleted = alreadyReviewed || submitted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(rating, comment.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center my-4">
        <div className="w-14 h-14 rounded-full bg-[#12B76A]/10 text-[#12B76A] flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-[18px] font-bold text-[#191B23] mb-1">
          {alreadyReviewed ? t('review.alreadyTitle') || 'Review Already Submitted' : t('review.successTitle') || 'Thank You!'}
        </h3>
        <p className="text-[14px] text-[#5A5F6E] max-w-sm mb-6">
          {alreadyReviewed
            ? t('review.alreadyMessage') || 'You have already submitted a review for this job.'
            : t('review.successMessage') || 'Your feedback helps build trust in our marketplace community.'}
        </p>
        {onDone && <Button label="Done" onClick={onDone} fullWidth className="max-w-xs" />}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6 my-2">
      <div>
        <h2 className="text-[20px] font-bold text-[#191B23] tracking-tight">{title}</h2>
        {subtitle && <p className="text-[14px] text-[#5A5F6E] mt-0.5">{subtitle}</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 py-4 bg-[#F6F7FB] rounded-2xl border border-[#E9EAF0]">
          <span className="text-[13px] font-semibold text-[#5A5F6E]">
            How was your experience with <span className="text-[#191B23]">{targetName}</span>?
          </span>
          <RatingStars rating={rating} onChange={setRating} interactive size={36} className="mt-1" />
          <span className="text-[12px] font-medium text-[#9BA1AE] mt-1">
            {rating === 0
              ? 'Tap a star to rate'
              : rating === 5
                ? 'Excellent (5/5)'
                : rating === 4
                  ? 'Very Good (4/5)'
                  : rating === 3
                    ? 'Good (3/5)'
                    : rating === 2
                      ? 'Fair (2/5)'
                      : 'Poor (1/5)'}
          </span>
        </div>

        <Textarea
          label="Your Comments (Optional)"
          placeholder="Share details of your experience, professionalism, punctuality, and work quality..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
        />

        {error && <span className="text-[13px] font-medium text-[#E5484D]">{error}</span>}

        <Button
          type="submit"
          label={submitting ? 'Submitting...' : 'Submit Review'}
          loading={submitting}
          disabled={rating < 1}
          fullWidth
        />
      </form>
    </Card>
  );
};
