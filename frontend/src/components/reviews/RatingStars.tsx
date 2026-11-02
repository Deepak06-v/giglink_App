import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: number;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  interactive = false,
  onChange,
  size = 20,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1 select-none', className)}>
      {Array.from({ length: maxRating }).map((_, idx) => {
        const starValue = idx + 1;
        const isFilled = starValue <= rating;

        return (
          <button
            key={idx}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange && onChange(starValue)}
            className={cn(
              'p-0.5 rounded transition-transform',
              interactive && 'cursor-pointer hover:scale-110 active:scale-95',
              !interactive && 'cursor-default',
            )}
          >
            <Star
              style={{ width: size, height: size }}
              className={cn(
                'transition-colors',
                isFilled
                  ? 'fill-[#F79009] text-[#F79009]'
                  : 'fill-transparent text-[#D8DAE3]',
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
