import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import WorkerProfile from "../models/WorkerProfile.js";
import User from "../models/User.js";
import {
  getWorkerProfileController,
  updateWorkerProfileController,
} from "../controllers/workerProfile.controller.js";

// Build a fake Express res that captures the JSON body.
function fakeRes() {
  return {
    body: null,
    statusCode: 200,
    json(obj) {
      this.body = obj;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
}

// getWorkerProfile calls WorkerProfile.findOne({...}).lean();
// getWorkerProfileCompletion calls User.findById + WorkerProfile.findOne, both .lean().
function mockProfileStore(profile, userName = "Rahul") {
  mock.method(WorkerProfile, "findOne", () => ({ lean: () => Promise.resolve(profile) }));
  mock.method(User, "findById", () => ({
    select: () => ({ lean: () => Promise.resolve({ name: userName }) }),
  }));
}

describe("getWorkerProfileController response shape", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns data.profile = { worker fields, completion } — the shape the mobile client reads", async () => {
    const profile = {
      user: "w1",
      phone: "9876543210",
      profileImage: "https://cdn.example.com/pic.png",
      bio: "TEST WORKER BIO 456",
      location: { city: "Bengaluru", state: "KA", pincode: "560001" },
      skills: ["Delivery", "Packing"],
      experience: "2 years",
      languages: ["English", "Kannada"],
      availability: "AVAILABLE",
    };
    mockProfileStore(profile);

    const req = { user: { userId: "w1" } };
    const res = fakeRes();
    await getWorkerProfileController(req, res);

    // The mobile client reads response.data.data.profile and renders its fields.
    const mobileProfile = res.body.data.profile;
    assert.equal(mobileProfile.phone, "9876543210");
    assert.equal(mobileProfile.bio, "TEST WORKER BIO 456");
    assert.deepEqual(mobileProfile.skills, ["Delivery", "Packing"]);
    assert.equal(mobileProfile.location.city, "Bengaluru");
    assert.equal(mobileProfile.availability, "AVAILABLE");
    // Completion is computed from the same persisted doc the controller returns.
    assert.equal(mobileProfile.completion.complete, true);
    assert.equal(mobileProfile.completion.percentage, 100);
  });

  it("REGRESSION: a real hydrated mongoose doc is serialized with top-level fields (no _doc leak)", async () => {
    // Simulate the actual data store: findOne resolves to a *hydrated* WorkerProfile
    // document (mongoose default without .lean()). Spreading it hides field values
    // under `_doc`, so the API would deliver data.profile.phone as undefined even
    // though completion (read via .lean()) is 100%. The service must .lean() first.
    const doc = new WorkerProfile({
      user: "w1",
      phone: "9876543210",
      profileImage: "https://cdn.example.com/pic.png",
      bio: "TEST WORKER BIO 456",
      location: { city: "Bengaluru", state: "KA", pincode: "560001" },
      skills: ["Delivery", "Packing"],
      experience: "2 years",
      availability: "AVAILABLE",
    });

    mock.method(WorkerProfile, "findOne", () => ({
      lean: () => Promise.resolve(doc.toObject()),
    }));
    mock.method(User, "findById", () => ({
      select: () => ({ lean: () => Promise.resolve({ name: "Rahul" }) }),
    }));

    const req = { user: { userId: "w1" } };
    const res = fakeRes();
    await getWorkerProfileController(req, res);

    const mobileProfile = res.body.data.profile;
    assert.equal(mobileProfile.phone, "9876543210");
    assert.equal(mobileProfile.bio, "TEST WORKER BIO 456");
    assert.equal(mobileProfile.location.city, "Bengaluru");
    assert.deepEqual(mobileProfile.skills, ["Delivery", "Packing"]);
    assert.equal(mobileProfile.experience, "2 years");
    assert.equal(mobileProfile.availability, "AVAILABLE");
    assert.equal(mobileProfile._doc, undefined);
    assert.equal(mobileProfile.completion.percentage, 100);
  });

  it("completion is derived from the same source as the stored profile (cannot disagree)", async () => {
    // Partial worker profile: stored fields are missing, so completion is partial —
    // but the same document drives both the displayed fields and the % badge.
    const incomplete = {
      user: "w1",
      phone: "",
      bio: "",
      location: { city: "", state: "", pincode: "" },
      skills: [],
      experience: "",
      availability: "AVAILABLE",
    };
    mockProfileStore(incomplete);

    const req = { user: { userId: "w1" } };
    const res = fakeRes();
    await getWorkerProfileController(req, res);

    const mobileProfile = res.body.data.profile;
    assert.equal(mobileProfile.availability, "AVAILABLE");
    assert.equal(mobileProfile.completion.complete, false);
    assert.ok(mobileProfile.completion.missingFields.includes("PHONE"));
    assert.ok(mobileProfile.completion.missingFields.includes("SKILLS"));
  });

  it("returns an error JSON with a 500 on service failure", async () => {
    mock.method(WorkerProfile, "findOne", () => {
      throw new Error("boom");
    });

    const req = { user: { userId: "w1" } };
    const res = fakeRes();
    await getWorkerProfileController(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});

describe("updateWorkerProfileController", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns the updated profile as a plain object (partial edits preserved)", async () => {
    const saved = {
      user: "w1",
      phone: "8888888888",
      bio: "TEST WORKER BIO 456",
      availability: "AVAILABLE",
    };

    let capturedSet = null;
    mock.method(WorkerProfile, "findOneAndUpdate", (_query, update) => {
      capturedSet = update.$set;
      return { lean: () => Promise.resolve(saved) };
    });

    const req = { user: { userId: "w1" }, body: { phone: "8888888888" } };
    const res = fakeRes();
    await updateWorkerProfileController(req, res);

    assert.deepEqual(capturedSet, { phone: "8888888888" });
    const mobileProfile = res.body.data.profile;
    assert.equal(mobileProfile.phone, "8888888888");
    assert.equal(mobileProfile.bio, "TEST WORKER BIO 456");
    assert.equal(mobileProfile._doc, undefined);
  });
});
