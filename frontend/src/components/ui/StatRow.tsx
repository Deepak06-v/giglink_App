import React from 'react';
import { cn } from '@/utils/cn';

export interface StatItem {
  label: string;
  value: number | string;
  subtext?: string;
}

export interface StatRowProps {
  stats: StatItem[];
  className?: string;
}

export const StatRow: React.FC<StatRowProps> = ({ stats, className }) => {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 gap-3 w-full', className)}>
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-[#E9EAF0] p-4 flex flex-col justify-center shadow-sm"
        >
          <span className="text-[24px] font-extrabold text-[#191B23] tracking-tight">
            {stat.value}
          </span>
          <span className="text-[12px] font-semibold text-[#5A5F6E] uppercase tracking-wider mt-0.5">
            {stat.label}
          </span>
          {stat.subtext && (
            <span className="text-[11px] text-[#9BA1AE] mt-0.5">{stat.subtext}</span>
          )}
        </div>
      ))}
    </div>
  );
};
