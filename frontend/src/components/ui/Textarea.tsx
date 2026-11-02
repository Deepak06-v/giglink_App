import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-semibold text-[#5A5F6E] pl-0.5">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          className={cn(
            'w-full p-3.5 rounded-xl border border-[#E9EAF0] bg-white text-[#191B23] text-[15px] placeholder-[#9BA1AE] transition-all focus:outline-none focus:border-[#6C5CE7] focus:ring-4 focus:ring-[#6C5CE7]/10 disabled:bg-[#F2F3F8] resize-y',
            error && 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/10',
            className,
          )}
          {...props}
        />
        {error && <span className="text-[12px] text-[#E5484D] font-medium pl-0.5">{error}</span>}
        {hint && !error && <span className="text-[12px] text-[#9BA1AE] pl-0.5">{hint}</span>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
