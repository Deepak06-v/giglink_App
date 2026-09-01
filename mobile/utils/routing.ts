import type { Href } from 'expo-router';
import type { UserRole } from '@/types';
import type { PendingIntent } from '@/types/auth';

export function getRoleHomeRoute(role: UserRole): Href {
  return role === 'worker' ? '/(worker)/(tabs)' : '/(employer)/(tabs)';
}

export function pendingIntentMatchesRole(intent: PendingIntent, role: UserRole): boolean {
  if (intent.action === 'apply') {
    return role === 'worker';
  }
  return role === 'employer';
}

export function resolvePendingIntentRoute(intent: PendingIntent, role: UserRole): Href | null {
  if (!pendingIntentMatchesRole(intent, role)) {
    return null;
  }
  if (intent.action === 'apply') {
    return jobDetailsRoute(intent.jobId);
  }
  return employerCreateJobRoute();
}

export function jobDetailsRoute(jobId: string): Href {
  return { pathname: '/(worker)/jobs/[jobId]', params: { jobId } };
}

export function guestJobDetailsRoute(jobId: string): Href {
  return { pathname: '/(public)/jobs/[jobId]', params: { jobId } };
}

export function applicationDetailsRoute(applicationId: string): Href {
  return { pathname: '/(worker)/applications/[applicationId]', params: { applicationId } };
}

export function assignmentDetailsRoute(assignmentId: string): Href {
  return { pathname: '/(worker)/assignments/[assignmentId]', params: { assignmentId } };
}

export function workerNotificationsRoute(): Href {
  return '/(worker)/notifications';
}

export function employerJobDetailsRoute(jobId: string): Href {
  return { pathname: '/(employer)/jobs/[jobId]', params: { jobId } };
}

export function employerEditJobRoute(jobId: string): Href {
  return { pathname: '/(employer)/jobs/edit/[jobId]', params: { jobId } };
}

export function employerCreateJobRoute(): Href {
  return '/(employer)/jobs/create';
}

export function employerApplicationDetailsRoute(applicationId: string): Href {
  return { pathname: '/(employer)/applications/[applicationId]', params: { applicationId } };
}

export function employerApplicationsRoute(): Href {
  return '/(employer)/(tabs)/applications';
}

export function employerNotificationsRoute(): Href {
  return '/(employer)/notifications';
}

export function employerEditProfileRoute(): Href {
  return '/(employer)/profile/edit';
}

export function employerMarketplaceProfileRoute(userId: string): Href {
  return { pathname: '/(employer)/profile/[userId]', params: { userId } };
}

export function workerMarketplaceProfileRoute(userId: string): Href {
  return { pathname: '/(worker)/profile/[userId]', params: { userId } };
}

export function workerEditProfileRoute(): Href {
  return '/(worker)/profile/edit';
}

export function workerAvailabilityRoute(): Href {
  return '/(worker)/profile/availability';
}

export function workerApplicationsTabRoute(): Href {
  return '/(worker)/(tabs)/applications';
}

export function workerAssignmentsTabRoute(): Href {
  return '/(worker)/(tabs)/assignments';
}