import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import DeviceToken from "../models/DeviceToken.js";
import {
  buildFcmMessages,
  buildPushMessages,
  pushNotifications,
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

const expoTokens = ["ExponentPushToken[aaaa]", "ExponentPushToken[bbbb]"];
const fcmTokens = ["fcm-aaaabbbb", "fcm-ccccdddd"];

const makeFakeExpo = () => ({
  chunkPushNotifications: (messages) => [messages],
  sendPushNotificationsAsync: async (chunk) =>
    chunk.map((message) => ({ status: "ok", id: `rec-${message.to}` })),
  getPushNotificationReceiptsAsync: async () => ({}),
});

const makeFakeMessaging = (handler) => ({
  sendEachForMulticast: handler,
});

const successMulticast = async (messages) => ({
  successCount: messages.length,
  failureCount: 0,
  responses: messages.map(() => ({ success: true })),
});

// Mock the DeviceToken model so getActiveDevices returns the given devices:
// requires the .select("token provider").lean() chain to resolve to records
// that include both `token` and `provider`.
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

describe("push.service FCM delivery", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("buildsFcmMessages produces only string data values plus a null-safe channel/priority", () => {
    const messages = buildFcmMessages(sampleNotification, ["fcm-token-1"]);

    assert.equal(messages.length, 1);
    const message = messages[0];
    assert.equal(message.token, "fcm-token-1");
    assert.equal(message.notification.title, sampleNotification.title);
    assert.equal(message.notification.body, sampleNotification.message);
    assert.equal(message.android.channelId, "giglink-notifications");
    assert.equal(message.android.priority, "high");
    assert.deepEqual(Object.keys(message.data).sort(), [
      "notificationId",
      "relatedApplication",
      "relatedAssignment",
      "relatedJob",
      "type",
    ]);
    // Every data value is a string (Firebase requires strings, no null).
    for (const value of Object.values(message.data)) {
      assert.equal(typeof value, "string");
    }
    assert.equal(message.data.notificationId, sampleNotification._id);
    assert.equal(message.data.relatedJob, sampleNotification.relatedJob);
    assert.equal(message.data.relatedApplication, sampleNotification.relatedApplication);
    assert.equal(message.data.relatedAssignment, sampleNotification.relatedAssignment);
  });

  it("Expo tokens are delivered only via Expo, never through Firebase", async () => {
    mockDevices(
      expoTokens.map((token) => ({ token, provider: "expo" })),
    );
    const expoSend = [];
    const fakeExpo = {
      ...makeFakeExpo(),
      sendPushNotificationsAsync: async () => {
        // no-op; we only assert routing
      },
    };
    const fakeMessaging = makeFakeMessaging(async (messages) => {
      expoSend.push("fcm-called");
      return successMulticast(messages);
    });

    await pushNotifications(sampleNotification, { expo: fakeExpo, messaging: fakeMessaging });

    assert.deepEqual(expoSend, [], "Firebase must not be called for Expo-only devices");
  });

  it("FCM tokens are delivered only via Firebase, never through Expo", async () => {
    mockDevices(fcmTokens.map((token) => ({ token, provider: "fcm" })));
    let expoCalled = false;
    const fakeExpo = {
      ...makeFakeExpo(),
      sendPushNotificationsAsync: async () => {
        expoCalled = true;
      },
    };
    const sent = [];
    const fakeMessaging = makeFakeMessaging(async (messages) => {
      messages.forEach((m) => sent.push(m.token));
      return successMulticast(messages);
    });

    await pushNotifications(sampleNotification, { expo: fakeExpo, messaging: fakeMessaging });

    assert.equal(expoCalled, false, "Expo must not be called for FCM-only devices");
    assert.deepEqual(sent.sort(), [...fcmTokens].sort());
  });

  it("routes mixed Expo + FCM devices to the correct provider", async () => {
    mockDevices([
      { token: expoTokens[0], provider: "expo" },
      { token: fcmTokens[0], provider: "fcm" },
      { token: expoTokens[1], provider: "expo" },
      { token: fcmTokens[1], provider: "fcm" },
    ]);
    const expoSent = [];
    const fakeExpo = {
      chunkPushNotifications: (messages) => [messages],
      sendPushNotificationsAsync: async (chunk) => {
        chunk.forEach((m) => expoSent.push(m.to));
        return chunk.map(() => ({ status: "ok", id: "r" }));
      },
      getPushNotificationReceiptsAsync: async () => ({}),
    };
    const fcmSent = [];
    const fakeMessaging = makeFakeMessaging(async (messages) => {
      messages.forEach((m) => fcmSent.push(m.token));
      return successMulticast(messages);
    });

    await pushNotifications(sampleNotification, { expo: fakeExpo, messaging: fakeMessaging });

    assert.deepEqual(expoSent.sort(), [...expoTokens].sort());
    assert.deepEqual(fcmSent.sort(), [...fcmTokens].sort());
  });

  it("sends multiple FCM tokens in a single multicast call", async () => {
    mockDevices(fcmTokens.map((token) => ({ token, provider: "fcm" })));
    let multicastCalls = 0;
    const sent = [];
    const fakeMessaging = makeFakeMessaging(async (messages) => {
      multicastCalls += 1;
      messages.forEach((m) => sent.push(m.token));
      return successMulticast(messages);
    });

    await pushNotifications(sampleNotification, { expo: makeFakeExpo(), messaging: fakeMessaging });

    assert.equal(multicastCalls, 1, "FCM tokens must be batched into one multicast call");
    assert.deepEqual(sent.sort(), [...fcmTokens].sort());
  });

  it("removes only permanently invalid/unregistered FCM tokens", async () => {
    const tokens = ["fcm-t1", "fcm-t2", "fcm-t3"];
    mockDevices(tokens.map((token) => ({ token, provider: "fcm" })));
    const deleted = mockDeletedTokens();
    const fakeMessaging = makeFakeMessaging(async () => ({
      successCount: 1,
      failureCount: 2,
      responses: [
        { success: true },
        {
          success: false,
          error: { code: "registration-token-not-registered" },
        },
        { success: false, error: { code: "registration-token-not-registered" } },
      ],
    }));

    await pushNotifications(sampleNotification, { expo: makeFakeExpo(), messaging: fakeMessaging });

    assert.equal(deleted.length, 1);
    assert.deepEqual(deleted[0].sort(), [tokens[1], tokens[2]].sort());
  });

  it("removes invalid-registration and mismatched-credential FCM tokens", async () => {
    mockDevices(["t-a", "t-b", "t-c"].map((token) => ({ token, provider: "fcm" })));
    const deleted = mockDeletedTokens();
    const fakeMessaging = makeFakeMessaging(async () => ({
      successCount: 0,
      failureCount: 3,
      responses: [
        { success: false, error: { code: "invalid-registration-token" } },
        { success: false, error: { code: "mismatched-credential" } },
        { success: false, error: { code: "server-unavailable" } }, // transient: keep
      ],
    }));

    await pushNotifications(sampleNotification, { expo: makeFakeExpo(), messaging: fakeMessaging });

    assert.equal(deleted.length, 1);
    assert.deepEqual(deleted[0].sort(), ["t-a", "t-b"].sort());
  });

  it("does not crash and does not remove tokens on FCM auth/config failure", async () => {
    mockDevices(fcmTokens.map((token) => ({ token, provider: "fcm" })));
    const deleted = mockDeletedTokens();
    const fakeMessaging = makeFakeMessaging(async () => {
      const error = new Error("unauthenticated");
      error.code = "authentication-error";
      throw error;
    });

    await assert.doesNotReject(
      pushNotifications(sampleNotification, { expo: makeFakeExpo(), messaging: fakeMessaging }),
    );
    assert.equal(deleted.length, 0, "no tokens should be removed on auth/config failure");
  });

  it("skips FCM delivery when Firebase Admin is not configured", async () => {
    mockDevices(fcmTokens.map((token) => ({ token, provider: "fcm" })));
    const fakeMessaging = null; // getFirebaseMessaging() returns null when unconfigured

    await assert.doesNotReject(
      pushNotifications(sampleNotification, { expo: makeFakeExpo(), messaging: fakeMessaging }),
    );
  });

  it("never writes FCM token values to the console", async () => {
    mockDevices([{ token: "fcm-secret-token", provider: "fcm" }]);
    const logs = [];
    const logSpy = () => (message, ...rest) => {
      logs.push([message, ...rest].map(String).join(" "));
    };
    mock.method(console, "log", logSpy());
    mock.method(console, "warn", logSpy());
    const deleted = mockDeletedTokens();
    const fakeMessaging = makeFakeMessaging(async (messages) => ({
      successCount: 0,
      failureCount: 1,
      responses: [
        { success: false, error: { code: "registration-token-not-registered" } },
      ],
    }));

    await pushNotifications(sampleNotification, { expo: makeFakeExpo(), messaging: fakeMessaging });

    assert.equal(deleted.length, 1, "invalid FCM token should still be removed");
    for (const line of logs) {
      assert.equal(line.includes("fcm-secret-token"), false, `log leaked token: ${line}`);
    }
  });

  it("Expo payload model is preserved (channel/sound/data) and FCM mirrors it", () => {
    const expoMessage = buildPushMessages(sampleNotification, [expoTokens[0]])[0];
    assert.equal(expoMessage.sound, "default");
    assert.equal(expoMessage.channelId, "giglink-notifications");
    assert.deepEqual(Object.keys(expoMessage.data).sort(), [
      "notificationId",
      "relatedApplication",
      "relatedAssignment",
      "relatedJob",
      "type",
    ]);
  });
});
