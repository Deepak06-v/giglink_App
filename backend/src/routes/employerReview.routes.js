import express from "express";
import {
  createEmployerReviewController,
  checkEmployerReviewEligibilityController,
} from "../controllers/review.controller.js";
import {
  employerCreateReviewValidation,
  jobIdValidation,
} from "../validators/review.validator.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("employer"));

router.post("/jobs/:jobId/reviews", jobIdValidation, employerCreateReviewValidation, createEmployerReviewController);
router.get("/jobs/:jobId/review-status", jobIdValidation, checkEmployerReviewEligibilityController);

export default router;