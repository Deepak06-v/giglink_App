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

describe("workerProfileUpdateValidation - availability", () => {
  it("accepts AVAILABLE", async () => {
    const result = await runValidation({ availability: "AVAILABLE" });
    assert.equal(result.valid, true);
  });

  it("accepts UNAVAILABLE", async () => {
    const result = await runValidation({ availability: "UNAVAILABLE" });
    assert.equal(result.valid, true);
  });

  it("rejects LIMITED (legacy three-state availability was removed)", async () => {
    const result = await runValidation({ availability: "LIMITED" });
    assert.equal(result.valid, false);
    assert.ok(messages(result).some((m) => m.includes("AVAILABLE")));
  });

  it("rejects a bogus availability value", async () => {
    const result = await runValidation({ availability: "SOMETIMES" });
    assert.equal(result.valid, false);
  });

  it("accepts a profile update without availability (partial update)", async () => {
    const result = await runValidation({ bio: "hello" });
    assert.equal(result.valid, true);
  });

  it("no longer validates weeklyAvailability as an accepted product field", async () => {
    // The weekly-work-schedule concept has been removed from the product. Sending
    // it no longer causes a validation error (it is simply ignored by storage),
    // so a worker can never be required to configure working hours.
    const result = await runValidation({
      weeklyAvailability: [{ day: 1, startTime: "09:00", endTime: "18:00" }],
    });
    assert.equal(result.valid, true);
  });
});
