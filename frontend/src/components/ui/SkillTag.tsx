import React from 'react';
import { cn } from '@/utils/cn';

export interface SkillTagProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export const SkillTag: React.FC<SkillTagProps> = ({ label, onRemove, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#EDEBFC] text-[#6C5CE7] text-[13px] font-medium border border-[#6C5CE7]/20 select-none',
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-[#6C5CE7] hover:text-[#5A4BD1] font-bold text-sm leading-none"
        >
          ×
        </button>
      )}
    </span>
  );
};
