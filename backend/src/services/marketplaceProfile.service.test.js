import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";
import Review from "../models/Review.js";
import {
  getWorkerMarketplaceProfile,
  getEmployerMarketplaceProfile,
} from "./marketplaceProfile.service.js";

const WORKER_USER = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Rahul Kumar" };
const EMPLOYER_USER = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Acme Events" };

const FULL_WORKER = {
  _id: "wp1",
  user: "aaaaaaaaaaaaaaaaaaaaaaaa",
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
  user: "bbbbbbbbbbbbbbbbbbbbbbbb",
  companyName: "Acme Events",
  companyDescription: "We run great events",
  phone: "+919888888888",
  logo: "https://cdn.example.com/logo.png",
  address: "100 Main Rd",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
};

const RATING = { averageRating: 4.2, totalReviews: 11 };
const NO_RATING = { averageRating: null, totalReviews: 0 };

// getUserRatingSummary runs Review.aggregate([...]) and returns
// { averageRating: null, totalReviews: 0 } when no reviews match.
function mockRating(rating) {
  if (rating && rating.totalReviews > 0) {
    mock.method(Review, "aggregate", async () => [
      { averageRating: rating.averageRating, totalReviews: rating.totalReviews },
    ]);
  } else {
    mock.method(Review, "aggregate", async () => []);
  }
}

function mockWorker({ user, profile, rating }) {
  mock.method(User, "findById", () => ({ select: () => ({ lean: async () => user ?? null }) }));
  mock.method(WorkerProfile, "findOne", () => ({ lean: async () => profile ?? null }));
  mockRating(rating);
}

function mockEmployer({ user, profile, rating }) {
  mock.method(User, "findById", () => ({ select: () => ({ lean: async () => user ?? null }) }));
  mock.method(EmployerProfile, "findOne", () => ({ lean: async () => profile ?? null }));
  mockRating(rating);
}

describe("getWorkerMarketplaceProfile", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns null when the WorkerProfile does not exist", async () => {
    mockWorker({ user: WORKER_USER, profile: null, rating: NO_RATING });
    const result = await getWorkerMarketplaceProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result, null);
  });

  it("exposes public fields and includes the rating summary", async () => {
    mockWorker({ user: WORKER_USER, profile: FULL_WORKER, rating: RATING });
    const result = await getWorkerMarketplaceProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.id, "aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.name, "Rahul Kumar");
    assert.equal(result.profileImage, FULL_WORKER.profileImage);
    assert.equal(result.bio, FULL_WORKER.bio);
    assert.deepEqual(result.skills, FULL_WORKER.skills);
    assert.equal(result.experience, FULL_WORKER.experience);
    assert.deepEqual(result.languages, FULL_WORKER.languages);
    assert.equal(result.availability, "AVAILABLE");
    assert.deepEqual(result.location, { city: "Mumbai", state: "Maharashtra" });
    assert.deepEqual(result.rating, RATING);
  });

  it("never exposes phone, email, pincode or address", async () => {
    mockWorker({ user: WORKER_USER, profile: FULL_WORKER, rating: RATING });
    const result = await getWorkerMarketplaceProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.phone, undefined);
    assert.equal(result.email, undefined);
    assert.equal(result.location.pincode, undefined);
    assert.equal(result.location.address, undefined);
    assert.deepEqual(Object.keys(result).sort(), [
      "availability",
      "bio",
      "experience",
      "id",
      "languages",
      "location",
      "name",
      "profileImage",
      "rating",
      "skills",
    ]);
  });

  it("omits empty optional fields", async () => {
    const profile = { user: "aaaaaaaaaaaaaaaaaaaaaaaa", profileImage: "", bio: "", skills: [], availability: "UNAVAILABLE" };
    mockWorker({ user: { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Rahul" }, profile, rating: NO_RATING });
    const result = await getWorkerMarketplaceProfile("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.profileImage, undefined);
    assert.equal(result.bio, undefined);
    assert.equal(result.skills, undefined);
    assert.equal(result.languages, undefined);
    assert.equal(result.experience, undefined);
    assert.equal(result.availability, "UNAVAILABLE");
  });

  it("handles a missing user (falls back to userId) while still returning the profile", async () => {
    mockWorker({ user: null, profile: FULL_WORKER, rating: NO_RATING });
    const result = await getWorkerMarketplaceProfile("cccccccccccccccccccccccc");
    assert.equal(result.id, "cccccccccccccccccccccccc");
    assert.equal(result.name, undefined);
  });
});

describe("getEmployerMarketplaceProfile", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns null when the EmployerProfile does not exist", async () => {
    mockEmployer({ user: EMPLOYER_USER, profile: null, rating: NO_RATING });
    const result = await getEmployerMarketplaceProfile("bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(result, null);
  });

  it("exposes public fields and includes the rating summary", async () => {
    mockEmployer({ user: EMPLOYER_USER, profile: FULL_EMPLOYER, rating: RATING });
    const result = await getEmployerMarketplaceProfile("bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(result.id, "bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(result.companyName, "Acme Events");
    assert.equal(result.logo, FULL_EMPLOYER.logo);
    assert.equal(result.companyDescription, FULL_EMPLOYER.companyDescription);
    assert.deepEqual(result.location, { city: "Pune", state: "Maharashtra" });
    assert.deepEqual(result.rating, RATING);
  });

  it("never exposes phone, address, email or pincode", async () => {
    mockEmployer({ user: EMPLOYER_USER, profile: FULL_EMPLOYER, rating: RATING });
    const result = await getEmployerMarketplaceProfile("bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(result.phone, undefined);
    assert.equal(result.email, undefined);
    assert.equal(result.address, undefined);
    assert.equal(result.location.pincode, undefined);
    assert.deepEqual(Object.keys(result).sort(), [
      "companyDescription",
      "companyName",
      "id",
      "location",
      "logo",
      "rating",
    ]);
  });

  it("omits empty optional fields", async () => {
    const profile = { user: "bbbbbbbbbbbbbbbbbbbbbbbb", companyName: "Acme", logo: "", companyDescription: "" };
    mockEmployer({ user: { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Acme" }, profile, rating: NO_RATING });
    const result = await getEmployerMarketplaceProfile("bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(result.companyName, "Acme");
    assert.equal(result.logo, undefined);
    assert.equal(result.companyDescription, undefined);
    assert.deepEqual(result.location, { city: undefined, state: undefined });
  });
});
