import React, { useEffect } from 'react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  destructive?: boolean;
  variant?: 'danger' | 'primary' | 'destructive';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  destructive = false,
  variant,
  loading = false,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const isShown = isOpen !== undefined ? isOpen : Boolean(open);
  const handleClose = onClose || onCancel || (() => {});
  const finalConfirmLabel = confirmText || confirmLabel || 'Confirm';
  const finalCancelLabel = cancelText || cancelLabel || 'Cancel';
  const isDestructive = destructive || variant === 'danger' || variant === 'destructive';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isShown && !loading) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShown, loading, handleClose]);

  if (!isShown) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={loading ? undefined : handleClose}
      />

      {/* Dialog Card */}
      <div className="relative w-full max-w-[340px] bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-[#E9EAF0] text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-[18px] font-bold text-[#191B23] mb-2">{title}</h3>
        {message && <p className="text-[14px] text-[#5A5F6E] mb-6 leading-relaxed">{message}</p>}

        <div className="w-full flex flex-col gap-2">
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            fullWidth
            loading={loading}
            onClick={onConfirm}
          >
            {finalConfirmLabel}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            disabled={loading}
            onClick={handleClose}
          >
            {finalCancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
