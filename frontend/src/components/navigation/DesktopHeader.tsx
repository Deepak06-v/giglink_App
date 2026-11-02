import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Briefcase, ClipboardList, FileText, Globe, LayoutGrid, LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTranslation } from '@/lib/i18n';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

export const DesktopHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const role = user?.role || 'guest';

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'kn' : 'en');
  };

  const workerNav = [
    { to: '/worker/jobs', label: t('tabs.jobs') || 'Find Jobs', icon: Briefcase },
    { to: '/worker/applications', label: t('tabs.applications') || 'Applications', icon: FileText },
    { to: '/worker/assignments', label: t('tabs.assignments') || 'Assignments', icon: ClipboardList },
    { to: '/worker/profile', label: t('tabs.profile') || 'Profile', icon: User },
  ];

  const employerNav = [
    { to: '/employer/dashboard', label: t('tabs.dashboard') || 'Dashboard', icon: LayoutGrid },
    { to: '/employer/jobs', label: t('tabs.myJobs') || 'My Jobs', icon: Briefcase },
    { to: '/employer/applications', label: t('tabs.applications') || 'Applications', icon: FileText },
    { to: '/employer/profile', label: t('tabs.profile') || 'Profile', icon: User },
  ];

  const navLinks = role === 'worker' ? workerNav : employerNav;

  const handleNotificationsClick = () => {
    if (role === 'worker') {
      navigate('/worker/notifications');
    } else {
      navigate('/employer/notifications');
    }
  };

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full ios-glass-nav border-b border-[#E9EAF0] px-6 py-3 select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
        {/* Brand & Role Tag */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6C5CE7] to-[#8C7CF0] flex items-center justify-center text-white shadow-md shadow-[#6C5CE7]/30 transition-transform group-hover:scale-105">
              <span className="font-extrabold text-lg tracking-wider">F</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[18px] font-extrabold text-[#191B23] tracking-tight leading-none">
                FixMate
              </span>
              <span className="text-[10px] font-semibold text-[#9BA1AE] tracking-wider uppercase mt-0.5">
                Local Gigs
              </span>
            </div>
          </Link>

          {isAuthenticated && (
            <Badge
              label={role === 'worker' ? 'Worker' : 'Employer'}
              variant="brand"
              className="ml-2 uppercase tracking-wider text-[11px]"
            />
          )}
        </div>

        {/* Navigation Tabs */}
        {isAuthenticated && (
          <nav className="flex items-center gap-1 bg-[#F2F3F8] p-1 rounded-2xl border border-[#E9EAF0]">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-white text-[#6C5CE7] shadow-xs'
                        : 'text-[#5A5F6E] hover:text-[#191B23] hover:bg-white/60',
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E9EAF0] bg-white text-[13px] font-semibold text-[#5A5F6E] hover:text-[#191B23] hover:border-[#D8DAE3] transition-colors shadow-xs"
          >
            <Globe className="w-4 h-4 text-[#6C5CE7]" />
            <span>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
          </button>

          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <button
                onClick={handleNotificationsClick}
                type="button"
                className="relative p-2.5 rounded-xl bg-white border border-[#E9EAF0] text-[#5A5F6E] hover:text-[#191B23] hover:border-[#D8DAE3] transition-colors shadow-xs"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#E5484D] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Logout button */}
              <button
                onClick={() => void logout()}
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5484D]/20 text-[#E5484D] hover:bg-[#E5484D]/10 text-[13px] font-semibold transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white text-[14px] font-semibold shadow-xs transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
