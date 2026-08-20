import mongoose from "mongoose";
import Review from "../models/Review.js";
import Job from "../models/Job.js";
import Assignment from "../models/Assignment.js";
import User from "../models/User.js";
import EmployerProfile from "../models/EmployerProfile.js";
import WorkerProfile from "../models/WorkerProfile.js";
import { createNotification } from "./notification.service.js";

const createEmployerReview = async (employerId, jobId, workerId, rating, comment) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.employer.toString() !== employerId) {
    const error = new Error("Access denied: not your job");
    error.statusCode = 403;
    throw error;
  }

  if (job.status !== "COMPLETED") {
    const error = new Error("Reviews can only be created for completed jobs");
    error.statusCode = 400;
    throw error;
  }

  if (job.employer.toString() === workerId) {
    const error = new Error("Cannot review yourself");
    error.statusCode = 400;
    throw error;
  }

  const assignment = await Assignment.findOne({
    job: jobId,
    worker: workerId,
    status: { $ne: "CANCELLED" },
  });

  if (!assignment) {
    const error = new Error("Worker was not assigned to this job");
    error.statusCode = 400;
    throw error;
  }

  const existingReview = await Review.findOne({
    reviewer: employerId,
    reviewee: workerId,
    job: jobId,
  });

  if (existingReview) {
    const error = new Error("You have already reviewed this worker for this job");
    error.statusCode = 409;
    throw error;
  }

  const review = await Review.create({
    reviewer: employerId,
    reviewee: workerId,
    job: jobId,
    assignment: assignment._id,
    rating,
    comment: comment || "",
  });

  await createNotification({
    recipient: workerId,
    type: "REVIEW_RECEIVED",
    title: "New review received",
    message: `You received a new review for ${job.title}.`,
    relatedJob: jobId,
    relatedAssignment: assignment._id,
  });

  return review;
};

const createWorkerReview = async (workerId, jobId, rating, comment) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.status !== "COMPLETED") {
    const error = new Error("Reviews can only be created for completed jobs");
    error.statusCode = 400;
    throw error;
  }

  if (!job.employer) {
    const error = new Error("Job has no employer");
    error.statusCode = 400;
    throw error;
  }

  const employerId = job.employer.toString();

  if (workerId === employerId) {
    const error = new Error("Cannot review yourself");
    error.statusCode = 400;
    throw error;
  }

  const assignment = await Assignment.findOne({
    job: jobId,
    worker: workerId,
    status: { $ne: "CANCELLED" },
  });

  if (!assignment) {
    const error = new Error("You were not assigned to this job");
    error.statusCode = 400;
    throw error;
  }

  const existingReview = await Review.findOne({
    reviewer: workerId,
    reviewee: employerId,
    job: jobId,
  });

  if (existingReview) {
    const error = new Error("You have already reviewed this employer for this job");
    error.statusCode = 409;
    throw error;
  }

  const review = await Review.create({
    reviewer: workerId,
    reviewee: employerId,
    job: jobId,
    assignment: assignment._id,
    rating,
    comment: comment || "",
  });

  await createNotification({
    recipient: employerId,
    type: "REVIEW_RECEIVED",
    title: "New review received",
    message: `You received a new review for ${job.title}.`,
    relatedJob: jobId,
    relatedAssignment: assignment._id,
  });

  return review;
};

const getUserReviews = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ reviewee: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reviewer", "name")
      .populate("job", "title category")
      .lean(),
    Review.countDocuments({ reviewee: userId }),
  ]);

  const enrichedReviews = await Promise.all(
    reviews.map(async (review) => {
      let reviewerInfo = {
        id: review.reviewer._id,
        name: review.reviewer.name,
      };

      const reviewerProfile = await WorkerProfile.findOne({ user: review.reviewer._id })
        .select("profileImage")
        .lean();
      if (reviewerProfile) {
        reviewerInfo.profileImage = reviewerProfile.profileImage;
      } else {
        const employerProfile = await EmployerProfile.findOne({ user: review.reviewer._id })
          .select("companyName logo")
          .lean();
        if (employerProfile) {
          reviewerInfo.companyName = employerProfile.companyName;
          reviewerInfo.logo = employerProfile.logo;
        }
      }

      return {
        ...review,
        reviewer: reviewerInfo,
        job: review.job
          ? {
              id: review.job._id,
              title: review.job.title,
              category: review.job.category,
            }
          : null,
      };
    })
  );

  return {
    reviews: enrichedReviews,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getUserRatingSummary = async (userId) => {
  const result = await Review.aggregate([
    { $match: { reviewee: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      averageRating: null,
      totalReviews: 0,
    };
  }

  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalReviews: result[0].totalReviews,
  };
};

const checkEmployerReviewEligibility = async (employerId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.employer.toString() !== employerId) {
    const error = new Error("Access denied: not your job");
    error.statusCode = 403;
    throw error;
  }

  if (job.status !== "COMPLETED") {
    return {
      canReview: false,
      workers: [],
    };
  }

  const assignments = await Assignment.find({
    job: jobId,
    status: { $ne: "CANCELLED" },
  }).lean();

  const workers = await Promise.all(
    assignments.map(async (assignment) => {
      const existingReview = await Review.findOne({
        reviewer: employerId,
        reviewee: assignment.worker.toString(),
        job: jobId,
      }).lean();

      return {
        workerId: assignment.worker.toString(),
        hasReviewed: !!existingReview,
      };
    })
  );

  const canReview = workers.some((w) => !w.hasReviewed);

  return {
    canReview,
    workers,
  };
};

const checkWorkerReviewEligibility = async (workerId, jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.status !== "COMPLETED") {
    return {
      canReview: false,
      hasReviewed: false,
    };
  }

  const assignment = await Assignment.findOne({
    job: jobId,
    worker: workerId,
    status: { $ne: "CANCELLED" },
  }).lean();

  if (!assignment) {
    return {
      canReview: false,
      hasReviewed: false,
    };
  }

  const existingReview = await Review.findOne({
    reviewer: workerId,
    reviewee: job.employer.toString(),
    job: jobId,
  }).lean();

  return {
    canReview: !existingReview,
    hasReviewed: !!existingReview,
  };
};

export {
  createEmployerReview,
  createWorkerReview,
  getUserReviews,
  getUserRatingSummary,
  checkEmployerReviewEligibility,
  checkWorkerReviewEligibility,
};