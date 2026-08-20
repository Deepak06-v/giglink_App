import express from "express";
import {
  createWorkerReviewController,
  checkWorkerReviewEligibilityController,
} from "../controllers/review.controller.js";
import {
  workerCreateReviewValidation,
  jobIdValidation,
} from "../validators/review.validator.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("worker"));

router.post("/jobs/:jobId/reviews", jobIdValidation, workerCreateReviewValidation, createWorkerReviewController);
router.get("/jobs/:jobId/review-status", jobIdValidation, checkWorkerReviewEligibilityController);

export default router;