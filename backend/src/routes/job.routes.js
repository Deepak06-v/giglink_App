import express from "express";
import {
  getJobsController,
  getJobByIdController,
  createJobController,
  getEmployerJobsController,
  getEmployerCompletedJobsController,
  getEmployerJobByIdController,
  updateJobController,
  deleteJobController,
  employerCompleteJobController,
  getJobCompletionStatusController,
} from "../controllers/job.controller.js";
import { createJobValidation, updateJobValidation, listJobsQueryValidation, getJobByIdValidation } from "../validators/job.validator.js";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", optionalAuthenticate, listJobsQueryValidation, getJobsController);
router.get("/:jobId", optionalAuthenticate, getJobByIdValidation, getJobByIdController);
router.get("/:jobId/completion-status", optionalAuthenticate, getJobCompletionStatusController);

router.post("/", authenticate, authorizeRoles("employer"), createJobValidation, createJobController);
router.get("/employer/jobs", authenticate, authorizeRoles("employer"), getEmployerJobsController);
router.get("/employer/jobs/completed", authenticate, authorizeRoles("employer"), getEmployerCompletedJobsController);
router.get("/employer/jobs/:jobId", authenticate, authorizeRoles("employer"), getEmployerJobByIdController);
router.patch("/employer/jobs/:jobId", authenticate, authorizeRoles("employer"), updateJobValidation, updateJobController);
router.delete("/employer/jobs/:jobId", authenticate, authorizeRoles("employer"), deleteJobController);
router.post("/employer/jobs/:jobId/complete", authenticate, authorizeRoles("employer"), employerCompleteJobController);

export default router;