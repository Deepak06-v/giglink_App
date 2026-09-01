import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import WorkerProfile from "../models/WorkerProfile.js";
import {
  getWorkerProfile,
  createOrUpdateWorkerProfile,
} from "./workerProfile.service.js";

describe("getWorkerProfile", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns the stored profile including weeklyAvailability", async () => {
    const profile = {
      user: "aaaaaaaaaaaaaaaaaaaaaaaa",
      phone: "+919999999999",
      availability: "AVAILABLE",
      weeklyAvailability: [
        { day: 1, startTime: "09:00", endTime: "18:00" },
        { day: 5, startTime: "10:00", endTime: "14:00" },
      ],
    };
    mock.method(WorkerProfile, "findOne", () => Promise.resolve(profile));

    const result = await getWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result, profile);
    assert.deepEqual(result.weeklyAvailability, profile.weeklyAvailability);
  });

  it("returns a backward-compatible default for a profile without weeklyAvailability", async () => {
    const profile = { user: "aaaaaaaaaaaaaaaaaaaaaaaa", availability: "AVAILABLE" };
    mock.method(WorkerProfile, "findOne", () => Promise.resolve(profile));

    const result = await getWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.weeklyAvailability, undefined);
    // Legacy profile without the field still works.
    assert.equal(result.availability, "AVAILABLE");
  });

  it("returns the empty default object (weeklyAvailability: []) when no profile exists", async () => {
    mock.method(WorkerProfile, "findOne", () => Promise.resolve(null));

    const result = await getWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.user, "aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.deepEqual(result.weeklyAvailability, []);
  });
});

describe("createOrUpdateWorkerProfile", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("persists weeklyAvailability via $set and returns the updated profile", async () => {
    const savedProfile = {
      user: "aaaaaaaaaaaaaaaaaaaaaaaa",
      availability: "AVAILABLE",
      weeklyAvailability: [{ day: 1, startTime: "09:00", endTime: "18:00" }],
    };

    let capturedQuery = null;
    let capturedUpdate = null;
    mock.method(WorkerProfile, "findOneAndUpdate", (query, update) => {
      capturedQuery = query;
      capturedUpdate = update;
      return Promise.resolve(savedProfile);
    });

    const result = await createOrUpdateWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa", {
      availability: "AVAILABLE",
      weeklyAvailability: [{ day: 1, startTime: "09:00", endTime: "18:00" }],
    });

    assert.deepEqual(capturedQuery, { user: "aaaaaaaaaaaaaaaaaaaaaaaa" });
    assert.deepEqual(capturedUpdate.$set.weeklyAvailability, [
      { day: 1, startTime: "09:00", endTime: "18:00" },
    ]);
    assert.deepEqual(result.weeklyAvailability, savedProfile.weeklyAvailability);
  });

  it("clears weeklyAvailability when sent as an empty array", async () => {
    const clearedProfile = {
      user: "aaaaaaaaaaaaaaaaaaaaaaaa",
      availability: "AVAILABLE",
      weeklyAvailability: [],
    };
    mock.method(WorkerProfile, "findOneAndUpdate", (_query, update) => {
      assert.deepEqual(update.$set.weeklyAvailability, []);
      return Promise.resolve(clearedProfile);
    });

    const result = await createOrUpdateWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa", {
      weeklyAvailability: [],
    });

    assert.deepEqual(result.weeklyAvailability, []);
  });

  it("supports partial updates without requiring weeklyAvailability", async () => {
    const profile = { user: "aaaaaaaaaaaaaaaaaaaaaaaa", bio: "hello" };
    mock.method(WorkerProfile, "findOneAndUpdate", (_query, _update) =>
      Promise.resolve(profile)
    );

    const result = await createOrUpdateWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa", {
      bio: "hello",
    });
    assert.equal(result.bio, "hello");
    assert.equal(result.weeklyAvailability, undefined);
  });

  it("protects against writing the user field back", async () => {
    let capturedUpdate = null;
    mock.method(WorkerProfile, "findOneAndUpdate", (_query, update) => {
      capturedUpdate = update;
      return Promise.resolve({});
    });

    await createOrUpdateWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa", {
      user: "malicious-user-id",
      bio: "hello",
    });

    assert.equal(capturedUpdate.$set.user, undefined);
    assert.equal(capturedUpdate.$set.bio, "hello");
  });
});
