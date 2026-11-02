import React from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-[#E9EAF0] p-4 text-[#191B23] shadow-[0_1px_3px_rgba(26,58,92,0.04)]',
        interactive &&
          'cursor-pointer transition-all duration-150 ios-active hover:shadow-[0_4px_16px_rgba(26,58,92,0.08)] hover:border-[#D8DAE3]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
