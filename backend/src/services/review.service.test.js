import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";
import { getUserReviews, getUserRatingSummary } from "./review.service.js";

function reviewChain(docs) {
  const q = {
    sort: () => q,
    skip: () => q,
    limit: () => q,
    populate: () => q,
    lean: async () => docs,
  };
  return q;
}

function selectLean(doc) {
  return { select: () => ({ lean: async () => doc }) };
}

describe("getUserReviews is role-agnostic", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("returns reviews for an employer reviewee with worker reviewers", async () => {
    const revieweeId = new mongoose.Types.ObjectId();
    const workerReviewer = {
      _id: new mongoose.Types.ObjectId(),
      name: "Ravi",
    };
    const docs = [
      {
        _id: new mongoose.Types.ObjectId(),
        reviewee: revieweeId,
        reviewer: workerReviewer,
        job: { _id: new mongoose.Types.ObjectId(), title: "Delivery", category: "DELIVERY" },
        rating: 5,
        comment: "Great",
        createdAt: new Date(),
      },
    ];

    mock.method(Review, "find", () => reviewChain(docs));
    mock.method(Review, "countDocuments", async () => 1);
    mock.method(
      WorkerProfile,
      "findOne",
      () => selectLean({ profileImage: "https://example.com/ravi.jpg" })
    );

    const result = await getUserReviews(revieweeId.toString(), 1, 20);

    assert.equal(result.pagination.total, 1);
    assert.equal(result.reviews[0].reviewer.name, "Ravi");
    assert.equal(result.reviews[0].reviewer.profileImage, "https://example.com/ravi.jpg");
  });

  it("returns reviews for a worker reviewee with employer reviewers", async () => {
    const revieweeId = new mongoose.Types.ObjectId();
    const employerReviewer = {
      _id: new mongoose.Types.ObjectId(),
      name: "Acme Corp",
    };
    const docs = [
      {
        _id: new mongoose.Types.ObjectId(),
        reviewee: revieweeId,
        reviewer: employerReviewer,
        job: null,
        rating: 4,
        comment: "Punctual",
        createdAt: new Date(),
      },
    ];

    mock.method(Review, "find", () => reviewChain(docs));
    mock.method(Review, "countDocuments", async () => 1);
    mock.method(WorkerProfile, "findOne", () => selectLean(null));
    mock.method(
      EmployerProfile,
      "findOne",
      () => selectLean({ companyName: "Acme Corp", logo: "https://example.com/acme.png" })
    );

    const result = await getUserReviews(revieweeId.toString(), 1, 20);

    assert.equal(result.reviews[0].reviewer.companyName, "Acme Corp");
    assert.equal(result.reviews[0].reviewer.logo, "https://example.com/acme.png");
    assert.equal(result.reviews[0].job, null);
  });

  it("handles a deleted (null) reviewer without crashing", async () => {
    const revieweeId = new mongoose.Types.ObjectId();
    const docs = [
      {
        _id: new mongoose.Types.ObjectId(),
        reviewee: revieweeId,
        reviewer: null,
        job: null,
        rating: 3,
        comment: "ok",
        createdAt: new Date(),
      },
    ];

    mock.method(Review, "find", () => reviewChain(docs));
    mock.method(Review, "countDocuments", async () => 1);

    const result = await getUserReviews(revieweeId.toString(), 1, 20);

    assert.equal(result.reviews[0].reviewer.id, null);
    assert.equal(result.reviews[0].reviewer.name, "Deleted User");
  });
});

describe("getUserRatingSummary is role-agnostic", () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("computes average and count for any reviewee id", async () => {
    mock.method(Review, "aggregate", async () => [{ averageRating: 4.28, totalReviews: 7 }]);

    const result = await getUserRatingSummary(new mongoose.Types.ObjectId().toString());

    assert.equal(result.averageRating, 4.3);
    assert.equal(result.totalReviews, 7);
  });

  it("returns zeros when no reviews exist", async () => {
    mock.method(Review, "aggregate", async () => []);

    const result = await getUserRatingSummary(new mongoose.Types.ObjectId().toString());

    assert.deepEqual(result, { averageRating: null, totalReviews: 0 });
  });
});