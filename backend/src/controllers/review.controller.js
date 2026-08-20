import {
  createEmployerReview,
  createWorkerReview,
  getUserReviews,
  getUserRatingSummary,
  checkEmployerReviewEligibility,
  checkWorkerReviewEligibility,
} from "../services/review.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const createEmployerReviewController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const jobId = req.params.jobId;
    const { workerId, rating, comment } = req.body;

    const review = await createEmployerReview(employerId, jobId, workerId, rating, comment);

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: { review },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createWorkerReviewController = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const jobId = req.params.jobId;
    const { rating, comment } = req.body;

    const review = await createWorkerReview(workerId, jobId, rating, comment);

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: { review },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getUserReviewsController = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const [reviewsResult, summary] = await Promise.all([
      getUserReviews(userId, page, limit),
      getUserRatingSummary(userId),
    ]);

    return res.json({
      success: true,
      message: "Reviews retrieved successfully",
      data: {
        summary,
        reviews: reviewsResult.reviews,
        pagination: reviewsResult.pagination,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const checkEmployerReviewEligibilityController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const jobId = req.params.jobId;

    const result = await checkEmployerReviewEligibility(employerId, jobId);

    return res.json({
      success: true,
      message: "Review eligibility retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const checkWorkerReviewEligibilityController = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const jobId = req.params.jobId;

    const result = await checkWorkerReviewEligibility(workerId, jobId);

    return res.json({
      success: true,
      message: "Review eligibility retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};