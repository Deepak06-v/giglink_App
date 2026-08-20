import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import DeviceToken from "../models/DeviceToken.js";
import Notification from "../models/Notification.js";
import { createNotification } from "./notification.service.js";
import { buildPushMessages, collectInvalidTokens, pushNotifications } from "./push.service.js";

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

const sampleTokens = ["ExponentPushToken[aaaa]", "ExponentPushToken[bbbb]"];

describe("push.service", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("builds push messages with ONLY navigation-safe payload keys", () => {
    const messages = buildPushMessages(sampleNotification, sampleTokens);

    assert.equal(messages.length, 2);
    for (const message of messages) {
      assert.equal(message.title, sampleNotification.title);
      assert.equal(message.body, sampleNotification.message);
      assert.equal(message.sound, "default");
      assert.equal(message.channelId, "giglink-notifications");
      assert.deepEqual(Object.keys(message.data).sort(), [
        "notificationId",
        "relatedApplication",
        "relatedAssignment",
        "relatedJob",
        "type",
      ]);
      assert.equal(message.data.notificationId, sampleNotification._id);
      assert.equal(message.data.type, "APPLICATION_ACCEPTED");
      assert.equal(message.data.relatedJob, sampleNotification.relatedJob);
      assert.equal(message.data.relatedApplication, sampleNotification.relatedApplication);
      assert.equal(message.data.relatedAssignment, sampleNotification.relatedAssignment);
    }
    assert.equal(messages[0].to, "ExponentPushToken[aaaa]");
    assert.equal(messages[1].to, "ExponentPushToken[bbbb]");
  });

  it("collects DeviceNotRegistered tokens from ticket errors", () => {
    const entries = [
      { token: "ExponentPushToken[a]", ticket: { status: "error", details: { error: "DeviceNotRegistered" } } },
      { token: "ExponentPushToken[b]", ticket: { status: "error", details: { error: "MessageTooBig" } } },
      { token: "ExponentPushToken[c]", ticket: { status: "ok", id: "r1" } },
    ];
    const receipts = {
      r1: { status: "error", details: { error: "DeviceNotRegistered" } },
    };

    const invalid = collectInvalidTokens(entries, receipts);

    assert.deepEqual(invalid.sort(), ["ExponentPushToken[a]", "ExponentPushToken[c]"]);
  });

  it("does not collect tokens for transient or ok receipts", () => {
    const entries = [
      { token: "ExponentPushToken[a]", ticket: { status: "error", details: { error: "InternalServerError" } } },
      { token: "ExponentPushToken[b]", ticket: { status: "ok", id: "r2" } },
    ];
    const receipts = { r2: { status: "ok" } };

    const invalid = collectInvalidTokens(entries, receipts);

    assert.deepEqual(invalid, []);
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
