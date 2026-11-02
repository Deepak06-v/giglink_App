import React from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopHeader } from '@/components/navigation/DesktopHeader';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';

export const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F6F7FB] flex flex-col antialiased selection:bg-[#6C5CE7]/20 selection:text-[#6C5CE7]">
      {/* Desktop Navigation */}
      <DesktopHeader />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 py-3 md:py-6 pb-28 md:pb-12">
        {children || <Outlet />}
      </main>

      {/* Mobile iOS Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
};
