import React from 'react';
import { cn } from '@/utils/cn';

export interface CompletionRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showText?: boolean;
}

export const CompletionRing: React.FC<CompletionRingProps> = ({
  percentage,
  size = 64,
  strokeWidth = 6,
  className,
  showText = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validPercent = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (validPercent / 100) * circumference;

  const color =
    validPercent >= 100
      ? '#12B76A' // success
      : validPercent >= 50
        ? '#6C5CE7' // brand primary
        : '#FF6B35'; // opportunity/coral

  return (
    <div
      className={cn('relative inline-flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#ECEEF3"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Active Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      {showText && (
        <span
          className="absolute font-bold text-[#191B23]"
          style={{ fontSize: Math.max(10, size * 0.22) }}
        >
          {validPercent}%
        </span>
      )}
    </div>
  );
};
