import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-semibold text-[#5A5F6E] pl-0.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={inputId}
            ref={ref}
            className={cn(
              'w-full min-h-[50px] px-4 pr-10 rounded-xl border border-[#E9EAF0] bg-white text-[#191B23] text-[15px] appearance-none transition-all focus:outline-none focus:border-[#6C5CE7] focus:ring-4 focus:ring-[#6C5CE7]/10 disabled:bg-[#F2F3F8]',
              error && 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/10',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-[#9BA1AE] absolute right-3.5 pointer-events-none" />
        </div>
        {error && <span className="text-[12px] text-[#E5484D] font-medium pl-0.5">{error}</span>}
      </div>
    );
  },
);

Select.displayName = 'Select';
