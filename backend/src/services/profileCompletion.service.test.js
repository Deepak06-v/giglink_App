import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";
import {
  getWorkerProfileCompletion,
  getEmployerProfileCompletion,
} from "./profileCompletion.service.js";

const WORKER_USER = {
  _id: "w1",
  name: "Test Worker",
};

const FULL_WORKER = {
  _id: "wp1",
  user: "w1",
  phone: "+919999999999",
  profileImage: "https://cdn.example.com/worker.jpg",
  bio: "Hard working event staff",
  location: { city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  skills: ["Events", "Customer service"],
  experience: "2 years in events",
  languages: ["English", "Hindi"],
  availability: "AVAILABLE",
};

const FULL_EMPLOYER = {
  _id: "ep1",
  user: "e1",
  companyName: "Acme Events",
  companyDescription: "We run great events",
  phone: "+919888888888",
  logo: "https://cdn.example.com/logo.png",
  address: "100 Main Rd",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
};

function mockWorker({ user, profile }) {
  mock.method(User, "findById", () => ({
    select: () => ({ lean: async () => user ?? null }),
  }));
  mock.method(WorkerProfile, "findOne", () => ({ lean: async () => profile ?? null }));
}

function mockEmployer(profile) {
  mock.method(EmployerProfile, "findOne", () => ({ lean: async () => profile ?? null }));
}

describe("getWorkerProfileCompletion", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns 0% when the WorkerProfile does not exist", async () => {
    mockWorker({ user: WORKER_USER, profile: null });
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.complete, false);
    assert.equal(result.percentage, 0);
    assert.ok(result.missingFields.length > 0);
  });

  it("returns 0% when the User does not exist", async () => {
    mockWorker({ user: null, profile: FULL_WORKER });
    const result = await getWorkerProfileCompletion("missing");
    assert.equal(result.complete, false);
    assert.equal(result.percentage, 0);
  });

  it("returns incomplete for an empty/partially populated profile", async () => {
    const profile = { _id: "wp1", user: "w1", phone: "+919999999999", availability: "AVAILABLE" };
    mockWorker({ user: WORKER_USER, profile });
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.complete, false);
    assert.ok(result.percentage > 0 && result.percentage < 100);
    assert.ok(result.missingFields.includes("PROFILE_PHOTO"));
    assert.ok(result.missingFields.includes("SKILLS"));
  });

  it("computes the correct percentage for a partial profile", async () => {
    const profile = {
      _id: "wp1",
      user: "w1",
      phone: "+919999999999",
      bio: "Some bio",
      location: { city: "Mumbai", state: "Maharashtra", pincode: "400001" },
      skills: ["Events"],
      experience: "No prior experience",
      availability: "AVAILABLE",
    };
    mockWorker({ user: WORKER_USER, profile });
    // present: BIO, PHONE, LOCATION, SKILLS, EXPERIENCE, AVAILABILITY, NAME = 7/8
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.percentage, Math.round((7 / 8) * 100));
    assert.equal(result.complete, false);
    assert.deepEqual(result.missingFields, ["PROFILE_PHOTO"]);
  });

  it("is incomplete when the photo is missing", async () => {
    const profile = { ...FULL_WORKER, profileImage: "" };
    mockWorker({ user: WORKER_USER, profile });
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.complete, false);
    assert.deepEqual(result.missingFields, ["PROFILE_PHOTO"]);
  });

  it("is incomplete when skills are missing", async () => {
    const profile = { ...FULL_WORKER, skills: [] };
    mockWorker({ user: WORKER_USER, profile });
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.complete, false);
    assert.deepEqual(result.missingFields, ["SKILLS"]);
  });

  it("is incomplete when location is missing", async () => {
    const profile = { ...FULL_WORKER, location: { city: "Mumbai", state: "Maharashtra", pincode: "" } };
    mockWorker({ user: WORKER_USER, profile });
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.complete, false);
    assert.ok(result.missingFields.includes("LOCATION"));
  });

  it("is incomplete when bio is missing", async () => {
    const profile = { ...FULL_WORKER, bio: "" };
    mockWorker({ user: WORKER_USER, profile });
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.complete, false);
    assert.deepEqual(result.missingFields, ["BIO"]);
  });

  it("counts 'No prior experience' as complete", async () => {
    const profile = { ...FULL_WORKER, experience: "No prior experience" };
    mockWorker({ user: WORKER_USER, profile });
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.complete, true);
    assert.equal(result.percentage, 100);
    assert.deepEqual(result.missingFields, []);
  });

  it("does not require an email for phone-authenticated users", async () => {
    const user = { _id: "w1", name: "Phone Worker" };
    mockWorker({ user, profile: FULL_WORKER });
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.complete, true);
    assert.equal(result.percentage, 100);
  });

  it("returns 100% for a fully complete worker", async () => {
    mockWorker({ user: WORKER_USER, profile: FULL_WORKER });
    const result = await getWorkerProfileCompletion("w1");
    assert.equal(result.complete, true);
    assert.equal(result.percentage, 100);
    assert.deepEqual(result.missingFields, []);
  });
});

describe("getEmployerProfileCompletion", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns 0% when the EmployerProfile does not exist", async () => {
    mockEmployer(null);
    const result = await getEmployerProfileCompletion("e1");
    assert.equal(result.complete, false);
    assert.equal(result.percentage, 0);
    assert.ok(result.missingFields.length > 0);
  });

  it("returns incomplete for an empty/partial profile", async () => {
    mockEmployer({ _id: "ep1", user: "e1", companyName: "Acme Events" });
    const result = await getEmployerProfileCompletion("e1");
    assert.equal(result.complete, false);
    assert.ok(result.percentage > 0 && result.percentage < 100);
    assert.ok(result.missingFields.includes("COMPANY_LOGO"));
    assert.ok(result.missingFields.includes("ADDRESS"));
  });

  it("is incomplete when the logo is missing", async () => {
    mockEmployer({ ...FULL_EMPLOYER, logo: "" });
    const result = await getEmployerProfileCompletion("e1");
    assert.equal(result.complete, false);
    assert.deepEqual(result.missingFields, ["COMPANY_LOGO"]);
  });

  it("is incomplete when the description is missing", async () => {
    mockEmployer({ ...FULL_EMPLOYER, companyDescription: "" });
    const result = await getEmployerProfileCompletion("e1");
    assert.equal(result.complete, false);
    assert.deepEqual(result.missingFields, ["COMPANY_DESCRIPTION"]);
  });

  it("is incomplete when the phone is missing", async () => {
    mockEmployer({ ...FULL_EMPLOYER, phone: "" });
    const result = await getEmployerProfileCompletion("e1");
    assert.equal(result.complete, false);
    assert.deepEqual(result.missingFields, ["PHONE"]);
  });

  it("is incomplete when the address/location is missing", async () => {
    mockEmployer({ ...FULL_EMPLOYER, address: "", city: "", state: "", pincode: "" });
    const result = await getEmployerProfileCompletion("e1");
    assert.equal(result.complete, false);
    assert.ok(result.missingFields.includes("ADDRESS"));
    assert.ok(result.missingFields.includes("LOCATION"));
  });

  it("returns 100% for a fully complete employer", async () => {
    mockEmployer(FULL_EMPLOYER);
    const result = await getEmployerProfileCompletion("e1");
    assert.equal(result.complete, true);
    assert.equal(result.percentage, 100);
    assert.deepEqual(result.missingFields, []);
  });
});

describe("profileCompletion invariants", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("percentage never exceeds 100", async () => {
    mockWorker({ user: WORKER_USER, profile: FULL_WORKER });
    const result = await getWorkerProfileCompletion("w1");
    assert.ok(result.percentage <= 100);
  });

  it("percentage never falls below 0", async () => {
    mockWorker({ user: null, profile: null });
    const result = await getWorkerProfileCompletion("missing");
    assert.ok(result.percentage >= 0);
  });

  it("missingFields becomes empty at 100%", async () => {
    mockEmployer(FULL_EMPLOYER);
    const result = await getEmployerProfileCompletion("e1");
    assert.equal(result.percentage, 100);
    assert.deepEqual(result.missingFields, []);
  });

  it("availability required; weeklyAvailability legacy field does not alter percentage", async () => {
    // A worker completes with AVAILABLE (or UNAVAILABLE) — no working hours required.
    mockWorker({ user: WORKER_USER, profile: FULL_WORKER });
    const full = await getWorkerProfileCompletion("w1");
    assert.equal(full.complete, true);
    assert.equal(full.percentage, 100);

    // Removing the availability enum drops completion to 7/8 regardless of the
    // legacy weeklyAvailability field (which is no longer part of the product).
    const noEnum = {
      ...FULL_WORKER,
      availability: "",
      weeklyAvailability: [
        { day: 1, startTime: "09:00", endTime: "18:00" },
        { day: 2, startTime: "09:00", endTime: "18:00" },
      ],
    };
    mockWorker({ user: WORKER_USER, profile: noEnum });
    const partial = await getWorkerProfileCompletion("w1");
    assert.equal(partial.complete, false);
    assert.equal(partial.percentage, Math.round((7 / 8) * 100));
    assert.deepEqual(partial.missingFields, ["AVAILABILITY"]);
  });
});
