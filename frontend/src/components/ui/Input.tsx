import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const effectiveLeftIcon = leftIcon || icon;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-semibold text-[#5A5F6E] pl-0.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {effectiveLeftIcon && (
            <div className="absolute left-3.5 text-[#9BA1AE] pointer-events-none flex items-center">
              {effectiveLeftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full min-h-[50px] px-4 rounded-xl border border-[#E9EAF0] bg-white text-[#191B23] text-[15px] placeholder-[#9BA1AE] transition-all focus:outline-none focus:border-[#6C5CE7] focus:ring-4 focus:ring-[#6C5CE7]/10 disabled:bg-[#F2F3F8] disabled:cursor-not-allowed',
              effectiveLeftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/10',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-[#9BA1AE] flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="text-[12px] text-[#E5484D] font-medium pl-0.5">{error}</span>}
        {hint && !error && <span className="text-[12px] text-[#9BA1AE] pl-0.5">{hint}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
