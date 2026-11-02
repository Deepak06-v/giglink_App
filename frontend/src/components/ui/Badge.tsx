import React from 'react';
import { cn } from '@/utils/cn';

export type BadgeVariant =
  | 'default'
  | 'brand'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral';

export interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<string, { bg: string; text: string; dot: string }> = {
  default: {
    bg: 'bg-[#F2F3F8]',
    text: 'text-[#5A5F6E]',
    dot: 'bg-[#9BA1AE]',
  },
  brand: {
    bg: 'bg-[#6C5CE7]/10',
    text: 'text-[#6C5CE7]',
    dot: 'bg-[#6C5CE7]',
  },
  primary: {
    bg: 'bg-[#6C5CE7]/10',
    text: 'text-[#6C5CE7]',
    dot: 'bg-[#6C5CE7]',
  },
  success: {
    bg: 'bg-[#12B76A]/12',
    text: 'text-[#12B76A]',
    dot: 'bg-[#12B76A]',
  },
  warning: {
    bg: 'bg-[#F79009]/12',
    text: 'text-[#F79009]',
    dot: 'bg-[#F79009]',
  },
  error: {
    bg: 'bg-[#E5484D]/12',
    text: 'text-[#E5484D]',
    dot: 'bg-[#E5484D]',
  },
  neutral: {
    bg: 'bg-[#ECEEF3]',
    text: 'text-[#191B23]',
    dot: 'bg-[#5A5F6E]',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  children,
  variant = 'default',
  size = 'sm',
  className,
  dot = false,
}) => {
  const styles = variantStyles[variant] || variantStyles.default;

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-3.5 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold select-none',
        styles.bg,
        styles.text,
        sizeStyles[size],
        className,
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />}
      {children || label}
    </span>
  );
};
