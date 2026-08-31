import { after, afterEach, before, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

import DeviceToken from "../models/DeviceToken.js";
import deviceRoutes from "./device.routes.js";

const baseApiUrl = (port) => `http://127.0.0.1:${port}/api/notifications/devices`;

function authToken(overrides = {}) {
  return jwt.sign({ userId: "user1", role: "worker", ...overrides }, process.env.JWT_SECRET);
}

describe("device.routes", () => {
  let server;
  let port;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/notifications/devices", deviceRoutes);
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    port = server.address().port;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("rejects an unauthenticated registration with 401", async () => {
    const res = await fetch(`${baseApiUrl(port)}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "any-token", platform: "android" }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it("accepts an FCM token registration for an authenticated user", async () => {
    let captured = null;
    mock.method(DeviceToken, "findOneAndUpdate", async (filter, update) => {
      captured = { ...filter, provider: update.$set.provider, platform: update.$set.platform };
      return { _id: "d1", ...captured };
    });

    const res = await fetch(`${baseApiUrl(port)}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken()}`,
      },
      body: JSON.stringify({ token: "FCM-TOKEN-123", provider: "fcm", platform: "android" }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(captured.userId, "user1");
    assert.equal(captured.token, "FCM-TOKEN-123");
    assert.equal(captured.provider, "fcm");
    assert.equal(captured.platform, "android");
  });

  it("accepts an Expo token registration without an explicit provider (default expo)", async () => {
    let captured = null;
    mock.method(DeviceToken, "findOneAndUpdate", async (filter, update) => {
      captured = { ...filter, provider: update.$set.provider, platform: update.$set.platform };
      return { _id: "d1", ...captured };
    });

    const res = await fetch(`${baseApiUrl(port)}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken()}`,
      },
      body: JSON.stringify({ token: "ExponentPushToken[aaaa]", platform: "android" }),
    });

    assert.equal(res.status, 201);
    assert.equal(captured.provider, "expo");
  });

  it("rejects an unsupported provider with 400", async () => {
    const res = await fetch(`${baseApiUrl(port)}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken()}`,
      },
      body: JSON.stringify({ token: "x", provider: "apns", platform: "ios" }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });
});
