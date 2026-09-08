import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import DeviceToken from "../models/DeviceToken.js";
import {
  getActiveDeviceTokens,
  registerDeviceToken,
  removeDeviceTokens,
  unregisterDeviceToken,
} from "./device.service.js";

const pushyTokens = {
  phoneA: "pushy-token-phoneA",
  phoneB: "pushy-token-phoneB",
  tabletB: "pushy-token-tabletB",
  iphoneC: "pushy-token-iPhoneC",
};

describe("device.service", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("registers a device token for a user with platform and lastActiveAt (default provider pushy)", async () => {
    const calls = [];
    mock.method(DeviceToken, "findOneAndUpdate", async (filter, update, options) => {
      calls.push({ filter, update, options });
      return { _id: "d1", ...filter, platform: update.$set.platform, provider: update.$set.provider, lastActiveAt: update.$set.lastActiveAt };
    });

    const device = await registerDeviceToken("user1", pushyTokens.phoneA, "android");

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].filter, { userId: "user1", token: pushyTokens.phoneA });
    assert.equal(calls[0].update.$set.platform, "android");
    // Pushy is the only provider, so the default never changes.
    assert.equal(calls[0].update.$set.provider, "pushy");
    assert.ok(calls[0].update.$set.lastActiveAt instanceof Date);
    assert.equal(calls[0].options.upsert, true);
    assert.equal(device.platform, "android");
    assert.equal(device.provider, "pushy");
  });

  it("registers an explicit Pushy token with provider = pushy", async () => {
    const calls = [];
    mock.method(DeviceToken, "findOneAndUpdate", async (filter, update) => {
      calls.push({ filter, update });
      return { _id: "d1", ...filter, platform: update.$set.platform, provider: update.$set.provider };
    });

    const device = await registerDeviceToken("user1", "PUSHY-TOKEN-123", "android", "pushy");

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].filter, { userId: "user1", token: "PUSHY-TOKEN-123" });
    assert.equal(calls[0].update.$set.platform, "android");
    assert.equal(calls[0].update.$set.provider, "pushy");
    assert.equal(device.provider, "pushy");
  });

  it("rejects an unsupported push provider", async () => {
    await assert.rejects(
      () => registerDeviceToken("user1", "apns-token", "ios", "apns"),
      (error) => error.statusCode === 400 && /Unsupported push provider/.test(error.message),
    );
  });

  it("re-registering the same Pushy token upserts (no duplicate)", async () => {
    let callCount = 0;
    mock.method(DeviceToken, "findOneAndUpdate", async (_filter, update) => {
      callCount += 1;
      return { _id: "d1", token: _filter.token, provider: update.$set.provider };
    });

    await registerDeviceToken("user1", pushyTokens.phoneA, "android", "pushy");
    await registerDeviceToken("user1", pushyTokens.phoneA, "android", "pushy");

    assert.equal(callCount, 2, "each call goes through the single upsert path — no duplicate rows");
  });

  it("supports multiple devices per user", async () => {
    const registered = [];
    mock.method(DeviceToken, "findOneAndUpdate", async (_filter, update) => {
      const token = _filter.token;
      registered.push(token);
      return { token, provider: update.$set.provider };
    });

    await registerDeviceToken("user1", pushyTokens.phoneA, "android");
    await registerDeviceToken("user1", pushyTokens.tabletB, "android");
    await registerDeviceToken("user1", pushyTokens.iphoneC, "ios");

    assert.deepEqual(registered, [
      pushyTokens.phoneA,
      pushyTokens.tabletB,
      pushyTokens.iphoneC,
    ]);
  });

  it("returns all active tokens for a user", async () => {
    mock.method(DeviceToken, "find", () => ({
      select: () => ({
        lean: async () => [{ token: pushyTokens.phoneA }, { token: pushyTokens.tabletB }],
      }),
    }));

    const tokens = await getActiveDeviceTokens("user1");

    assert.deepEqual(tokens, [pushyTokens.phoneA, pushyTokens.tabletB]);
  });

  it("deletes a device token scoped to the owning user", async () => {
    const calls = [];
    mock.method(DeviceToken, "deleteOne", async (filter) => {
      calls.push(filter);
      return { deletedCount: 1 };
    });

    const result = await unregisterDeviceToken("user1", pushyTokens.phoneA);

    assert.equal(result.deleted, true);
    assert.equal(calls.length, 1);
    // Ownership is enforced by including userId in the filter.
    assert.deepEqual(calls[0], { userId: "user1", token: pushyTokens.phoneA });
  });

  it("removes multiple invalid tokens in one deleteMany", async () => {
    const calls = [];
    mock.method(DeviceToken, "deleteMany", async (filter) => {
      calls.push(filter);
      return { deletedCount: 2 };
    });

    const result = await removeDeviceTokens([pushyTokens.phoneA, pushyTokens.tabletB]);

    assert.equal(result.deleted, 2);
    assert.deepEqual(calls[0], { token: { $in: [pushyTokens.phoneA, pushyTokens.tabletB] } });
  });

  it("does not call deleteMany for an empty token list", async () => {
    mock.method(DeviceToken, "deleteMany", async () => {
      throw new Error("should not be called");
    });

    const result = await removeDeviceTokens([]);

    assert.deepEqual(result, { deleted: 0 });
  });
});