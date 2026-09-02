import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import WorkerProfile from "../models/WorkerProfile.js";
import {
  getWorkerProfile,
  createOrUpdateWorkerProfile,
} from "./workerProfile.service.js";

const USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

// A mock query that mimics mongoose: calling .lean() returns a plain object
// (whatever the store hands back).
function queryResult(value) {
  return {
    lean: async () => value,
  };
}

describe("getWorkerProfile", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns the stored profile including simple availability", async () => {
    const profile = {
      user: USER_ID,
      phone: "+919999999999",
      bio: "Hello",
      availability: "AVAILABLE",
    };
    mock.method(WorkerProfile, "findOne", () => queryResult(profile));

    const result = await getWorkerProfile(USER_ID);
    assert.equal(result, profile);
    assert.equal(result.availability, "AVAILABLE");
  });

  it("returns the stored UNAVAILABLE value", async () => {
    const profile = {
      user: USER_ID,
      availability: "UNAVAILABLE",
    };
    mock.method(WorkerProfile, "findOne", () => queryResult(profile));

    const result = await getWorkerProfile(USER_ID);
    assert.equal(result.availability, "UNAVAILABLE");
  });

  it("returns the empty default object with availability AVAILABLE when no profile exists", async () => {
    mock.method(WorkerProfile, "findOne", () => queryResult(null));

    const result = await getWorkerProfile(USER_ID);
    assert.equal(result.user, USER_ID);
    assert.equal(result.availability, "AVAILABLE");
  });

  it("returns all worker fields as plain top-level values (no _doc leak)", async () => {
    const profile = {
      user: USER_ID,
      phone: "9876543210",
      profileImage: "https://cdn.example.com/pic.png",
      bio: "TEST WORKER BIO 456",
      location: { city: "Bengaluru", state: "KA", pincode: "560001" },
      skills: ["Delivery", "Packing"],
      experience: "2 years",
      languages: ["English", "Kannada"],
      availability: "AVAILABLE",
    };
    mock.method(WorkerProfile, "findOne", () => queryResult(profile));

    const result = await getWorkerProfile(USER_ID);
    // Every field the mobile card/edit form reads must be present at the top level
    // and survive res.json serialization unchanged.
    const serialized = JSON.parse(JSON.stringify(result));
    assert.equal(serialized.phone, "9876543210");
    assert.equal(serialized.bio, "TEST WORKER BIO 456");
    assert.equal(serialized.location.city, "Bengaluru");
    assert.deepEqual(serialized.skills, ["Delivery", "Packing"]);
    assert.equal(serialized.availability, "AVAILABLE");
    assert.equal(serialized._doc, undefined);
  });

  it("REGRESSION: a hydrated mongoose doc from findOne is returned as a plain object", async () => {
    // Simulate the real data store: findOne resolves to a *hydrated* WorkerProfile
    // document (mongoose default without .lean()). Spreading it hides field values
    // under `_doc`, so the controller's `{ ...profile, completion }` would deliver
    // them as undefined — exactly the empty-card / empty-edit-form bug. The service
    // must .lean() so the fields are top-level.
    const doc = new WorkerProfile({
      user: USER_ID,
      phone: "9876543210",
      bio: "TEST WORKER BIO 456",
      location: { city: "Bengaluru", state: "KA", pincode: "560001" },
      skills: ["Delivery", "Packing"],
      experience: "2 years",
      availability: "AVAILABLE",
    });

    // Prove the failing scenario is real: spreading the hydrated document does NOT
    // put the field values at the top level.
    const rawSpread = { ...doc };
    assert.equal(rawSpread.phone, undefined);

    mock.method(WorkerProfile, "findOne", () => ({
      lean: async () => doc.toObject(),
    }));

    const result = await getWorkerProfile(USER_ID);
    assert.equal(result.phone, "9876543210");
    assert.equal(result.bio, "TEST WORKER BIO 456");
    assert.equal(result.location.city, "Bengaluru");
    assert.deepEqual(result.skills, ["Delivery", "Packing"]);
    const serialized = JSON.parse(JSON.stringify(result));
    assert.equal(serialized.phone, "9876543210");
    assert.equal(serialized._doc, undefined);
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
      user: USER_ID,
      availability: "UNAVAILABLE",
    };

    let capturedQuery = null;
    let capturedUpdate = null;
    mock.method(WorkerProfile, "findOneAndUpdate", (query, update) => {
      capturedQuery = query;
      capturedUpdate = update;
      return queryResult(savedProfile);
    });

    const result = await createOrUpdateWorkerProfile(USER_ID, {
      availability: "UNAVAILABLE",
    });

    assert.deepEqual(capturedQuery, { user: USER_ID });
    assert.deepEqual(capturedUpdate.$set, { availability: "UNAVAILABLE" });
    assert.equal(result.availability, "UNAVAILABLE");
  });

  it("supports partial updates without requiring availability", async () => {
    const profile = { user: USER_ID, bio: "hello" };
    mock.method(WorkerProfile, "findOneAndUpdate", (_query, _update) =>
      queryResult(profile)
    );

    const result = await createOrUpdateWorkerProfile(USER_ID, {
      bio: "hello",
    });
    assert.equal(result.bio, "hello");
  });

  it("REGRESSION: a hydrated doc from findOneAndUpdate is returned as a plain object", async () => {
    const saved = new WorkerProfile({
      user: USER_ID,
      phone: "9876543210",
      bio: "TEST WORKER BIO 456",
      availability: "AVAILABLE",
    });

    mock.method(WorkerProfile, "findOneAndUpdate", () => ({
      lean: async () => saved.toObject(),
    }));

    const result = await createOrUpdateWorkerProfile(USER_ID, {
      phone: "9876543210",
      bio: "TEST WORKER BIO 456",
    });

    const serialized = JSON.parse(JSON.stringify(result));
    assert.equal(serialized.phone, "9876543210");
    assert.equal(serialized.bio, "TEST WORKER BIO 456");
    assert.equal(serialized._doc, undefined);
  });

  it("protects against writing the user field back", async () => {
    let capturedUpdate = null;
    mock.method(WorkerProfile, "findOneAndUpdate", (_query, update) => {
      capturedUpdate = update;
      return queryResult({});
    });

    await createOrUpdateWorkerProfile(USER_ID, {
      user: "malicious-user-id",
      bio: "hello",
    });

    assert.equal(capturedUpdate.$set.user, undefined);
    assert.equal(capturedUpdate.$set.bio, "hello");
  });
});