import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils/cn';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-[#E5484D]/20 my-4 shadow-sm',
        className,
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#E5484D]/10 text-[#E5484D] flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-[17px] font-bold text-[#191B23] mb-1">{title}</h3>
      {message && <p className="text-[14px] text-[#5A5F6E] max-w-sm mb-5">{message}</p>}
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          label="Try Again"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={onRetry}
        />
      )}
    </div>
  );
};
