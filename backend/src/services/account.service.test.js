import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";
import DeviceToken from "../models/DeviceToken.js";
import Notification from "../models/Notification.js";
import PhoneOtp from "../models/PhoneOtp.js";
import { deleteAccount } from "./account.service.js";

describe("deleteAccount", () => {
  let savedUser;
  let updateArgs;

  beforeEach(() => {
    mock.restoreAll();
    savedUser = {
      _id: { toString: () => "user-1" },
      name: "Ravi",
      email: "ravi@example.com",
      isVerified: true,
      deletedAt: null,
      authProviders: [
        { provider: "email", providerId: "ravi@example.com" },
        { provider: "phone", providerId: "91-1234567890", phone: "911234567890" },
      ],
    };
    updateArgs = null;

    mock.method(User, "findById", async () => savedUser);
    mock.method(User, "updateOne", async (filter, update) => {
      updateArgs = { filter, update };
    });
    mock.method(WorkerProfile, "deleteMany", async () => ({ deletedCount: 1 }));
    mock.method(EmployerProfile, "deleteMany", async () => ({ deletedCount: 1 }));
    mock.method(DeviceToken, "deleteMany", async () => ({ deletedCount: 1 }));
    mock.method(Notification, "deleteMany", async () => ({ deletedCount: 2 }));
    mock.method(PhoneOtp, "deleteMany", async () => ({ deletedCount: 1 }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("deletes profile, device, notification, and OTP records", async () => {
    await deleteAccount("user-1");

    assert.equal(WorkerProfile.deleteMany.mock.calls[0].arguments[0].user, "user-1");
    assert.equal(EmployerProfile.deleteMany.mock.calls[0].arguments[0].user, "user-1");
    assert.equal(DeviceToken.deleteMany.mock.calls[0].arguments[0].userId, "user-1");
    assert.equal(Notification.deleteMany.mock.calls[0].arguments[0].recipient, "user-1");
    assert.deepEqual(PhoneOtp.deleteMany.mock.calls[0].arguments[0], {
      phone: "911234567890",
    });
  });

  it("anonymizes the user via updateOne, unsetting email and password", async () => {
    await deleteAccount("user-1");

    assert.deepEqual(updateArgs.filter, { _id: "user-1" });
    assert.equal(updateArgs.update.$set.name, "Deleted User");
    assert.deepEqual(updateArgs.update.$set.authProviders, []);
    assert.equal(updateArgs.update.$set.isVerified, false);
    assert.ok(updateArgs.update.$set.deletedAt instanceof Date);
    assert.deepEqual(updateArgs.update.$unset, { email: 1, password: 1 });
    assert.equal(User.updateOne.mock.calls.length, 1);
  });

  it("does not touch Jobs, Applications, Assignments, or Reviews", async () => {
    await deleteAccount("user-1");

    assert.equal(WorkerProfile.deleteMany.mock.calls.length, 1);
    assert.equal(EmployerProfile.deleteMany.mock.calls.length, 1);
    assert.equal(DeviceToken.deleteMany.mock.calls.length, 1);
    assert.equal(Notification.deleteMany.mock.calls.length, 1);
    assert.equal(PhoneOtp.deleteMany.mock.calls.length, 1);
    assert.equal(User.updateOne.mock.calls.length, 1);
  });

  it("throws 404 for a missing user", async () => {
    mock.method(User, "findById", async () => null);

    await assert.rejects(
      () => deleteAccount("missing"),
      (err) => err.statusCode === 404 && err.message === "User not found"
    );
    assert.equal(User.updateOne.mock.calls.length, 0);
  });

  it("throws 404 for an already-deleted user", async () => {
    savedUser.deletedAt = new Date();

    await assert.rejects(
      () => deleteAccount("user-1"),
      (err) => err.statusCode === 404 && err.message === "User not found"
    );
    assert.equal(User.updateOne.mock.calls.length, 0);
  });
});