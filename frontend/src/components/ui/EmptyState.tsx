import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No items found',
  message,
  description,
  icon,
  action,
  actionLabel,
  onAction,
  className,
}) => {
  const effectiveMessage = description || message;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-[#E9EAF0] my-4 shadow-xs',
        className,
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#F2F3F8] text-[#5A5F6E] flex items-center justify-center mb-4">
        {icon || <Inbox className="w-7 h-7 text-text-muted" />}
      </div>
      <h3 className="text-base font-bold text-[#191B23] mb-1">{title}</h3>
      {effectiveMessage && (
        <p className="text-xs text-[#5A5F6E] max-w-sm mb-5 leading-relaxed">{effectiveMessage}</p>
      )}
      {action ? (
        <div className="mt-1">{action}</div>
      ) : actionLabel && onAction ? (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
};
