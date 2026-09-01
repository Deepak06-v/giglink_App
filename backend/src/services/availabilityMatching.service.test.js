import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  matchWorkerToJobSchedule,
  MATCH,
  PARTIAL,
  CONFLICT,
  UNKNOWN,
} from "./availabilityMatching.service.js";

const weekdayOf = (dateStr) => new Date(dateStr).getDay();

const schedule = ({ startDate, endDate = startDate, startTime, endTime }) => ({
  startDate,
  endDate,
  startTime,
  endTime,
});

const win = (day, startTime, endTime) => ({ day, startTime, endTime });

describe("availabilityMatching.service", () => {
  describe("basic overlap", () => {
    it("exact overlap is a MATCH", () => {
      const d = "2026-09-02"; // weekday derived from date
      const wd = weekdayOf(d);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: d, startTime: "10:00", endTime: "14:00" }),
        [win(wd, "09:00", "18:00")]
      );
      assert.equal(result.status, MATCH);
      assert.deepEqual(result.matchedDays, [wd]);
      assert.equal(result.coveragePercent, 100);
    });

    it("identical window is a MATCH", () => {
      const d = "2026-09-02";
      const wd = weekdayOf(d);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: d, startTime: "10:00", endTime: "14:00" }),
        [win(wd, "10:00", "14:00")]
      );
      assert.equal(result.status, MATCH);
    });

    it("partial overlap is PARTIAL", () => {
      const d = "2026-09-02";
      const wd = weekdayOf(d);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: d, startTime: "10:00", endTime: "14:00" }),
        [win(wd, "09:00", "12:00")]
      );
      assert.equal(result.status, PARTIAL);
      assert.deepEqual(result.matchedDays, [wd]);
      assert.equal(result.coveragePercent, 100); // 1 of 1 day has coverage
    });

    it("no overlap is CONFLICT", () => {
      const d = "2026-09-02";
      const wd = weekdayOf(d);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: d, startTime: "10:00", endTime: "14:00" }),
        [win(wd, "18:00", "22:00")]
      );
      assert.equal(result.status, CONFLICT);
      assert.deepEqual(result.conflictingDays, [wd]);
      assert.equal(result.coveragePercent, 0);
    });

    it("worker wider than job is a MATCH", () => {
      const d = "2026-09-02";
      const wd = weekdayOf(d);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: d, startTime: "10:00", endTime: "14:00" }),
        [win(wd, "08:00", "20:00")]
      );
      assert.equal(result.status, MATCH);
    });

    it("worker narrower than job is PARTIAL (subset)", () => {
      const d = "2026-09-02";
      const wd = weekdayOf(d);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: d, startTime: "10:00", endTime: "14:00" }),
        [win(wd, "10:00", "12:00")]
      );
      assert.equal(result.status, PARTIAL);
    });
  });

  describe("weekday handling", () => {
    it("handles a Sunday-scheduled job", () => {
      // 2026-09-06 is a Sunday
      assert.equal(weekdayOf("2026-09-06"), 0);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-06", startTime: "10:00", endTime: "12:00" }),
        [win(0, "09:00", "13:00")]
      );
      assert.equal(result.status, MATCH);
      assert.deepEqual(result.matchedDays, [0]);
    });

    it("handles a Saturday-scheduled job", () => {
      assert.equal(weekdayOf("2026-09-05"), 6);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-05", startTime: "10:00", endTime: "12:00" }),
        [win(6, "09:00", "13:00")]
      );
      assert.equal(result.status, MATCH);
    });

    it("matches a date range crossing Sunday", () => {
      // Fri 2026-09-04 .. Sun 2026-09-06
      assert.equal(weekdayOf("2026-09-04"), 5);
      const result = matchWorkerToJobSchedule(
        schedule({
          startDate: "2026-09-04",
          endDate: "2026-09-06",
          startTime: "10:00",
          endTime: "12:00",
        }),
        [win(5, "09:00", "13:00"), win(0, "09:00", "13:00")]
      );
      assert.equal(result.status, PARTIAL); // Saturday (6) not covered
      assert.deepEqual(result.matchedDays.sort(), [0, 5]);
      assert.deepEqual(result.conflictingDays, [6]);
      assert.equal(result.coveragePercent, Math.round((2 / 3) * 100));
    });
  });

  describe("time edge cases", () => {
    it("boundary touching is not an overlap (CONFLICT)", () => {
      const d = "2026-09-02";
      const wd = weekdayOf(d);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: d, startTime: "10:00", endTime: "12:00" }),
        [win(wd, "12:00", "14:00")]
      );
      assert.equal(result.status, CONFLICT);
    });

    it("overnight job matched by overnight worker is a MATCH", () => {
      // Worker Fri 22:00-02:00; Job Fri 23:00-01:00
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-04", startTime: "23:00", endTime: "01:00" }),
        [win(5, "22:00", "02:00")]
      );
      assert.equal(result.status, MATCH);
    });

    it("overnight job covered by an overnight worker window is a MATCH", () => {
      // Job Sat 23:00-01:00 (overnight into Sunday); worker covers the full
      // evening + early-morning window via an overnight window.
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-05", startTime: "23:00", endTime: "01:00" }),
        [win(6, "22:00", "02:00")]
      );
      assert.equal(result.status, MATCH);
    });

    it("overnight job with only partial evening coverage is PARTIAL", () => {
      // Worker covers most of the evening (23:00-23:59) and all of the early
      // morning (00:00-01:00), but not the final minute before midnight.
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-05", startTime: "23:00", endTime: "01:00" }),
        [win(6, "23:00", "23:59"), win(0, "00:00", "01:30")]
      );
      assert.equal(result.status, PARTIAL);
      assert.deepEqual(result.matchedDays, [6]);
      assert.equal(result.coveragePercent, 100); // 1 of 1 scheduled day has coverage
    });

    it("overnight job with no overnight coverage is a CONFLICT", () => {
      // Job Fri 23:00-01:00, worker only Fri morning
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-04", startTime: "23:00", endTime: "01:00" }),
        [win(5, "09:00", "12:00")]
      );
      assert.equal(result.status, CONFLICT);
    });

    it("overnight worker wraps to next weekday for a morning job", () => {
      // Worker Fri 22:00-02:00 => available early Saturday; job Sat 00:30-01:30
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-05", startTime: "00:30", endTime: "01:30" }),
        [win(5, "22:00", "02:00")]
      );
      assert.equal(result.status, MATCH);
    });
  });

  describe("multi-day jobs", () => {
    it("partial when a mid-range day is off", () => {
      // Mon-Fri 2026-09-07..2026-09-11, Thursday off
      const result = matchWorkerToJobSchedule(
        schedule({
          startDate: "2026-09-07",
          endDate: "2026-09-11",
          startTime: "10:00",
          endTime: "14:00",
        }),
        [win(1, "10:00", "14:00"), win(2, "10:00", "14:00"), win(3, "10:00", "14:00"), win(5, "10:00", "14:00")]
      );
      assert.equal(result.status, PARTIAL);
      assert.deepEqual(result.matchedDays.sort(), [1, 2, 3, 5]);
      assert.deepEqual(result.conflictingDays, [4]);
      assert.equal(result.coveragePercent, 80);
    });

    it("MATCH when every scheduled day is covered", () => {
      const result = matchWorkerToJobSchedule(
        schedule({
          startDate: "2026-09-07",
          endDate: "2026-09-11",
          startTime: "10:00",
          endTime: "14:00",
        }),
        [win(1, "10:00", "14:00"), win(2, "10:00", "14:00"), win(3, "10:00", "14:00"), win(4, "10:00", "14:00"), win(5, "10:00", "14:00")]
      );
      assert.equal(result.status, MATCH);
      assert.equal(result.coveragePercent, 100);
    });

    it("CONFLICT when no scheduled day is covered", () => {
      const result = matchWorkerToJobSchedule(
        schedule({
          startDate: "2026-09-07",
          endDate: "2026-09-11",
          startTime: "10:00",
          endTime: "14:00",
        }),
        [win(6, "10:00", "14:00")]
      );
      assert.equal(result.status, CONFLICT);
      assert.equal(result.coveragePercent, 0);
    });
  });

  describe("multi-window-per-day", () => {
    it("matches a job covered by one of two windows on the same day", () => {
      // Worker has morning + evening windows same weekday; job falls in evening.
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-02", startTime: "19:00", endTime: "22:00" }),
        [win(3, "09:00", "12:00"), win(3, "18:00", "23:00")]
      );
      assert.equal(result.status, MATCH);
      assert.equal(result.coveragePercent, 100);
    });

    it("sums overlap across multiple same-day windows (gap -> PARTIAL)", () => {
      // Job 10:00-16:00; worker covers 10:00-12:00 and 14:00-16:00, leaving a gap.
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-02", startTime: "10:00", endTime: "16:00" }),
        [win(3, "10:00", "12:00"), win(3, "14:00", "16:00")]
      );
      assert.equal(result.status, PARTIAL);
      assert.equal(result.coveragePercent, 100); // 1 of 1 day has some coverage
    });

    it("matches when two same-day windows together fully cover the job", () => {
      // Job 10:00-16:00; windows cover 10:00-13:00 and 13:00-16:00 (no gap).
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-02", startTime: "10:00", endTime: "16:00" }),
        [win(3, "10:00", "13:00"), win(3, "13:00", "16:00")]
      );
      assert.equal(result.status, MATCH);
      assert.equal(result.coveragePercent, 100);
    });

    it("is CONFLICT when no same-day window overlaps the job", () => {
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-02", startTime: "10:00", endTime: "12:00" }),
        [win(3, "13:00", "14:00"), win(3, "18:00", "22:00")]
      );
      assert.equal(result.status, CONFLICT);
      assert.equal(result.coveragePercent, 0);
    });
  });

  describe("unknown / missing schedule", () => {
    it("empty array is UNKNOWN", () => {
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-02", startTime: "10:00", endTime: "14:00" }),
        []
      );
      assert.equal(result.status, UNKNOWN);
      assert.equal(result.coveragePercent, 0);
    });

    it("undefined weeklyAvailability is UNKNOWN", () => {
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-02", startTime: "10:00", endTime: "14:00" }),
        undefined
      );
      assert.equal(result.status, UNKNOWN);
    });
  });

  describe("data quality", () => {
    it("dedupes/ignores duplicate days without crashing", () => {
      const d = "2026-09-02";
      const wd = weekdayOf(d);
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: d, startTime: "10:00", endTime: "14:00" }),
        [win(wd, "09:00", "18:00"), win(wd, "09:00", "18:00")]
      );
      assert.equal(result.status, MATCH);
    });

    it("tolerates malformed entries", () => {
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-02", startTime: "10:00", endTime: "14:00" }),
        [{ day: 99, startTime: "09:00", endTime: "18:00" }, null, { day: 1, startTime: "bad", endTime: "18:00" }]
      );
      // no valid window -> treated as UNKNOWN (nothing configured)
      assert.equal(result.status, UNKNOWN);
    });

    it("treats start>end as overnight per convention", () => {
      // job 22:00-02:00 is overnight, not an error
      const result = matchWorkerToJobSchedule(
        schedule({ startDate: "2026-09-04", startTime: "22:00", endTime: "02:00" }),
        [win(5, "21:00", "03:00")]
      );
      assert.equal(result.status, MATCH);
    });
  });
});
