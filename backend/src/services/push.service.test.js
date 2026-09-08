import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import DeviceToken from "../models/DeviceToken.js";
import Notification from "../models/Notification.js";
import { createNotification } from "./notification.service.js";
import {
  buildPushyPayload,
  collectInvalidTokens,
  pushNotifications,
  sendPushyNotification,
} from "./push.service.js";

const sampleNotification = {
  _id: "507f1f77bcf86cd799439011",
  recipient: "507f1f77bcf86cd799439012",
  type: "APPLICATION_ACCEPTED",
  title: "Application accepted",
  message: "Your application for Event Staff was accepted.",
  relatedJob: "507f1f77bcf86cd799439013",
  relatedApplication: "507f1f77bcf86cd799439014",
  relatedAssignment: "507f1f77bcf86cd799439015",
};

const sampleTokens = ["pushy-token-aaaa", "pushy-token-bbbb"];

// Mock the DeviceToken model so getActiveDevices returns the given devices
// (it requires the .select("token provider").lean() chain).
const mockDevices = (devices) => {
  mock.method(DeviceToken, "find", () => ({
    select: () => ({ lean: async () => devices }),
  }));
};

const mockDeletedTokens = () => {
  const calls = [];
  mock.method(DeviceToken, "deleteMany", async (filter) => {
    calls.push([...(filter.token?.$in ?? [])]);
    return { deletedCount: calls[0].length };
  });
  return calls;
};

describe("push.service (Pushy)", () => {
  beforeEach(() => {
    mock.restoreAll();
    process.env.PUSHY_API_KEY = "test-pushy-key";
  });

  afterEach(() => {
    mock.restoreAll();
    delete process.env.PUSHY_API_KEY;
  });

  it("builds a Pushy payload with navigation ids plus title/message inside data", () => {
    const payload = buildPushyPayload(sampleNotification, sampleTokens);

    assert.deepEqual(payload.to, sampleTokens);
    assert.deepEqual(Object.keys(payload.data).sort(), [
      "message",
      "notificationId",
      "relatedApplication",
      "relatedAssignment",
      "relatedJob",
      "title",
      "type",
    ]);
    assert.equal(payload.data.notificationId, sampleNotification._id);
    assert.equal(payload.data.type, "APPLICATION_ACCEPTED");
    assert.equal(payload.data.relatedJob, sampleNotification.relatedJob);
    assert.equal(payload.data.relatedApplication, sampleNotification.relatedApplication);
    assert.equal(payload.data.relatedAssignment, sampleNotification.relatedAssignment);
    assert.equal(payload.data.title, sampleNotification.title);
    assert.equal(payload.data.message, sampleNotification.message);
  });

  it("uses empty strings for missing related ids (data values stay short strings)", () => {
    const payload = buildPushyPayload(
      { _id: sampleNotification._id, type: "JOB_FILLED", title: "t", message: "m" },
      ["tok"],
    );

    assert.equal(payload.data.relatedJob, "");
    assert.equal(payload.data.relatedApplication, "");
    assert.equal(payload.data.relatedAssignment, "");
  });

  it("collects invalid tokens from info.failed", () => {
    const invalid = collectInvalidTokens(
      { success: true, info: { devices: 1, failed: [sampleTokens[1]] } },
      sampleTokens,
    );

    assert.deepEqual(invalid, [sampleTokens[1]]);
  });

  it("collects invalid tokens from the legacy invalid_devices shape", () => {
    const invalid = collectInvalidTokens(
      { success: true, info: { invalid_devices: [sampleTokens[0]] } },
      sampleTokens,
    );

    assert.deepEqual(invalid, [sampleTokens[0]]);
  });

  it("returns no invalid tokens when the response reports none", () => {
    assert.deepEqual(collectInvalidTokens({ success: true, info: { devices: 2 } }, sampleTokens), []);
    assert.deepEqual(collectInvalidTokens({}, sampleTokens), []);
  });

  it("ignores invalid-listed tokens that were not part of the send", () => {
    const invalid = collectInvalidTokens(
      { success: true, info: { failed: ["unknown-token"] } },
      sampleTokens,
    );

    assert.deepEqual(invalid, []);
  });

  it("delivers to all active devices in a single payload and avoids deletions on success", async () => {
    mockDevices(sampleTokens.map((token) => ({ token, provider: "pushy" })));
    const deleted = mockDeletedTokens();
    let sentApiKey = null;
    let sentPayload = null;
    const fakeHttp = async (apiKey, payload) => {
      sentApiKey = apiKey;
      sentPayload = payload;
      return { success: true, info: { devices: 2 } };
    };

    const delivered = await pushNotifications(sampleNotification, { httpPost: fakeHttp });

    assert.equal(delivered, 2);
    assert.equal(sentApiKey, "test-pushy-key");
    assert.deepEqual(sentPayload.to, sampleTokens);
    assert.equal(deleted.length, 0);
  });

  it("removes invalid tokens reported by info.failed", async () => {
    mockDevices([
      { token: sampleTokens[0], provider: "pushy" },
      { token: sampleTokens[1], provider: "pushy" },
    ]);
    const deleted = mockDeletedTokens();
    const fakeHttp = async (_apiKey, _payload) => ({
      success: true,
      info: { devices: 1, failed: [sampleTokens[1]] },
    });

    await pushNotifications(sampleNotification, { httpPost: fakeHttp });

    assert.equal(deleted.length, 1);
    assert.deepEqual(deleted[0], [sampleTokens[1]]);
  });

  it("skips delivery (and never rejects) when PUSHY_API_KEY is missing", async () => {
    mockDevices(sampleTokens.map((token) => ({ token, provider: "pushy" })));
    delete process.env.PUSHY_API_KEY;
    let httpCalled = false;
    const fakeHttp = async () => {
      httpCalled = true;
      return { success: true };
    };

    const delivered = await pushNotifications(sampleNotification, { httpPost: fakeHttp });

    assert.equal(delivered, 0);
    assert.equal(httpCalled, false);
  });

  it("swallows provider-side transport errors without removing tokens", async () => {
    mockDevices(sampleTokens.map((token) => ({ token, provider: "pushy" })));
    const deleted = mockDeletedTokens();
    const fakeHttp = async () => {
      throw new Error("getaddrinfo ENOTFOUND api.pushy.me");
    };

    const delivered = await pushNotifications(sampleNotification, { httpPost: fakeHttp });

    assert.equal(delivered, 0);
    assert.equal(deleted.length, 0);
  });

  it("swallows 400/429/500 provider responses without removing tokens", async () => {
    mockDevices([{ token: sampleTokens[0], provider: "pushy" }]);
    const deleted = mockDeletedTokens();
    const fakeHttp = async () => {
      const error = new Error("RATE_LIMIT_EXCEEDED");
      error.statusCode = 429;
      error.code = "RATE_LIMIT_EXCEEDED";
      throw error;
    };

    const delivered = await pushNotifications(sampleNotification, { httpPost: fakeHttp });

    assert.equal(delivered, 0);
    assert.equal(deleted.length, 0);
  });

  it("does nothing when the device list is empty", async () => {
    mockDevices([]);
    // deleteMany would reject if called — an empty list must never reach it.
    mock.method(DeviceToken, "deleteMany", async () => {
      throw new Error("should not be called");
    });

    const delivered = await sendPushyNotification(sampleNotification, []);

    assert.equal(delivered, 0);
  });

  it("pushNotifications never throws even when the token lookup fails", async () => {
    mock.method(DeviceToken, "find", () => ({
      select: () => ({
        lean: async () => {
          throw new Error("db down");
        },
      }),
    }));

    await assert.doesNotReject(pushNotifications(sampleNotification));
  });

  it("push failure does not break notification creation", async () => {
    const created = { _id: sampleNotification._id, ...sampleNotification };
    mock.method(Notification, "create", async () => created);
    mock.method(DeviceToken, "find", () => ({
      select: () => ({
        lean: async () => {
          throw new Error("db down");
        },
      }),
    }));

    const notification = await createNotification({
      recipient: sampleNotification.recipient,
      type: sampleNotification.type,
      title: sampleNotification.title,
      message: sampleNotification.message,
      relatedJob: sampleNotification.relatedJob,
      relatedApplication: sampleNotification.relatedApplication,
      relatedAssignment: sampleNotification.relatedAssignment,
    });

    // Let the fire-and-forget push promise settle (it must be swallowed).
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(notification._id, sampleNotification._id);
    assert.equal(notification.recipient, sampleNotification.recipient);
  });

  it("notification is still returned when push has no devices", async () => {
    const created = { _id: sampleNotification._id, ...sampleNotification };
    mock.method(Notification, "create", async () => created);
    mock.method(DeviceToken, "find", () => ({
      select: () => ({ lean: async () => [] }),
    }));

    const notification = await createNotification({
      recipient: sampleNotification.recipient,
      type: sampleNotification.type,
      title: sampleNotification.title,
      message: sampleNotification.message,
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(notification._id, sampleNotification._id);
  });
});