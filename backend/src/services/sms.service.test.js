import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import { sendOtp } from "./sms.service.js";

describe("sms.service", () => {
  afterEach(() => {
    mock.restoreAll();
    delete process.env.SMS_PROVIDER;
    delete process.env.NODE_ENV;
  });

  it("logs the OTP to the console in development when no provider is configured", async () => {
    delete process.env.SMS_PROVIDER;
    process.env.NODE_ENV = "development";

    const logs = [];
    mock.method(console, "log", (line) => logs.push(line));

    const result = await sendOtp("+919876543210", "123456");

    assert.equal(result.dev, true);
    assert.ok(logs.some((line) => line.includes("+919876543210") && line.includes("123456")));
  });

  it("fails safely in production when no provider is configured", async () => {
    delete process.env.SMS_PROVIDER;
    process.env.NODE_ENV = "production";

    await assert.rejects(
      sendOtp("+919876543210", "123456"),
      /SMS delivery is unavailable/
    );
  });

  it("fails safely when a non-dev provider is set but not implemented", async () => {
    process.env.SMS_PROVIDER = "twilio";
    process.env.NODE_ENV = "production";

    await assert.rejects(
      sendOtp("+919876543210", "123456"),
      /SMS provider is not configured/
    );
  });
});