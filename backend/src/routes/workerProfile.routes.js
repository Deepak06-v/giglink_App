import express from "express";
import { getWorkerProfileController, updateWorkerProfileController } from "../controllers/workerProfile.controller.js";
import { workerProfileUpdateValidation } from "../validators/profile.validator.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("worker"));

router.get("/profile", getWorkerProfileController);
router.patch("/profile", workerProfileUpdateValidation, updateWorkerProfileController);

export default router;