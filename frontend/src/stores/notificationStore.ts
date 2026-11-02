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
  decrementUnread: () => void;
  resetUnread: () => void;
  reset: () => void;
}

export type { NotificationState };

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  loading: false,

  fetchUnreadCount: async () => {
    set({ loading: true });
    try {
      const count = await getUnreadCount();
      set({ unreadCount: count });
    } catch {
      // Non-critical
    } finally {
      set({ loading: false });
    }
  },

  markNotificationRead: async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
    } catch {
      // Best-effort
    }
  },

  markAllRead: async () => {
    try {
      await markAllNotificationsAsRead();
      set({ unreadCount: 0 });
    } catch {
      // Best-effort
    }
  },

  incrementUnread: () => {
    set((state) => ({ unreadCount: state.unreadCount + 1 }));
  },

  decrementUnread: () => {
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
  },

  resetUnread: () => {
    set({ unreadCount: 0 });
  },

  reset: () => {
    set({ unreadCount: 0, loading: false });
  },
}));
