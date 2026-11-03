import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register service worker immediately for PWA installability & offline support
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[FixMate PWA] New version ready');
  },
  onOfflineReady() {
    console.log('[FixMate PWA] App ready offline');
  },
});

// Auto-reload on stale chunk or dynamic import failure (e.g. after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[FixMate] Asset preload error detected. Reloading page...', event);
  const lastReload = sessionStorage.getItem('fixmate_preload_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('fixmate_preload_reload', now.toString());
    window.location.reload();
  }
});

// Catch stylesheet loading failures (e.g. 404 from older cached HTML) and reload
window.addEventListener(
  'error',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === 'LINK' && (target as HTMLLinkElement).rel === 'stylesheet') {
      console.warn('[FixMate] Stylesheet failed to load, refreshing cache...');
      const lastReload = sessionStorage.getItem('fixmate_css_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('fixmate_css_reload', now.toString());
        window.location.reload();
      }
    }
  },
  true,
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
