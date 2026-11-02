import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface BottomSheetProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  const isShown = isOpen !== undefined ? isOpen : Boolean(open);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isShown) {
        onClose();
      }
    };
    if (isShown) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isShown, onClose]);

  if (!isShown) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        className={cn(
          'relative w-full max-h-[90vh] bg-white rounded-t-[28px] md:rounded-2xl md:max-w-md shadow-2xl flex flex-col z-10 transition-transform duration-200 overflow-hidden',
          className,
        )}
      >
        {/* iOS Grab Handle (Mobile Only) */}
        <div className="w-full flex justify-center pt-2.5 pb-1 md:hidden">
          <div className="w-10 h-1.5 rounded-full bg-[#D8DAE3]" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E9EAF0]">
            <h3 className="text-[17px] font-bold text-[#191B23]">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F2F3F8] flex items-center justify-center text-[#5A5F6E] hover:bg-[#E9EAF0] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
  );
};
