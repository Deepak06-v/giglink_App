import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import {
  authenticateGoogle,
  setGoogleVerifier,
  verifyGoogleIdToken,
} from "./googleAuth.service.js";
import {
  buildGoogleProviderEntry,
  findUserByGoogle,
} from "./auth.service.js";

process.env.JWT_SECRET = "test-jwt-secret";

const verifiedPayload = (overrides = {}) => ({
  sub: "google-sub-123",
  email: "user@example.com",
  email_verified: true,
  name: "Verified User",
  picture: "https://example.com/pic.jpg",
  locale: "en",
  ...overrides,
});

const googleUser = (overrides = {}) => ({
  _id: "u1",
  name: "Verified User",
  email: "user@example.com",
  role: "worker",
  isVerified: false,
  ...overrides,
});

describe("google auth service", () => {
  beforeEach(() => {
    mock.restoreAll();
    setGoogleVerifier(null);
  });

  afterEach(() => {
    mock.restoreAll();
    setGoogleVerifier(null);
  });

  describe("verifyGoogleIdToken", () => {
    it("returns the verified Google payload for a valid token", async () => {
      setGoogleVerifier(async () => verifiedPayload());

      const payload = await verifyGoogleIdToken("valid.id.token");

      assert.equal(payload.sub, "google-sub-123");
      assert.equal(payload.email, "user@example.com");
    });

    it("rejects a missing token", async () => {
      await assert.rejects(
        verifyGoogleIdToken(""),
        (err) => err.statusCode === 400 && /ID token is required/.test(err.message)
      );
    });

    it("rejects an invalid signature, wrong audience, wrong issuer, or expired token", async () => {
      setGoogleVerifier(async () => {
        throw new Error("token verification failed");
      });

      await assert.rejects(
        verifyGoogleIdToken("bad.token"),
        (err) => err.statusCode === 401 && /Invalid Google credentials/.test(err.message)
      );
    });

    it("fails with 503 when GOOGLE_WEB_CLIENT_ID is not configured", async () => {
      delete process.env.GOOGLE_WEB_CLIENT_ID;

      await assert.rejects(
        verifyGoogleIdToken("some.token"),
        (err) => err.statusCode === 503 && /GOOGLE_WEB_CLIENT_ID/.test(err.message)
      );
    });
  });

  describe("authenticateGoogle", () => {
    it("rejects when the verified email is not confirmed", async () => {
      setGoogleVerifier(async () => verifiedPayload({ email_verified: false }));

      await assert.rejects(
        authenticateGoogle({ idToken: "t" }),
        (err) => err.statusCode === 400 && /verified Google email/.test(err.message)
      );
    });

    it("rejects when no verified email is present", async () => {
      setGoogleVerifier(async () => verifiedPayload({ email: undefined }));

      await assert.rejects(
        authenticateGoogle({ idToken: "t" }),
        (err) => err.statusCode === 400 && /verified Google email/.test(err.message)
      );
    });

    it("returns an existing Google user and preserves its role, ignoring the submitted role", async () => {
      setGoogleVerifier(async () => verifiedPayload());
      mock.method(User, "findOne", async (filter) => {
        if (filter.authProviders) {
          return googleUser({ role: "employer", name: "Existing Employer" });
        }
        return null;
      });
      const created = [];
      mock.method(User, "create", async (data) => {
        created.push(data);
        return data;
      });

      const session = await authenticateGoogle({ idToken: "t", role: "worker" });

      assert.equal(session.isNewUser, false);
      assert.equal(session.user.role, "employer");
      assert.equal(created.length, 0);

      const decoded = jwt.verify(session.token, process.env.JWT_SECRET);
      assert.equal(decoded.userId, "u1");
      assert.equal(decoded.role, "employer");
    });

    it("creates a new Google user with verified claims and Google provider metadata", async () => {
      setGoogleVerifier(async () => verifiedPayload({ sub: "newsub", email: "new@example.com", name: "New User" }));
      mock.method(User, "findOne", async () => null);
      mock.method(User, "create", async (data) => ({ _id: "u2", ...data }));

      const session = await authenticateGoogle({ idToken: "t", role: "worker" });

      assert.equal(session.isNewUser, true);
      assert.equal(session.user.name, "New User");
      assert.equal(session.user.email, "new@example.com");
      assert.equal(session.user.role, "worker");

      const entry = User.create.mock.calls[0].arguments[0].authProviders[0];
      assert.equal(entry.provider, "google");
      assert.equal(entry.providerId, "newsub");
      assert.equal(entry.email, "new@example.com");
      assert.ok(entry.linkedAt instanceof Date);

      const decoded = jwt.verify(session.token, process.env.JWT_SECRET);
      assert.equal(decoded.userId, "u2");
      assert.equal(decoded.role, "worker");
    });

    it("uses the verified name, never a client-supplied name", async () => {
      setGoogleVerifier(async () => verifiedPayload({ sub: "s", email: "e@example.com", name: "Claimed Name" }));
      mock.method(User, "findOne", async () => null);
      mock.method(User, "create", async (data) => ({ _id: "u3", ...data }));

      const session = await authenticateGoogle({ idToken: "t", role: "worker" });

      assert.equal(session.user.name, "Claimed Name");
    });

    it("requires a role for a new account", async () => {
      setGoogleVerifier(async () => verifiedPayload());
      mock.method(User, "findOne", async () => null);

      await assert.rejects(
        authenticateGoogle({ idToken: "t", role: undefined }),
        (err) => err.statusCode === 400 && /Role is required/.test(err.message)
      );
    });

    it("rejects when the verified email matches an existing email/password account", async () => {
      setGoogleVerifier(async () => verifiedPayload());
      mock.method(User, "findOne", async (filter) => {
        if (filter.authProviders) {
          return null;
        }
        return googleUser({ role: "employer" });
      });
      const created = [];
      mock.method(User, "create", async (data) => {
        created.push(data);
        return data;
      });

      await assert.rejects(
        authenticateGoogle({ idToken: "t", role: "worker" }),
        (err) => err.statusCode === 409 && /already exists/.test(err.message)
      );
      assert.equal(created.length, 0);
    });

    it("recovers from a duplicate-key race by reusing the existing Google user", async () => {
      setGoogleVerifier(async () => verifiedPayload({ sub: "dup" }));
      let googleFindCount = 0;
      mock.method(User, "findOne", async (filter) => {
        if (filter.authProviders) {
          googleFindCount += 1;
          return googleFindCount === 1
            ? null
            : googleUser({ role: "employer", name: "Winner" });
        }
        return null;
      });
      mock.method(User, "create", async () => {
        const error = new Error("duplicate key");
        error.code = 11000;
        throw error;
      });

      const session = await authenticateGoogle({ idToken: "t", role: "worker" });

      assert.equal(session.user.id, "u1");
      assert.equal(session.user.role, "employer");
    });
  });

  describe("google provider helpers", () => {
    it("builds a canonical google provider entry from the verified sub", async () => {
      const entry = buildGoogleProviderEntry("google-sub-123", "  Foo@Example.COM  ");

      assert.equal(entry.provider, "google");
      assert.equal(entry.providerId, "google-sub-123");
      assert.equal(entry.email, "foo@example.com");
      assert.ok(entry.linkedAt instanceof Date);
    });

    it("findUserByGoogle queries the google provider elemMatch filter", async () => {
      const calls = [];
      mock.method(User, "findOne", async (filter) => {
        calls.push(filter);
        return googleUser();
      });

      const user = await findUserByGoogle("google-sub-123");

      assert.equal(user.role, "worker");
      assert.deepEqual(calls[0], {
        authProviders: {
          $elemMatch: { provider: "google", providerId: "google-sub-123" },
        },
      });
    });
  });
});