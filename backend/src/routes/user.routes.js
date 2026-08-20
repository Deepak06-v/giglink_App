import express from "express";
import { getUserReviewsController } from "../controllers/review.controller.js";
import { userIdValidation, listReviewsQueryValidation } from "../validators/review.validator.js";
import { optionalAuthenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/users/:userId/reviews", optionalAuthenticate, userIdValidation, listReviewsQueryValidation, getUserReviewsController);

export default router;