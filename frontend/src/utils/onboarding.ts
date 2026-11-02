import { STORAGE_KEYS, appStorage } from '@/lib/storage/storage';
import type { UserRole } from '@/types';
import { getRoleHomeRoute } from '@/utils/routing';

function onboardingKey(userId: string): string {
  return `${STORAGE_KEYS.ONBOARDING_COMPLETED}_${userId}`;
}

export function hasCompletedOnboarding(userId: string): boolean {
  return appStorage.get(onboardingKey(userId)) === 'true';
}

export function markOnboardingCompleted(userId: string): void {
  appStorage.set(onboardingKey(userId), 'true');
}

export function resolvePostAuthRoute(user: { id: string; role: UserRole }): string {
  if (!hasCompletedOnboarding(user.id)) {
    return '/onboarding';
  }
  return getRoleHomeRoute(user.role);
}
