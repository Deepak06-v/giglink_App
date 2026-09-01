import { translate, type TranslationKey } from '@/lib/i18n';
import { formatTime12h } from '@/utils/formatJob';
import type {
  WeekdayIndex,
  WeeklyAvailabilityWindow,
} from '@/types';

export const WEEKDAY_KEYS: Record<WeekdayIndex, TranslationKey> = {
  0: 'day.sun',
  1: 'day.mon',
  2: 'day.tue',
  3: 'day.wed',
  4: 'day.thu',
  5: 'day.fri',
  6: 'day.sat',
};

const WEEKDAY_ORDER: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];

function dayLabel(day: WeekdayIndex): string {
  return translate(WEEKDAY_KEYS[day]);
}

function windowRange(window: WeeklyAvailabilityWindow): string {
  return `${formatTime12h(window.startTime)}–${formatTime12h(window.endTime)}`;
}

/**
 * Returns a short, localized label for a single week day, e.g. 'Mon'.
 */
export function formatWeekday(day: WeekdayIndex): string {
  return dayLabel(day);
}

/**
 * Description of a single availability window, e.g. '9:00 AM–6:00 PM'.
 */
export function formatAvailabilityWindow(window: WeeklyAvailabilityWindow): string {
  return `${dayLabel(window.day)} ${windowRange(window)}`;
}

/**
 * Group schedule windows into compact display lines. Days with a single window
 * are merged when consecutive days share the same window; a day with multiple
 * windows renders each window on its own line. Examples:
 *   [{1,09:00,18:00},{2,09:00,18:00},{5,10:00,14:00}]
 *   -> ['Mon–Fri · 9:00 AM–6:00 PM', 'Sat · 10:00 AM–2:00 PM']
 *   [{1,09:00,12:00},{1,14:00,18:00}]
 *   -> ['Mon · 9:00 AM–12:00 PM', 'Mon · 2:00 PM–6:00 PM']
 *
 * The provided array is treated as a full weekly schedule (empty items ignored).
 */
export function summarizeWeeklyAvailability(
  windows: WeeklyAvailabilityWindow[] | undefined,
): string[] {
  if (!windows || windows.length === 0) {
    return [];
  }

  const byDay = new Map<WeekdayIndex, WeeklyAvailabilityWindow[]>();
  for (const window of windows) {
    if (
      window &&
      typeof window.day === 'number' &&
      window.day >= 0 &&
      window.day <= 6
    ) {
      const day = window.day as WeekdayIndex;
      const list = byDay.get(day) || [];
      list.push(window);
      byDay.set(day, list);
    }
  }

  if (byDay.size === 0) {
    return [];
  }

  // One window per day -> merge consecutive matching days (existing behaviour).
  let allSingle = true;
  for (const [day, list] of byDay) {
    if (list.length !== 1) {
      allSingle = false;
    }
  }

  if (allSingle) {
    const lines: string[] = [];
    let i = 0;
    while (i < WEEKDAY_ORDER.length) {
      const day = WEEKDAY_ORDER[i];
      const list = byDay.get(day);
      if (!list || list.length !== 1) {
        i += 1;
        continue;
      }
      const window = list[0];

      const groupDays: WeekdayIndex[] = [day];
      let j = i + 1;
      while (j < WEEKDAY_ORDER.length) {
        const nextDay = WEEKDAY_ORDER[j];
        const nextList = byDay.get(nextDay);
        if (nextList && nextList.length === 1) {
          const nextWindow = nextList[0];
          if (
            nextWindow.startTime === window.startTime &&
            nextWindow.endTime === window.endTime
          ) {
            groupDays.push(nextDay);
            j += 1;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      const dayNames = groupDays.map(dayLabel);
      const dayText =
        groupDays.length === 1
          ? dayNames[0]
          : `${dayNames[0]}–${dayNames[groupDays.length - 1]}`;

      lines.push(`${dayText} · ${windowRange(window)}`);
      i = j;
    }
    return lines;
  }

  // Multiple windows on at least one day -> render each window explicitly.
  const lines: string[] = [];
  for (const day of WEEKDAY_ORDER) {
    const list = byDay.get(day);
    if (!list) {
      continue;
    }
    for (const window of list) {
      lines.push(`${dayLabel(day)} · ${windowRange(window)}`);
    }
  }
  return lines;
}

/**
 * Compact single-line summary (best effort) used in tight spaces. Falls back to
 * 'No weekly hours set' when there is no schedule.
 */
export function availabilitySummary(
  windows: WeeklyAvailabilityWindow[] | undefined,
): string {
  const lines = summarizeWeeklyAvailability(windows);
  if (lines.length === 0) {
    return translate('workingHours.none');
  }
  return lines.join(' · ');
}
