import express from "express";
import {
  applyToJobController,
  getWorkerApplicationsController,
  getWorkerApplicationByIdController,
  withdrawApplicationController,
  getEmployerApplicationsForJobController,
  getEmployerAllApplicationsController,
  getEmployerApplicationByIdController,
  acceptApplicationController,
  rejectApplicationController,
} from "../controllers/application.controller.js";
import {
  jobIdValidation,
  applicationIdValidation,
  listApplicationsQueryValidation,
  employerApplicationsQueryValidation,
} from "../validators/application.validator.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/jobs/:jobId/applications", jobIdValidation, authenticate, authorizeRoles("worker"), applyToJobController);

router.use(authenticate);
router.use(authorizeRoles("worker"));

router.get("/applications", listApplicationsQueryValidation, getWorkerApplicationsController);
router.get("/applications/:applicationId", applicationIdValidation, getWorkerApplicationByIdController);
router.patch("/applications/:applicationId/withdraw", applicationIdValidation, withdrawApplicationController);

const employerRouter = express.Router();

employerRouter.use(authenticate);
employerRouter.use(authorizeRoles("employer"));

employerRouter.get("/applications", employerApplicationsQueryValidation, getEmployerAllApplicationsController);
employerRouter.get("/applications/:applicationId", applicationIdValidation, getEmployerApplicationByIdController);
employerRouter.get("/jobs/:jobId/applications", jobIdValidation, employerApplicationsQueryValidation, getEmployerApplicationsForJobController);
employerRouter.patch("/applications/:applicationId/accept", applicationIdValidation, acceptApplicationController);
employerRouter.patch("/applications/:applicationId/reject", applicationIdValidation, rejectApplicationController);

export { router as applicationRoutes, employerRouter as employerApplicationRoutes };