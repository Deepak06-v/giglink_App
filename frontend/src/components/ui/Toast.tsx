import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  title?: string;
  description?: string;
}

export type ToastInput =
  | string
  | {
      title?: string;
      message?: string;
      description?: string;
      type?: ToastType;
      duration?: number;
    };

interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (input: ToastInput, options?: ToastOptions) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((input: ToastInput, options?: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    let title: string | undefined;
    let message = '';
    let type: ToastType = options?.type || 'info';
    let duration = options?.duration || 3500;

    if (typeof input === 'string') {
      message = input;
      title = options?.title;
      if (options?.type) type = options.type;
      if (options?.duration) duration = options.duration;
    } else {
      title = input.title;
      message = input.description || input.message || input.title || '';
      if (input.type) type = input.type;
      if (input.duration) duration = input.duration;
    }

    setToasts((current) => [...current, { id, title, message, type }]);

    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, { type: 'success' });
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, { type: 'error' });
  }, [showToast]);

  const removeToast = (id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5',
              toast.type === 'success' && 'bg-white/95 border-emerald-500/20 text-[#191B23]',
              toast.type === 'error' && 'bg-white/95 border-red-500/20 text-[#191B23]',
              (toast.type === 'info' || toast.type === 'warning') && 'bg-white/95 border-[#6C5CE7]/20 text-[#191B23]'
            )}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-[#6C5CE7]" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && <h5 className="text-xs font-bold text-text-primary">{toast.title}</h5>}
              <p className="text-xs text-[#5A5F6E] leading-relaxed mt-0.5">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#9BA1AE] hover:text-[#191B23] p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
