import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import bcrypt from "bcryptjs";
import PhoneOtp from "../models/PhoneOtp.js";
import {
  generateOtp,
  issueOtp,
  setSmsSender,
  verifyOtp,
} from "./otp.service.js";

const PHONE = "+919876543210";

const activeDoc = (overrides = {}) => ({
  _id: "o1",
  phone: PHONE,
  hashedCode: "hashed:123456",
  attempts: 0,
  consumed: false,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  lastResentAt: new Date(),
  resendCount: 0,
  save: async function () {
    return this;
  },
  ...overrides,
});

describe("otp.service", () => {
  beforeEach(() => {
    mock.restoreAll();
    setSmsSender(async () => ({ dev: true }));
    process.env.OTP_TTL_MINUTES = "5";
    process.env.OTP_MAX_ATTEMPTS = "5";
    process.env.OTP_RESEND_COOLDOWN_SECONDS = "30";
    process.env.OTP_MAX_RESENDS = "3";
  });

  afterEach(() => {
    mock.restoreAll();
    delete process.env.OTP_TTL_MINUTES;
    delete process.env.OTP_MAX_ATTEMPTS;
    delete process.env.OTP_RESEND_COOLDOWN_SECONDS;
    delete process.env.OTP_MAX_RESENDS;
  });

  it("generates a 6-digit numeric OTP", () => {
    const code = generateOtp();
    assert.match(code, /^\d{6}$/);
  });

  it("stores a hashed OTP and delivers the plaintext only via SMS", async () => {
    let capturedCode = null;
    const created = [];
    setSmsSender(async (phone, code) => {
      capturedCode = code;
      return { dev: true };
    });
    mock.method(PhoneOtp, "findOne", async () => null);
    mock.method(bcrypt, "hash", async (value) => `hashed:${value}`);
    mock.method(PhoneOtp, "create", async (data) => {
      created.push(data);
      return { _id: "o1", ...data };
    });

    const result = await issueOtp({ phone: PHONE, ipHash: "ip1" });

    assert.ok(result.expiresAt, "returns expiry for the client countdown");
    assert.equal(created.length, 1);
    assert.equal(created[0].phone, PHONE);
    assert.equal(created[0].hashedCode, "hashed:" + capturedCode);
    assert.notEqual(created[0].hashedCode, capturedCode, "plaintext is never stored");
    assert.match(capturedCode, /^\d{6}$/);
  });

  it("hashes the OTP with bcrypt so it is not recoverable as plaintext", async () => {
    let capturedCode = null;
    const created = [];
    setSmsSender(async (phone, code) => {
      capturedCode = code;
      return { dev: true };
    });
    mock.method(PhoneOtp, "findOne", async () => null);
    mock.method(PhoneOtp, "create", async (data) => {
      created.push(data);
      return { _id: "o1", ...data };
    });

    await issueOtp({ phone: PHONE });

    assert.ok(created[0].hashedCode.startsWith("$2"), "bcrypt hash prefix");
    assert.notEqual(created[0].hashedCode, capturedCode);
    assert.equal(await bcrypt.compare(capturedCode, created[0].hashedCode), true);
  });

  it("rejects a resend within the cooldown window", async () => {
    mock.method(bcrypt, "hash", async (value) => `hashed:${value}`);
    mock.method(PhoneOtp, "findOne", async () => activeDoc());

    await assert.rejects(
      issueOtp({ phone: PHONE }),
      (err) => err.code === "OTP_TOO_SOON"
    );
  });

  it("allows resends after cooldown up to the max and then rejects", async () => {
    process.env.OTP_RESEND_COOLDOWN_SECONDS = "0";
    mock.method(bcrypt, "hash", async (value) => `hashed:${value}`);

    const doc = activeDoc({
      lastResentAt: new Date(Date.now() - 60000),
    });
    mock.method(PhoneOtp, "findOne", async () => doc);

    await issueOtp({ phone: PHONE });
    assert.equal(doc.resendCount, 1);

    await issueOtp({ phone: PHONE });
    assert.equal(doc.resendCount, 2);

    await issueOtp({ phone: PHONE });
    assert.equal(doc.resendCount, 3);

    await assert.rejects(
      issueOtp({ phone: PHONE }),
      (err) => err.code === "OTP_MAX_RESENDS"
    );
  });

  it("verifies the correct code and consumes it (single-use)", async () => {
    let consumed = false;
    mock.method(PhoneOtp, "findOne", async () => activeDoc());
    mock.method(bcrypt, "compare", async (input) => input === "123456");
    mock.method(PhoneOtp, "findOneAndUpdate", async (filter, update) => {
      if (update.$set && update.$set.consumed === true) {
        if (consumed) return null;
        consumed = true;
        return { _id: "o1", consumed: true };
      }
      return null;
    });

    const result = await verifyOtp({ phone: PHONE, code: "123456" });
    assert.equal(result.phone, PHONE);
    assert.equal(consumed, true);

    const replay = activeDoc({ consumed: true });
    mock.method(PhoneOtp, "findOne", async () => replay);
    await assert.rejects(
      verifyOtp({ phone: PHONE, code: "123456" }),
      (err) => err.code === "OTP_USED"
    );
  });

  it("rejects a wrong code and increments the attempt counter", async () => {
    let attempts = 0;
    mock.method(PhoneOtp, "findOne", async () => activeDoc());
    mock.method(bcrypt, "compare", async () => false);
    mock.method(PhoneOtp, "findOneAndUpdate", async () => {
      attempts += 1;
      return { _id: "o1", attempts, consumed: false };
    });

    await assert.rejects(
      verifyOtp({ phone: PHONE, code: "000000" }),
      (err) => err.code === "OTP_WRONG"
    );
    assert.equal(attempts, 1);
  });

  it("locks the OTP after the maximum verification attempts", async () => {
    process.env.OTP_MAX_ATTEMPTS = "2";
    let attempts = 0;
    let invalidated = false;
    mock.method(PhoneOtp, "findOne", async () => activeDoc());
    mock.method(bcrypt, "compare", async () => false);
    mock.method(PhoneOtp, "findOneAndUpdate", async (filter, update) => {
      if (update.$inc && update.$inc.attempts) {
        attempts += 1;
        return { _id: "o1", attempts, consumed: false };
      }
      if (update.$set && update.$set.consumed) {
        invalidated = true;
        return { _id: "o1", attempts, consumed: true };
      }
      return null;
    });

    await assert.rejects(
      verifyOtp({ phone: PHONE, code: "000000" }),
      (err) => err.code === "OTP_WRONG"
    );
    await assert.rejects(
      verifyOtp({ phone: PHONE, code: "000000" }),
      (err) => err.code === "OTP_MAX_ATTEMPTS"
    );
    assert.equal(invalidated, true);
  });

  it("rejects an expired OTP and marks it consumed", async () => {
    let invalidated = false;
    mock.method(PhoneOtp, "findOne", async () =>
      activeDoc({ expiresAt: new Date(Date.now() - 1000) })
    );
    mock.method(PhoneOtp, "findOneAndUpdate", async (filter, update) => {
      if (update.$set && update.$set.consumed) {
        invalidated = true;
        return { _id: "o1" };
      }
      return null;
    });

    await assert.rejects(
      verifyOtp({ phone: PHONE, code: "123456" }),
      (err) => err.code === "OTP_EXPIRED"
    );
    assert.equal(invalidated, true);
  });

  it("rejects verification when no OTP was issued", async () => {
    mock.method(PhoneOtp, "findOne", async () => null);

    await assert.rejects(
      verifyOtp({ phone: PHONE, code: "123456" }),
      (err) => err.code === "OTP_INVALID"
    );
  });

  it("invalidates the stored OTP and rethrows when SMS delivery fails", async () => {
    let created = false;
    let invalidated = false;
    let findOneCalls = 0;
    setSmsSender(async () => {
      const error = new Error("SMS down");
      error.statusCode = 503;
      throw error;
    });
    mock.method(bcrypt, "hash", async (value) => `hashed:${value}`);
    mock.method(PhoneOtp, "findOne", async () => {
      findOneCalls += 1;
      return findOneCalls === 1 ? null : { _id: "o1", consumed: false };
    });
    mock.method(PhoneOtp, "create", async (data) => {
      created = true;
      return { _id: "o1", ...data };
    });
    mock.method(PhoneOtp, "findOneAndUpdate", async (filter, update) => {
      if (update.$set && update.$set.consumed) {
        invalidated = true;
        return { _id: "o1" };
      }
      return null;
    });

    await assert.rejects(issueOtp({ phone: PHONE }), /SMS down/);
    assert.equal(created, true);
    assert.equal(invalidated, true);
  });
});