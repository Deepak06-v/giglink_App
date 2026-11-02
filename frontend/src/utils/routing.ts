import type { UserRole } from '@/types';
import type { PendingIntent } from '@/types/auth';

export function getRoleHomeRoute(role: UserRole): string {
  return role === 'worker' ? '/worker/jobs' : '/employer/dashboard';
}

export function pendingIntentMatchesRole(intent: PendingIntent, role: UserRole): boolean {
  if (intent.action === 'apply') {
    return role === 'worker';
  }
  return role === 'employer';
}

export function resolvePendingIntentRoute(intent: PendingIntent, role: UserRole): string | null {
  if (!pendingIntentMatchesRole(intent, role)) {
    return null;
  }
  if (intent.action === 'apply') {
    return jobDetailsRoute(intent.jobId);
  }
  return employerCreateJobRoute();
}

export function jobDetailsRoute(jobId: string): string {
  return `/worker/jobs/${jobId}`;
}

export function guestJobDetailsRoute(jobId: string): string {
  return `/browse/jobs/${jobId}`;
}

export function applicationDetailsRoute(applicationId: string): string {
  return `/worker/applications/${applicationId}`;
}

export function assignmentDetailsRoute(assignmentId: string): string {
  return `/worker/assignments/${assignmentId}`;
}

export function workerNotificationsRoute(): string {
  return '/worker/notifications';
}

export function employerJobDetailsRoute(jobId: string): string {
  return `/employer/jobs/${jobId}`;
}

export function employerEditJobRoute(jobId: string): string {
  return `/employer/jobs/${jobId}/edit`;
}

export function employerCreateJobRoute(): string {
  return '/employer/jobs/create';
}

export function employerApplicationDetailsRoute(applicationId: string): string {
  return `/employer/applications/${applicationId}`;
}

export function employerApplicationsRoute(): string {
  return '/employer/applications';
}

export function employerNotificationsRoute(): string {
  return '/employer/notifications';
}

export function employerEditProfileRoute(): string {
  return '/employer/profile/edit';
}

export function employerMarketplaceProfileRoute(userId: string): string {
  return `/profile/${userId}`;
}

export function workerMarketplaceProfileRoute(userId: string): string {
  return `/profile/${userId}`;
}

export function workerEditProfileRoute(): string {
  return '/worker/profile/edit';
}

export function workerApplicationsTabRoute(): string {
  return '/worker/applications';
}

export function workerAssignmentsTabRoute(): string {
  return '/worker/assignments';
}

export function workerReviewSubmitRoute(jobId: string): string {
  return `/worker/reviews/submit/${jobId}`;
}

export function employerReviewSubmitRoute(jobId: string, workerId: string, workerName: string): string {
  return `/employer/reviews/submit/${jobId}?workerId=${encodeURIComponent(workerId)}&workerName=${encodeURIComponent(workerName)}`;
}

export function workerReviewsListRoute(userId: string): string {
  return `/reviews/${userId}`;
}

export function employerReviewsListRoute(userId: string): string {
  return `/reviews/${userId}`;
}
