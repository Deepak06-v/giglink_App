import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Briefcase,
  ClipboardList,
  FileText,
  LayoutGrid,
  LogIn,
  Search,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/utils/cn';

export const BottomTabBar: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { t } = useTranslation();
  const location = useLocation();

  // Hide tab bar on auth / onboarding screens or deep modal paths
  const hidePaths = ['/login', '/signup', '/phone', '/otp', '/onboarding'];
  if (hidePaths.some((p) => location.pathname.startsWith(p))) {
    return null;
  }

  const role = user?.role || 'guest';

  interface TabItem {
    to: string;
    label: string;
    icon: any;
    badge?: number;
  }

  const workerTabs: TabItem[] = [
    {
      to: '/worker/jobs',
      label: t('tabs.jobs') || 'Find Jobs',
      icon: Briefcase,
    },
    {
      to: '/worker/applications',
      label: t('tabs.applications') || 'Applications',
      icon: FileText,
    },
    {
      to: '/worker/assignments',
      label: t('tabs.assignments') || 'Assignments',
      icon: ClipboardList,
    },
    {
      to: '/worker/profile',
      label: t('tabs.profile') || 'Profile',
      icon: User,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  const employerTabs: TabItem[] = [
    {
      to: '/employer/dashboard',
      label: t('tabs.dashboard') || 'Dashboard',
      icon: LayoutGrid,
    },
    {
      to: '/employer/jobs',
      label: t('tabs.myJobs') || 'My Jobs',
      icon: Briefcase,
    },
    {
      to: '/employer/applications',
      label: t('tabs.applications') || 'Applications',
      icon: FileText,
    },
    {
      to: '/employer/profile',
      label: t('tabs.profile') || 'Profile',
      icon: User,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  const guestTabs: TabItem[] = [
    {
      to: '/browse',
      label: 'Explore',
      icon: Search,
    },
    {
      to: '/login',
      label: 'Sign In',
      icon: LogIn,
    },
  ];

  const tabs: TabItem[] = isAuthenticated
    ? role === 'worker'
      ? workerTabs
      : employerTabs
    : guestTabs;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden ios-glass-tabbar pt-1.5 pb-[calc(var(--sab)+6px)] px-2 transition-all">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 py-1 rounded-2xl relative select-none transition-colors ios-active',
                  isActive ? 'text-[#6C5CE7]' : 'text-[#9BA1AE] hover:text-[#5A5F6E]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={cn('w-6 h-6 transition-transform', isActive && 'scale-105 stroke-[2.4]')} />
                    {tab.badge && tab.badge > 0 ? (
                      <span className="absolute -top-1 -right-2 bg-[#E5484D] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-xs">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-medium tracking-tight mt-1 transition-all',
                      isActive ? 'font-bold text-[#6C5CE7]' : 'text-[#9BA1AE]',
                    )}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
