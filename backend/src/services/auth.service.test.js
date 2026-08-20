import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  buildEmailProviderEntry,
  login,
  signup,
} from "./auth.service.js";

process.env.JWT_SECRET = "test-jwt-secret";

function userDoc(overrides = {}) {
  return {
    _id: "u1",
    name: "Test Worker",
    email: "user@example.com",
    role: "worker",
    isVerified: false,
    ...overrides,
  };
}

describe("buildEmailProviderEntry", () => {
  it("builds a canonical email provider entry", () => {
    const entry = buildEmailProviderEntry("  Foo.Bar@Example.COM  ");

    assert.equal(entry.provider, "email");
    assert.equal(entry.providerId, "foo.bar@example.com");
    assert.equal(entry.email, "foo.bar@example.com");
    assert.ok(entry.linkedAt instanceof Date);
  });
});

describe("auth.service email provider metadata", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("lazily adds exactly one email provider for a user with no email provider", async () => {
    const updateCalls = [];
    mock.method(User, "findOne", () => ({
      select: async () => userDoc(),
    }));
    mock.method(bcrypt, "compare", async () => true);
    mock.method(User, "updateOne", async (filter, update) => {
      updateCalls.push({ filter, update });
      return { modifiedCount: 1 };
    });

    const result = await login({ email: "user@example.com", password: "secret", role: "worker" });

    assert.ok(result.token, "login still returns a token");
    assert.equal(result.user.email, "user@example.com");
    assert.equal(updateCalls.length, 1);
    assert.equal(updateCalls[0].filter._id, "u1");
    assert.deepEqual(updateCalls[0].filter["authProviders.provider"], { $ne: "email" });
    const entry = updateCalls[0].update.$push.authProviders;
    assert.equal(entry.provider, "email");
    assert.equal(entry.providerId, "user@example.com");
    assert.equal(entry.email, "user@example.com");
    assert.ok(entry.linkedAt instanceof Date);
  });

  it("repeated successful logins always use the no-duplicate guard", async () => {
    const updateCalls = [];
    mock.method(User, "findOne", () => ({
      select: async () => userDoc(),
    }));
    mock.method(bcrypt, "compare", async () => true);
    mock.method(User, "updateOne", async (filter, update) => {
      updateCalls.push({ filter, update });
      return { modifiedCount: 0 };
    });

    await login({ email: "user@example.com", password: "secret", role: "worker" });
    await login({ email: "user@example.com", password: "secret", role: "worker" });

    assert.equal(updateCalls.length, 2);
    for (const call of updateCalls) {
      assert.deepEqual(call.filter["authProviders.provider"], { $ne: "email" });
    }
  });

  it("does not add provider metadata on wrong-role login", async () => {
    mock.method(User, "findOne", () => ({
      select: async () => userDoc({ role: "worker" }),
    }));
    mock.method(bcrypt, "compare", async () => true);
    mock.method(User, "updateOne", async () => {
      throw new Error("should not be called");
    });

    await assert.rejects(
      login({ email: "user@example.com", password: "secret", role: "employer" }),
      /Invalid credentials for this role/
    );
  });

  it("does not add provider metadata on invalid password", async () => {
    mock.method(User, "findOne", () => ({
      select: async () => userDoc(),
    }));
    mock.method(bcrypt, "compare", async () => false);
    mock.method(User, "updateOne", async () => {
      throw new Error("should not be called");
    });

    await assert.rejects(
      login({ email: "user@example.com", password: "wrong", role: "worker" }),
      /Invalid credentials/
    );
  });

  it("login still succeeds when the provider metadata update throws", async () => {
    mock.method(User, "findOne", () => ({
      select: async () => userDoc(),
    }));
    mock.method(bcrypt, "compare", async () => true);
    mock.method(User, "updateOne", async () => {
      throw new Error("db down");
    });

    const result = await login({ email: "user@example.com", password: "secret", role: "worker" });

    assert.ok(result.token, "login must succeed even if provider metadata fails");
    assert.equal(result.user.id, "u1");
  });

  it("signup creates the user with exactly one email provider entry", async () => {
    const createCalls = [];
    mock.method(User, "findOne", async () => null);
    mock.method(bcrypt, "hash", async () => "hashed");
    mock.method(User, "create", async (data) => {
      createCalls.push(data);
      return { _id: "u2", ...data };
    });

    const result = await signup({
      name: "New Worker",
      email: "new@example.com",
      password: "secretpass",
      role: "worker",
    });

    assert.equal(createCalls.length, 1);
    assert.equal(createCalls[0].password, "hashed");
    assert.equal(createCalls[0].authProviders.length, 1);
    const entry = createCalls[0].authProviders[0];
    assert.equal(entry.provider, "email");
    assert.equal(entry.providerId, "new@example.com");
    assert.equal(entry.email, "new@example.com");
    assert.ok(entry.linkedAt instanceof Date);
    assert.ok(result.token);
    assert.equal(result.user.name, "New Worker");
  });
});