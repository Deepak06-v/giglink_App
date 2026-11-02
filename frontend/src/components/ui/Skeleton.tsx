import React from 'react';
import { cn } from '@/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  circle = false,
  className,
  style,
  ...props
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-[#ECEEF3] rounded-lg',
        circle && 'rounded-full',
        className,
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-[#E9EAF0] p-4 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex justify-between items-center">
        <Skeleton width="40%" height={16} />
        <Skeleton width="20%" height={20} className="rounded-full" />
      </div>
      <Skeleton width="80%" height={22} />
      <Skeleton width="60%" height={14} />
      <div className="flex gap-2 pt-2">
        <Skeleton width="30%" height={16} />
        <Skeleton width="30%" height={16} />
      </div>
    </div>
  );
};

export const SkeletonJobCard = SkeletonCard;
