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

  it("returns the stored profile including simple availability", async () => {
    const profile = {
      user: "aaaaaaaaaaaaaaaaaaaaaaaa",
      phone: "+919999999999",
      bio: "Hello",
      availability: "AVAILABLE",
    };
    mock.method(WorkerProfile, "findOne", () => Promise.resolve(profile));

    const result = await getWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result, profile);
    assert.equal(result.availability, "AVAILABLE");
  });

  it("returns the stored UNAVAILABLE value", async () => {
    const profile = {
      user: "aaaaaaaaaaaaaaaaaaaaaaaa",
      availability: "UNAVAILABLE",
    };
    mock.method(WorkerProfile, "findOne", () => Promise.resolve(profile));

    const result = await getWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.availability, "UNAVAILABLE");
  });

  it("returns the empty default object with availability AVAILABLE when no profile exists", async () => {
    mock.method(WorkerProfile, "findOne", () => Promise.resolve(null));

    const result = await getWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.user, "aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.availability, "AVAILABLE");
  });
});

describe("createOrUpdateWorkerProfile", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("persists availability via $set and returns the updated profile", async () => {
    const savedProfile = {
      user: "aaaaaaaaaaaaaaaaaaaaaaaa",
      availability: "UNAVAILABLE",
    };

    let capturedQuery = null;
    let capturedUpdate = null;
    mock.method(WorkerProfile, "findOneAndUpdate", (query, update) => {
      capturedQuery = query;
      capturedUpdate = update;
      return Promise.resolve(savedProfile);
    });

    const result = await createOrUpdateWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa", {
      availability: "UNAVAILABLE",
    });

    assert.deepEqual(capturedQuery, { user: "aaaaaaaaaaaaaaaaaaaaaaaa" });
    assert.deepEqual(capturedUpdate.$set, { availability: "UNAVAILABLE" });
    assert.equal(result.availability, "UNAVAILABLE");
  });

  it("supports partial updates without requiring availability", async () => {
    const profile = { user: "aaaaaaaaaaaaaaaaaaaaaaaa", bio: "hello" };
    mock.method(WorkerProfile, "findOneAndUpdate", (_query, _update) =>
      Promise.resolve(profile)
    );

    const result = await createOrUpdateWorkerProfile("aaaaaaaaaaaaaaaaaaaaaaaa", {
      bio: "hello",
    });
    assert.equal(result.bio, "hello");
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
