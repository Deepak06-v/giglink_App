import express from "express";
import {
  getWorkerMarketplaceProfileController,
  getEmployerMarketplaceProfileController,
} from "../controllers/marketplaceProfile.controller.js";
import { userIdValidation } from "../validators/review.validator.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/worker/:userId",
  authenticate,
  authorizeRoles("employer"),
  userIdValidation,
  getWorkerMarketplaceProfileController
);

router.get(
  "/employer/:userId",
  authenticate,
  authorizeRoles("worker"),
  userIdValidation,
  getEmployerMarketplaceProfileController
);

export default router;
