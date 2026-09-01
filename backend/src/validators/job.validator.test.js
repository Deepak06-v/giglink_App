import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validationResult } from "express-validator";

import { listJobsQueryValidation } from "./job.validator.js";

/**
 * Run the query-param validation chains against a request query. The final
 * `validate` middleware is skipped; we inspect the validation result directly.
 */
function runQueryValidation(query) {
  const req = { query };
  const runnable = listJobsQueryValidation.slice(0, -1);
  return runnable
    .reduce((promise, chain) => promise.then(() => chain.run(req)), Promise.resolve())
    .then(() => {
      const errors = validationResult(req);
      return { valid: errors.isEmpty(), errors: errors.array() };
    });
}

describe("listJobsQueryValidation", () => {
  it("accepts best_match sort", async () => {
    const result = await runQueryValidation({ sort: "best_match" });
    assert.equal(result.valid, true);
  });

  it("accepts availableOnly true/false", async () => {
    const a = await runQueryValidation({ availableOnly: "true" });
    const b = await runQueryValidation({ availableOnly: "false" });
    assert.equal(a.valid, true);
    assert.equal(b.valid, true);
  });

  it("rejects an invalid sort option", async () => {
    const result = await runQueryValidation({ sort: "randomness" });
    assert.equal(result.valid, false);
  });

  it("rejects a non-boolean availableOnly", async () => {
    const result = await runQueryValidation({ availableOnly: "yes" });
    assert.equal(result.valid, false);
  });

  it("accepts best_match alongside existing filters", async () => {
    const result = await runQueryValidation({
      sort: "best_match",
      category: "CLEANING",
      availableOnly: "true",
      page: "1",
      limit: "50",
    });
    assert.equal(result.valid, true);
  });
});
