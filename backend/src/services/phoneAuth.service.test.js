import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import User from "../models/User.js";
import {
  buildPhoneSession,
  createPhoneUser,
  findUserByPhone,
  phoneLoginOrSignup,
} from "./auth.service.js";

process.env.JWT_SECRET = "test-jwt-secret";

const PHONE = "+919876543210";

const phoneUser = (overrides = {}) => ({
  _id: "u9",
  name: "Phone Worker",
  email: undefined,
  role: "worker",
  isVerified: false,
  ...overrides,
});

describe("phone auth service", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("findUserByPhone queries the phone provider elemMatch filter", async () => {
    const calls = [];
    mock.method(User, "findOne", async (filter) => {
      calls.push(filter);
      return phoneUser();
    });

    const user = await findUserByPhone(PHONE);

    assert.equal(user.role, "worker");
    assert.deepEqual(calls[0], {
      authProviders: {
        $elemMatch: { provider: "phone", providerId: PHONE },
      },
    });
  });

  it("createPhoneUser creates a phone-only user with no email and no password", async () => {
    const created = [];
    mock.method(User, "create", async (data) => {
      created.push(data);
      return { _id: "u10", ...data };
    });

    const user = await createPhoneUser({
      name: "New Phone Worker",
      role: "worker",
      normalizedPhone: PHONE,
    });

    assert.equal(created.length, 1);
    assert.equal(created[0].name, "New Phone Worker");
    assert.equal(created[0].role, "worker");
    assert.equal(created[0].email, undefined);
    assert.equal(created[0].password, undefined);

    const entry = created[0].authProviders[0];
    assert.equal(entry.provider, "phone");
    assert.equal(entry.providerId, PHONE);
    assert.equal(entry.phone, PHONE);
    assert.ok(entry.linkedAt instanceof Date);
    assert.equal(user._id, "u10");
  });

  it("rejects a duplicate phone number with 409", async () => {
    mock.method(User, "create", async () => {
      const error = new Error("duplicate key");
      error.code = 11000;
      throw error;
    });

    await assert.rejects(
      createPhoneUser({
        name: "X",
        role: "worker",
        normalizedPhone: PHONE,
      }),
      (err) => err.statusCode === 409 && /already registered/.test(err.message)
    );
  });

  it("phoneLoginOrSignup returns the existing user without creating a new account", async () => {
    mock.method(User, "findOne", async () =>
      phoneUser({ role: "employer", name: "Existing Employer" })
    );
    const created = [];
    mock.method(User, "create", async (data) => {
      created.push(data);
      return data;
    });

    const { user, isNewUser } = await phoneLoginOrSignup({
      normalizedPhone: PHONE,
      role: "worker",
      name: "Ignored",
    });

    assert.equal(isNewUser, false);
    assert.equal(user.role, "employer");
    assert.equal(created.length, 0);
  });

  it("preserves the existing user's role, ignoring the submitted role", async () => {
    mock.method(User, "findOne", async () => phoneUser({ role: "employer" }));

    const { user } = await phoneLoginOrSignup({
      normalizedPhone: PHONE,
      role: "worker",
      name: "X",
    });

    assert.equal(user.role, "employer");
  });

  it("creates a new phone account with the submitted role and name", async () => {
    mock.method(User, "findOne", async () => null);
    mock.method(User, "create", async (data) => ({ _id: "u11", ...data }));

    const { user, isNewUser } = await phoneLoginOrSignup({
      normalizedPhone: PHONE,
      role: "worker",
      name: "Fresh Worker",
    });

    assert.equal(isNewUser, true);
    assert.equal(user.role, "worker");
    assert.equal(user.name, "Fresh Worker");
  });

  it("requires a role for a new account", async () => {
    mock.method(User, "findOne", async () => null);

    await assert.rejects(
      phoneLoginOrSignup({ normalizedPhone: PHONE, role: undefined, name: "X" }),
      (err) => err.statusCode === 400 && /Role is required/.test(err.message)
    );
  });

  it("requires a name for a new account", async () => {
    mock.method(User, "findOne", async () => null);

    await assert.rejects(
      phoneLoginOrSignup({ normalizedPhone: PHONE, role: "worker", name: "   " }),
      (err) => err.statusCode === 400 && /Name is required/.test(err.message)
    );
  });

  it("buildPhoneSession issues a JWT with the existing role and null email for phone users", async () => {
    const session = buildPhoneSession(phoneUser({ role: "employer" }));

    assert.ok(session.token);
    assert.equal(session.user.role, "employer");
    assert.equal(session.user.id, "u9");
    assert.equal(session.user.email, null);
  });
});