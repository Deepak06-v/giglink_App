import type { BadgeVariant } from '@/components/ui/Badge';
import type { TranslationKey } from '@/lib/i18n';
import type { AvailabilityMatch, AvailabilityMatchStatus } from '@/types';

export interface AvailabilityMatchBadge {
  labelKey: TranslationKey;
  variant: BadgeVariant;
}

const BADGE_BY_STATUS: Partial<Record<AvailabilityMatchStatus, AvailabilityMatchBadge>> = {
  MATCH: { labelKey: 'availabilityMatch.match', variant: 'success' },
  PARTIAL: { labelKey: 'availabilityMatch.partial', variant: 'warning' },
  CONFLICT: { labelKey: 'availabilityMatch.conflict', variant: 'error' },
};

/**
 * Maps a backend availability-match result to the badge to render. Returns null
 * when there is nothing to surface (no configured schedule / unknown status) so
 * callers can omit it entirely.
 */
export function availabilityMatchBadge(
  match: AvailabilityMatch | null | undefined,
): AvailabilityMatchBadge | null {
  if (!match) {
    return null;
  }
  return BADGE_BY_STATUS[match.status] ?? null;
}
