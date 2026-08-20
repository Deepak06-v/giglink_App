import { router, type Href } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { UserRole } from '@/types';
import {
  applicationDetailsRoute,
  assignmentDetailsRoute,
  employerApplicationDetailsRoute,
  employerApplicationsRoute,
  employerJobDetailsRoute,
  employerNotificationsRoute,
  jobDetailsRoute,
  workerNotificationsRoute,
} from '@/utils/routing';

export interface NotificationPayload {
  notificationId?: string;
  type?: string;
  relatedJob?: string;
  relatedApplication?: string;
  relatedAssignment?: string;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Normalize arbitrary push `data` into a typed payload. Push payloads are
 * treated as IDs only — never as authoritative resource data.
 */
export function normalizeNotificationPayload(data: unknown): NotificationPayload {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const source = data as Record<string, unknown>;
  return {
    notificationId: stringOrUndefined(source.notificationId),
    type: stringOrUndefined(source.type),
    relatedJob: stringOrUndefined(source.relatedJob),
    relatedApplication: stringOrUndefined(source.relatedApplication),
    relatedAssignment: stringOrUndefined(source.relatedAssignment),
  };
}

/**
 * Resolve a notification payload to a route for the given role.
 * Falls back to the notifications screen when no related entity exists.
 */
export function resolveNotificationHref(payload: NotificationPayload, role: UserRole): Href {
  const { relatedApplication, relatedAssignment, relatedJob } = payload;

  if (role === 'worker') {
    if (relatedApplication) {
      return applicationDetailsRoute(relatedApplication);
    }
    if (relatedAssignment) {
      return assignmentDetailsRoute(relatedAssignment);
    }
    if (relatedJob) {
      return jobDetailsRoute(relatedJob);
    }
    return workerNotificationsRoute();
  }

  if (relatedApplication) {
    return employerApplicationDetailsRoute(relatedApplication);
  }
  if (relatedJob) {
    return employerJobDetailsRoute(relatedJob);
  }
  if (relatedAssignment) {
    return employerApplicationsRoute();
  }
  return employerNotificationsRoute();
}

/**
 * Handle a notification tap (from push). Marks the notification read
 * (best-effort) and navigates using the authenticated user's role.
 * Detail screens render their own loading/error states, so a missing or
 * deleted entity never crashes the app.
 */
export function handleNotificationPayload(payload: NotificationPayload): void {
  if (payload.notificationId) {
    void useNotificationStore.getState().markNotificationRead(payload.notificationId);
  }

  const { user } = useAuthStore.getState();
  if (!user) {
    return;
  }

  router.push(resolveNotificationHref(payload, user.role));
}