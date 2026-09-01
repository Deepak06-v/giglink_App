import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validationResult } from "express-validator";

import { workerProfileUpdateValidation } from "./profile.validator.js";

/**
 * Run runnable validation chains against a request body. The final `validate`
 * middleware in the array is skipped; instead we inspect the validation result
 * directly (same data the middleware would return as HTTP 400).
 */
function runValidation(body) {
  const req = { body };
  const runnable = workerProfileUpdateValidation.slice(0, -1);
  return runnable.reduce(
    (promise, chain) => promise.then(() => chain.run(req)),
    Promise.resolve()
  ).then(() => {
    const errors = validationResult(req);
    return { valid: errors.isEmpty(), errors: errors.array() };
  });
}

function messages(result) {
  return result.errors.map((e) => e.msg);
}

describe("workerProfileUpdateValidation - weeklyAvailability", () => {
  it("accepts a valid single window", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 1, startTime: "09:00", endTime: "18:00" }],
    });
    assert.equal(result.valid, true);
  });

  it("accepts valid multiple days", async () => {
    const result = await runValidation({
      weeklyAvailability: [
        { day: 1, startTime: "09:00", endTime: "18:00" },
        { day: 2, startTime: "09:00", endTime: "18:00" },
        { day: 5, startTime: "10:00", endTime: "14:00" },
      ],
    });
    assert.equal(result.valid, true);
  });

  it("accepts multiple windows on the same day (multi-window-per-day)", async () => {
    const result = await runValidation({
      weeklyAvailability: [
        { day: 1, startTime: "09:00", endTime: "12:00" },
        { day: 1, startTime: "14:00", endTime: "18:00" },
        { day: 1, startTime: "19:00", endTime: "22:00" },
      ],
    });
    assert.equal(result.valid, true);
  });

  it("accepts multiple windows on the same day across several days", async () => {
    const result = await runValidation({
      weeklyAvailability: [
        { day: 0, startTime: "09:00", endTime: "12:00" },
        { day: 0, startTime: "18:00", endTime: "22:00" },
        { day: 3, startTime: "09:00", endTime: "18:00" },
        { day: 6, startTime: "10:00", endTime: "14:00" },
      ],
    });
    assert.equal(result.valid, true);
  });

  it("rejects exceeding the max windows per day cap", async () => {
    const result = await runValidation({
      weeklyAvailability: [
        { day: 1, startTime: "08:00", endTime: "09:00" },
        { day: 1, startTime: "09:00", endTime: "10:00" },
        { day: 1, startTime: "10:00", endTime: "11:00" },
        { day: 1, startTime: "11:00", endTime: "12:00" },
      ],
    });
    assert.equal(result.valid, false);
    assert.ok(messages(result).some((m) => m.toLowerCase().includes("window")));
  });

  it("accepts an empty array (clears schedule)", async () => {
    const result = await runValidation({ weeklyAvailability: [] });
    assert.equal(result.valid, true);
  });

  it("accepts an absent weeklyAvailability", async () => {
    const result = await runValidation({ bio: "hello" });
    assert.equal(result.valid, true);
  });

  it("accepts overnight windows (22:00 - 02:00)", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 4, startTime: "22:00", endTime: "02:00" }],
    });
    assert.equal(result.valid, true);
  });

  it("accepts two windows on the same day (was 'duplicate day' under single-window rule)", async () => {
    const result = await runValidation({
      weeklyAvailability: [
        { day: 1, startTime: "09:00", endTime: "18:00" },
        { day: 1, startTime: "19:00", endTime: "22:00" },
      ],
    });
    assert.equal(result.valid, true);
  });

  it("rejects a partial window (start without end)", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 1, startTime: "09:00" }],
    });
    assert.equal(result.valid, false);
    assert.ok(messages(result).some((m) => m.includes("both start and end")));
  });

  it("rejects a partial window (end without start)", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 1, endTime: "18:00" }],
    });
    assert.equal(result.valid, false);
    assert.ok(messages(result).some((m) => m.includes("both start and end")));
  });

  it("rejects an invalid day (out of range)", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 7, startTime: "09:00", endTime: "18:00" }],
    });
    assert.equal(result.valid, false);
  });

  it("rejects an invalid day (negative)", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: -1, startTime: "09:00", endTime: "18:00" }],
    });
    assert.equal(result.valid, false);
  });

  it("rejects a non-integer day", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 1.5, startTime: "09:00", endTime: "18:00" }],
    });
    assert.equal(result.valid, false);
  });

  it("rejects a malformed time 25:00", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 1, startTime: "25:00", endTime: "18:00" }],
    });
    assert.equal(result.valid, false);
  });

  it("rejects a malformed time 09:60", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 1, startTime: "09:60", endTime: "18:00" }],
    });
    assert.equal(result.valid, false);
  });

  it("rejects a malformed time 9:6", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 1, startTime: "9:6", endTime: "18:00" }],
    });
    assert.equal(result.valid, false);
  });

  it("rejects a malformed end time", async () => {
    const result = await runValidation({
      weeklyAvailability: [{ day: 1, startTime: "09:00", endTime: "25:00" }],
    });
    assert.equal(result.valid, false);
  });

  it("rejects a malformed object (entry is not an object)", async () => {
    const result = await runValidation({
      weeklyAvailability: ["not-an-object"],
    });
    assert.equal(result.valid, false);
  });

  it("rejects when weeklyAvailability is not an array", async () => {
    const result = await runValidation({ weeklyAvailability: "09:00" });
    assert.equal(result.valid, false);
  });
});
