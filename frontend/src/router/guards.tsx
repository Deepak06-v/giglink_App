import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getRoleHomeRoute } from '@/utils/routing';

export const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInitialized, initialize, isAuthenticated } = useAuthStore();
  const initLanguage = useLanguageStore((s) => s.initialize);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    initLanguage();
    initialize();
  }, [initLanguage, initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, fetchUnreadCount]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/25">
            <span className="text-white text-2xl font-black tracking-tight">FM</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-semibold text-text-secondary">Loading FixMate...</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export const WorkerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user?.role === 'employer') {
    return <Navigate to="/employer/dashboard" replace />;
  }

  return <>{children}</>;
};

export const EmployerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user?.role === 'worker') {
    return <Navigate to="/worker/jobs" replace />;
  }

  return <>{children}</>;
};

export const PublicOnlyGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isInitialized } = useAuthStore();

  if (!isInitialized) return null;

  if (isAuthenticated && user?.role) {
    return <Navigate to={getRoleHomeRoute(user.role)} replace />;
  }

  return <>{children}</>;
};
