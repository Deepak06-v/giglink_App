/**
 * Availability matching service.
 *
 * Pure, database-free functions that determine whether a worker's recurring
 * weekly availability overlaps a job's scheduled calendar-day/window.
 *
 * Concepts (see Phase 7 investigation report):
 *  - Job schedule: a date range (startDate -> endDate) that repeats the same
 *    daily time window (startTime -> endTime) each calendar day.
 *  - Worker weeklyAvailability: one recurring window per weekday
 *    (day: 0=Sunday ... 6=Saturday), each with a local wall-clock window.
 *  - Weekday numbering matches JS `Date.getDay()`: 0=Sunday ... 6=Saturday.
 *
 * Status semantics:
 *  - MATCH    every scheduled job day is fully covered by the worker's schedule
 *  - PARTIAL  a configured schedule covers some (not all) scheduled days/time
 *  - CONFLICT a configured schedule exists but covers none of the job's time
 *  - UNKNOWN  the worker has no configured weeklyAvailability
 *
 * Overnight handling: a window whose end <= start (e.g. 22:00 -> 02:00) is
 * "unwrapped" across the midnight boundary. The day a job is anchored to is
 * matched by testing both the evening portion on that day and the early
 * morning portion on the following day.
 *
 * No timezone conversion is performed; all times are local wall-clock.
 */

import {
  timeToMinutes,
  calculateNumberOfDays,
} from "../utils/schedule.js";

export const MATCH = "MATCH";
export const PARTIAL = "PARTIAL";
export const CONFLICT = "CONFLICT";
export const UNKNOWN = "UNKNOWN";

const MINUTES_PER_DAY = 1440;

/**
 * Build a weekday -> availability-intervals map from weeklyAvailability.
 *
 * Each window is a [startMinute, endMinute] interval in the domain of a single
 * day (0..1440). Overnight windows are split into an evening portion on their
 * own day and an early-morning tail on the following weekday.
 *
 * @param {Array<{day:number,startTime:string,endTime:string}>|undefined} weeklyAvailability
 * @returns {Map<number, Array<[number, number]>>} day (0..6) -> intervals
 */
const buildAvailabilityMap = (weeklyAvailability) => {
  const map = new Map();
  if (!Array.isArray(weeklyAvailability) || weeklyAvailability.length === 0) {
    return map;
  }

  const addInterval = (day, start, end) => {
    if (start >= end) {
      return; // zero-length or malformed, ignore
    }
    const clampedStart = Math.min(Math.max(start, 0), MINUTES_PER_DAY);
    const clampedEnd = Math.min(Math.max(end, 0), MINUTES_PER_DAY);
    if (clampedStart >= clampedEnd) {
      return;
    }
    const dayKey = ((day % 7) + 7) % 7;
    const list = map.get(dayKey) || [];
    list.push([clampedStart, clampedEnd]);
    map.set(dayKey, list);
  };

  for (const window of weeklyAvailability) {
    if (
      !window ||
      typeof window.day !== "number" ||
      typeof window.startTime !== "string" ||
      typeof window.endTime !== "string"
    ) {
      continue; // tolerate malformed entries
    }
    const day = Math.floor(window.day);
    if (day < 0 || day > 6) {
      continue;
    }
    let start;
    let end;
    try {
      start = timeToMinutes(window.startTime);
      end = timeToMinutes(window.endTime);
    } catch {
      continue; // invalid time format, ignore this window
    }
    if (end <= start) {
      // Overnight worker window: evening portion on `day`, tail on next weekday.
      addInterval(day, start, MINUTES_PER_DAY);
      addInterval(day + 1, 0, end);
    } else {
      addInterval(day, start, end);
    }
  }

  return map;
};

/**
 * Compute the overlap (in minutes) between a single day's absolute job segment
 * [segStart, segEnd] within day-frame `weekday` and the worker's availability
 * intervals registered on that weekday.
 *
 * @param {Map<number, Array<[number, number]>>} availabilityByDay
 * @param {number} weekday
 * @param {number} segStart
 * @param {number} segEnd
 * @returns {number} overlap minutes
 */
const segmentOverlap = (availabilityByDay, weekday, segStart, segEnd) => {
  const intervals = availabilityByDay.get(((weekday % 7) + 7) % 7);
  if (!intervals || intervals.length === 0) {
    return 0;
  }
  let overlap = 0;
  for (const [wStart, wEnd] of intervals) {
    const start = Math.max(segStart, wStart);
    const end = Math.min(segEnd, wEnd);
    if (end > start) {
      overlap += end - start;
    }
  }
  return overlap;
};

/**
 * Determine, for a scheduled calendar day, the coverage segments of the job
 * window. A non-overnight window is a single segment; an overnight window is
 * split into evening (day 0..1440) and early-morning (next day 0..end).
 *
 * @param {number} weekday 0..6 of the scheduled day
 * @param {number} jobStart minutes since midnight
 * @param {number} jobEnd minutes since midnight
 * @returns {Array<{weekday:number,start:number,end:number,mins:number}>}
 */
const buildJobDaySegments = (weekday, jobStart, jobEnd) => {
  if (jobEnd > jobStart) {
    return [
      {
        weekday,
        start: jobStart,
        end: jobEnd,
        mins: jobEnd - jobStart,
      },
    ];
  }
  // Overnight job window anchored at `weekday`.
  return [
    {
      weekday,
      start: jobStart,
      end: MINUTES_PER_DAY,
      mins: MINUTES_PER_DAY - jobStart,
    },
    {
      weekday: weekday + 1,
      start: 0,
      end: jobEnd,
      mins: jobEnd,
    },
  ];
};

/**
 * Match a worker's weeklyAvailability against a job's schedule.
 *
 * @param {object} jobSchedule { startDate, endDate, startTime, endTime }
 * @param {Array<{day:number,startTime:string,endTime:string}>|undefined} weeklyAvailability
 * @returns {{status:string, matchedDays:number[], conflictingDays:number[], coveragePercent:number}}
 */
export const matchWorkerToJobSchedule = (jobSchedule, weeklyAvailability) => {
  const UNKNOWN_RESULT = {
    status: UNKNOWN,
    matchedDays: [],
    conflictingDays: [],
    coveragePercent: 0,
  };

  const availabilityByDay = buildAvailabilityMap(weeklyAvailability);
  if (availabilityByDay.size === 0) {
    return UNKNOWN_RESULT;
  }

  if (
    !jobSchedule ||
    !jobSchedule.startDate ||
    !jobSchedule.endDate ||
    !jobSchedule.startTime ||
    !jobSchedule.endTime
  ) {
    return UNKNOWN_RESULT;
  }

  let jobStart;
  let jobEnd;
  let totalDays;
  try {
    jobStart = timeToMinutes(jobSchedule.startTime);
    jobEnd = timeToMinutes(jobSchedule.endTime);
    totalDays = calculateNumberOfDays(jobSchedule.startDate, jobSchedule.endDate);
  } catch {
    return UNKNOWN_RESULT;
  }

  const startDate = new Date(jobSchedule.startDate);
  const matchedWeekdays = new Set();
  const conflictingWeekdays = new Set();
  let fullyCoveredCount = 0;
  let anyCoverageCount = 0;

  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const weekday = date.getDay();

    const segments = buildJobDaySegments(weekday, jobStart, jobEnd);
    const jobMins = segments.reduce((sum, seg) => sum + seg.mins, 0);
    let overlap = 0;
    for (const seg of segments) {
      overlap += segmentOverlap(availabilityByDay, seg.weekday, seg.start, seg.end);
    }

    if (overlap > 0) {
      anyCoverageCount += 1;
      matchedWeekdays.add(weekday);
      if (overlap >= jobMins) {
        fullyCoveredCount += 1;
      }
    } else {
      conflictingWeekdays.add(weekday);
    }
  }

  const matchedDays = Array.from(matchedWeekdays);
  const conflictingDays = Array.from(conflictingWeekdays);

  if (anyCoverageCount === 0) {
    return {
      status: CONFLICT,
      matchedDays,
      conflictingDays,
      coveragePercent: 0,
    };
  }

  if (fullyCoveredCount === totalDays) {
    return {
      status: MATCH,
      matchedDays,
      conflictingDays,
      coveragePercent: 100,
    };
  }

  return {
    status: PARTIAL,
    matchedDays,
    conflictingDays,
    coveragePercent: Math.round((anyCoverageCount / totalDays) * 100),
  };
};

/**
 * Match a worker's weeklyAvailability against a full job document.
 *
 * @param {object} job - Job with a `schedule` sub-document
 * @param {Array<{day:number,startTime:string,endTime:string}>|undefined} weeklyAvailability
 * @returns {{status:string, matchedDays:number[], conflictingDays:number[], coveragePercent:number}}
 */
export const matchWorkerToJob = (job, weeklyAvailability) => {
  if (!job || !job.schedule) {
    return {
      status: UNKNOWN,
      matchedDays: [],
      conflictingDays: [],
      coveragePercent: 0,
    };
  }
  return matchWorkerToJobSchedule(job.schedule, weeklyAvailability);
};
