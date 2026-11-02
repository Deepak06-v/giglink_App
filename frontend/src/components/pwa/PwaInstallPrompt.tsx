import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY_INSTALLED = 'fixmate_pwa_installed';
const SESSION_KEY_DISMISSED = 'fixmate_install_dismissed';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // 1. Check if already installed or running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    const isMarkedInstalled = localStorage.getItem(STORAGE_KEY_INSTALLED) === 'true';
    const isSessionDismissed = sessionStorage.getItem(SESSION_KEY_DISMISSED) === 'true';

    if (isStandalone || isMarkedInstalled || isSessionDismissed) {
      return;
    }

    // 2. Listen for beforeinstallprompt event (Android Chrome & Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Automatically show the popup shortly after page loads (1.2 seconds)
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);

      return () => clearTimeout(timer);
    };

    // 3. Listen for appinstalled event (fired when user successfully installs)
    const handleAppInstalled = () => {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
        setIsVisible(false);
      } else {
        // User cancelled native dialog; dismiss for this session
        sessionStorage.setItem(SESSION_KEY_DISMISSED, 'true');
        setIsVisible(false);
      }
    } catch {
      setIsVisible(false);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    // Dismiss for this visit/session only; allow it to appear again on next visit
    sessionStorage.setItem(SESSION_KEY_DISMISSED, 'true');
    setIsVisible(false);
  };

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-none animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs pointer-events-auto transition-opacity"
        onClick={handleDismiss}
      />

      {/* Floating Install Card */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-border/80 pointer-events-auto z-10 animate-in slide-in-from-bottom-8 duration-300">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="relative shrink-0">
            <img
              src="/pwa-192x192.png"
              alt="FixMate"
              className="w-14 h-14 rounded-2xl shadow-md border border-border/60 object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-3 h-3" />
            </div>
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-black text-text-primary tracking-tight">
                FixMate App
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                Fast & Local
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 leading-snug">
              Install FixMate for quick home-screen access, instant alerts & smoother experience.
            </p>
          </div>
        </div>

        {/* Perks pill list */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-2xl bg-bg-primary border border-border/60 text-[11px] font-semibold text-text-secondary">
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Instant launch</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Works offline</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="md"
            onClick={handleDismiss}
            className="flex-1 text-text-secondary hover:text-text-primary"
          >
            Not Now
          </Button>

          <Button
            variant="primary"
            size="md"
            loading={isInstalling}
            onClick={handleInstallClick}
            leftIcon={<Download className="w-4 h-4" />}
            className="flex-1 shadow-md shadow-primary/25"
          >
            Install App
          </Button>
        </div>
      </div>
    </div>
  );
};
