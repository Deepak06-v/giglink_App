import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from '@/components/ui/Toast';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
      <PwaInstallPrompt />
    </ToastProvider>
  );
}

export default App;
