import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'danger'
  | 'ghost'
  | 'outline'
  | 'accent';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  fullWidth = false,
  className,
  icon,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-semibold select-none transition-all duration-150 ios-active focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] focus-visible:ring-offset-2';

  const sizeStyles = {
    sm: 'min-h-[36px] px-3.5 text-xs rounded-xl',
    md: 'min-h-[46px] px-4.5 text-sm rounded-2xl',
    lg: 'min-h-[52px] px-6 text-base rounded-2xl',
  };

  const variantStyles = {
    primary:
      'bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white shadow-[0_2px_8px_rgba(108,92,231,0.28)]',
    secondary:
      'bg-[#F2F3F8] hover:bg-[#E9EAF0] text-[#191B23] border border-[#E9EAF0]',
    destructive:
      'bg-[#E5484D] hover:bg-[#D43F44] text-white shadow-[0_2px_8px_rgba(229,72,77,0.24)]',
    danger:
      'bg-[#E5484D] hover:bg-[#D43F44] text-white shadow-[0_2px_8px_rgba(229,72,77,0.24)]',
    accent:
      'bg-[#FF6B35] hover:bg-[#E85D2A] text-white shadow-[0_2px_8px_rgba(255,107,53,0.28)]',
    outline:
      'bg-transparent hover:bg-bg-secondary text-text-primary border border-border',
    ghost:
      'bg-transparent hover:bg-[#F2F3F8] text-[#5A5F6E] active:bg-[#ECEEF3]',
  };

  const effectiveLeftIcon = leftIcon || icon;

  return (
    <button
      disabled={isDisabled}
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {effectiveLeftIcon}
          {children || label}
          {rightIcon}
        </>
      )}
    </button>
  );
};
