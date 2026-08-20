import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizePhone } from "./phone.js";

describe("normalizePhone", () => {
  it("normalizes an Indian national number to E.164 when a country is provided", () => {
    assert.equal(normalizePhone("98765 43210", "IN"), "+919876543210");
  });

  it("normalizes a fully-qualified E.164 number without a country", () => {
    assert.equal(normalizePhone("+919876543210"), "+919876543210");
  });

  it("accepts a US national number with country", () => {
    assert.equal(normalizePhone("(415) 555-2671", "US"), "+14155552671");
  });

  it("rejects invalid numbers", () => {
    assert.equal(normalizePhone("123", "IN"), null);
  });

  it("rejects a national number when no country is provided", () => {
    assert.equal(normalizePhone("9876543210"), null);
  });

  it("rejects empty input", () => {
    assert.equal(normalizePhone("   "), null);
    assert.equal(normalizePhone("", "IN"), null);
  });

  it("rejects non-string input", () => {
    assert.equal(normalizePhone(9876543210, "IN"), null);
  });
});