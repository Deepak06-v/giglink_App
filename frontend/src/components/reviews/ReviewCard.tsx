import React from 'react';
import { RatingStars } from './RatingStars';
import { Card } from '@/components/ui/Card';
import type { Review } from '@/types';
import { formatAppliedDate } from '@/utils/formatJob';

export interface ReviewCardProps {
  review: Review;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const reviewerName = review.reviewer.companyName || review.reviewer.name || 'User';
  const reviewerAvatar = review.reviewer.logo || review.reviewer.profileImage;

  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {reviewerAvatar ? (
            <img
              src={reviewerAvatar}
              alt={reviewerName}
              className="w-9 h-9 rounded-full object-cover border border-[#E9EAF0]"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#EDEBFC] text-[#6C5CE7] flex items-center justify-center font-bold text-xs">
              {reviewerName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-[#191B23] leading-snug">
              {reviewerName}
            </span>
            {review.job?.title && (
              <span className="text-[12px] text-[#5A5F6E] line-clamp-1">{review.job.title}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <RatingStars rating={review.rating} size={14} />
          {review.createdAt && (
            <span className="text-[11px] text-[#9BA1AE] mt-0.5">
              {formatAppliedDate(review.createdAt)}
            </span>
          )}
        </div>
      </div>

      {review.comment && (
        <p className="text-[14px] text-[#5A5F6E] leading-relaxed pt-1 border-t border-[#F2F3F8]">
          "{review.comment}"
        </p>
      )}
    </Card>
  );
};
