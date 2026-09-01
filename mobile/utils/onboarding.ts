import type { Href } from 'expo-router';

import { SECURE_STORAGE_KEYS, secureStorage } from '@/lib/storage/secureStorage';
import type { UserRole } from '@/types';
import { getRoleHomeRoute } from '@/utils/routing';

const ONBOARDING_PREFIX = SECURE_STORAGE_KEYS.ONBOARDING_COMPLETED;

function onboardingKey(userId: string): string {
  return `${ONBOARDING_PREFIX}_${userId}`;
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const value = await secureStorage.get(onboardingKey(userId));
  return value === 'true';
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  await secureStorage.set(onboardingKey(userId), 'true');
}

/**
 * Resolves where an authenticated user should land after signing in.
 *
 * A brand-new account (which has never completed onboarding) is routed to the
 * onboarding flow; returning users go straight to their role home.
 *
 * Per-user persistence keeps the flag stable across sessions without any
 * backend state — existing accounts never see onboarding again.
 */
export async function resolvePostAuthRoute(user: {
  id: string;
  role: UserRole;
}): Promise<Href> {
  const onboarded = await hasCompletedOnboarding(user.id);
  if (!onboarded) {
    return { pathname: '/(onboarding)' };
  }
  return getRoleHomeRoute(user.role);
}
