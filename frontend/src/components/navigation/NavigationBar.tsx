import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface NavigationBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  largeTitle?: boolean;
  className?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  largeTitle = false,
  className,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 w-full ios-glass-nav transition-all duration-200 select-none px-4 pt-[calc(var(--sat)+10px)] pb-3',
        className,
      )}
    >
      <div className="flex items-center justify-between min-h-[44px]">
        {/* Left: Back Button or spacer */}
        <div className="flex items-center min-w-[60px]">
          {showBack ? (
            <button
              onClick={handleBack}
              type="button"
              className="inline-flex items-center gap-1 text-[#6C5CE7] hover:text-[#5A4BD1] font-semibold text-[16px] -ml-1.5 p-1.5 rounded-xl active:opacity-70 transition-opacity"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : null}
        </div>

        {/* Center: Title (when not largeTitle) */}
        {!largeTitle && (
          <div className="flex flex-col items-center text-center px-2 flex-1 overflow-hidden">
            <h1 className="text-[17px] font-bold text-[#191B23] truncate tracking-tight">{title}</h1>
            {subtitle && (
              <span className="text-[12px] text-[#5A5F6E] truncate -mt-0.5">{subtitle}</span>
            )}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center justify-end min-w-[60px] gap-2">
          {rightAction}
        </div>
      </div>

      {/* Large Title (iOS standard for main screens) */}
      {largeTitle && (
        <div className="pt-2 pb-1">
          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#191B23] tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[14px] text-[#5A5F6E] mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
      )}
    </header>
  );
};
