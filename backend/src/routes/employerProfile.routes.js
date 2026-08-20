import express from "express";
import { getEmployerProfileController, updateEmployerProfileController } from "../controllers/employerProfile.controller.js";
import { employerProfileUpdateValidation } from "../validators/profile.validator.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("employer"));

router.get("/profile", getEmployerProfileController);
router.patch("/profile", employerProfileUpdateValidation, updateEmployerProfileController);

export default router;