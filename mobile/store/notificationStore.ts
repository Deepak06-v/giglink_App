import { create } from 'zustand';

import {
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/api/notifications';

interface NotificationState {
  unreadCount: number;
  loading: boolean;
  fetchUnreadCount: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  incrementUnread: () => void;
  reset: () => void;
}

export type { NotificationState };

/**
 * Shared unread-count store used by both Worker and Employer headers/screens.
 * Single source of truth so badge logic is never duplicated across roles.
 */
export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  loading: false,

  fetchUnreadCount: async () => {
    set({ loading: true });
    try {
      const count = await getUnreadCount();
      set({ unreadCount: count });
    } catch {
      // Non-critical — headers render without a badge on failure.
    } finally {
      set({ loading: false });
    }
  },

  markNotificationRead: async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
    } catch {
      // Best-effort — the server is the source of truth.
    }
  },

  markAllRead: async () => {
    try {
      await markAllNotificationsAsRead();
      set({ unreadCount: 0 });
    } catch {
      // Best-effort — the server is the source of truth.
    }
  },

  incrementUnread: () => {
    set((state) => ({ unreadCount: state.unreadCount + 1 }));
  },

  reset: () => {
    set({ unreadCount: 0, loading: false });
  },
}));