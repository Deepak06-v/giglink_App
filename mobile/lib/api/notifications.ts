import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, Notification, Pagination } from '@/types';

export async function getNotifications(
  page = 1,
  limit = 20,
  unreadOnly?: boolean,
): Promise<{ notifications: Notification[]; pagination: Pagination }> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ notifications: Notification[]; pagination: Pagination }>
  >('/notifications', {
    params: {
      page,
      limit,
      ...(unreadOnly !== undefined ? { unread: unreadOnly } : {}),
    },
  });
  return response.data.data;
}

export async function getUnreadCount(): Promise<number> {
  const response = await apiClient.get<ApiSuccessResponse<{ count: number }>>(
    '/notifications/unread-count',
  );
  return response.data.data.count;
}

export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
  const response = await apiClient.patch<ApiSuccessResponse<{ notification: Notification }>>(
    `/notifications/${notificationId}/read`,
  );
  return response.data.data.notification;
}

export async function markAllNotificationsAsRead(): Promise<{ updatedCount: number }> {
  const response = await apiClient.patch<ApiSuccessResponse<{ updatedCount: number }>>(
    '/notifications/read-all',
  );
  return response.data.data;
}

export type DevicePlatform = 'android' | 'ios' | 'web';

export async function registerDeviceToken(
  token: string,
  platform: DevicePlatform,
): Promise<{ token: string; platform: DevicePlatform }> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ token: string; platform: DevicePlatform }>
  >('/notifications/devices', { token, platform });
  return response.data.data;
}

export async function unregisterDeviceToken(token: string): Promise<{ deleted: boolean }> {
  const response = await apiClient.delete<ApiSuccessResponse<{ deleted: boolean }>>(
    `/notifications/devices/${encodeURIComponent(token)}`,
  );
  return response.data.data;
}
