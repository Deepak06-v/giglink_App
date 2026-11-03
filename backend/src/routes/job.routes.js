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
  publishJobController,
  cancelJobController,
} from "../controllers/job.controller.js";
import { applyToJobController } from "../controllers/application.controller.js";
import {
  createJobValidation,
  updateJobValidation,
  listJobsQueryValidation,
  getJobByIdValidation,
} from "../validators/job.validator.js";
import { jobIdValidation } from "../validators/application.validator.js";
import {
  authenticate,
  authorizeRoles,
  optionalAuthenticate,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", optionalAuthenticate, listJobsQueryValidation, getJobsController);
router.get("/:jobId", optionalAuthenticate, getJobByIdValidation, getJobByIdController);
router.get("/:jobId/completion-status", optionalAuthenticate, getJobCompletionStatusController);

// Direct application routes under /api/jobs/:jobId/applications and /apply
router.post(
  "/:jobId/applications",
  jobIdValidation,
  authenticate,
  authorizeRoles("worker"),
  applyToJobController,
);
router.post(
  "/:jobId/apply",
  jobIdValidation,
  authenticate,
  authorizeRoles("worker"),
  applyToJobController,
);

// Employer job routes
router.post("/", authenticate, authorizeRoles("employer"), createJobValidation, createJobController);
router.get("/employer/jobs", authenticate, authorizeRoles("employer"), getEmployerJobsController);
router.get("/employer/jobs/completed", authenticate, authorizeRoles("employer"), getEmployerCompletedJobsController);
router.get("/employer/jobs/:jobId", authenticate, authorizeRoles("employer"), getEmployerJobByIdController);
router.patch("/employer/jobs/:jobId", authenticate, authorizeRoles("employer"), updateJobValidation, updateJobController);
router.patch("/employer/jobs/:jobId/publish", authenticate, authorizeRoles("employer"), getJobByIdValidation, publishJobController);
router.patch("/employer/jobs/:jobId/cancel", authenticate, authorizeRoles("employer"), getJobByIdValidation, cancelJobController);
router.delete("/employer/jobs/:jobId", authenticate, authorizeRoles("employer"), deleteJobController);
router.post("/employer/jobs/:jobId/complete", authenticate, authorizeRoles("employer"), employerCompleteJobController);

export default router;
