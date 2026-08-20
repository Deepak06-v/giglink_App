import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import DeviceToken from "../models/DeviceToken.js";
import {
  getActiveDeviceTokens,
  registerDeviceToken,
  removeDeviceTokens,
  unregisterDeviceToken,
} from "./device.service.js";

describe("device.service", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("registers a device token for a user with platform and lastActiveAt", async () => {
    const calls = [];
    mock.method(DeviceToken, "findOneAndUpdate", async (filter, update, options) => {
      calls.push({ filter, update, options });
      return { _id: "d1", ...filter, platform: update.$set.platform, lastActiveAt: update.$set.lastActiveAt };
    });

    const device = await registerDeviceToken("user1", "ExponentPushToken[a]", "android");

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].filter, { userId: "user1", token: "ExponentPushToken[a]" });
    assert.equal(calls[0].update.$set.platform, "android");
    assert.ok(calls[0].update.$set.lastActiveAt instanceof Date);
    assert.equal(calls[0].options.upsert, true);
    assert.equal(device.platform, "android");
  });

  it("re-registering the same token upserts (no duplicate)", async () => {
    let callCount = 0;
    mock.method(DeviceToken, "findOneAndUpdate", async () => {
      callCount += 1;
      return { _id: "d1" };
    });

    await registerDeviceToken("user1", "ExponentPushToken[a]", "android");
    await registerDeviceToken("user1", "ExponentPushToken[a]", "android");

    assert.equal(callCount, 2);
    assert.equal(callCount, 2, "same token+user must always go through one upsert path");
  });

  it("supports multiple devices per user", async () => {
    const registered = [];
    mock.method(DeviceToken, "findOneAndUpdate", async (_filter, update) => {
      const token = _filter.token;
      registered.push(token);
      return { token };
    });

    await registerDeviceToken("user1", "ExponentPushToken[phoneA]", "android");
    await registerDeviceToken("user1", "ExponentPushToken[tabletB]", "android");
    await registerDeviceToken("user1", "ExponentPushToken[iPhoneC]", "ios");

    assert.deepEqual(registered, [
      "ExponentPushToken[phoneA]",
      "ExponentPushToken[tabletB]",
      "ExponentPushToken[iPhoneC]",
    ]);
  });

  it("returns all active tokens for a user", async () => {
    mock.method(DeviceToken, "find", () => ({
      select: () => ({
        lean: async () => [
          { token: "ExponentPushToken[phoneA]" },
          { token: "ExponentPushToken[tabletB]" },
        ],
      }),
    }));

    const tokens = await getActiveDeviceTokens("user1");

    assert.deepEqual(tokens, ["ExponentPushToken[phoneA]", "ExponentPushToken[tabletB]"]);
  });

  it("deletes a device token scoped to the owning user", async () => {
    const calls = [];
    mock.method(DeviceToken, "deleteOne", async (filter) => {
      calls.push(filter);
      return { deletedCount: 1 };
    });

    const result = await unregisterDeviceToken("user1", "ExponentPushToken[a]");

    assert.equal(result.deleted, true);
    assert.equal(calls.length, 1);
    // Ownership is enforced by including userId in the filter.
    assert.deepEqual(calls[0], { userId: "user1", token: "ExponentPushToken[a]" });
  });

  it("removes multiple invalid tokens in one deleteMany", async () => {
    const calls = [];
    mock.method(DeviceToken, "deleteMany", async (filter) => {
      calls.push(filter);
      return { deletedCount: 2 };
    });

    const result = await removeDeviceTokens(["ExponentPushToken[a]", "ExponentPushToken[b]"]);

    assert.equal(result.deleted, 2);
    assert.deepEqual(calls[0], { token: { $in: ["ExponentPushToken[a]", "ExponentPushToken[b]"] } });
  });

  it("does not call deleteMany for an empty token list", async () => {
    mock.method(DeviceToken, "deleteMany", async () => {
      throw new Error("should not be called");
    });

    const result = await removeDeviceTokens([]);

    assert.deepEqual(result, { deleted: 0 });
  });
});
