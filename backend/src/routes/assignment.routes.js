import express from "express";
import {
  getWorkerAssignmentsController,
  getWorkerAssignmentByIdController,
  workerCompleteAssignmentController,
} from "../controllers/assignment.controller.js";
import { assignmentIdValidation } from "../validators/application.validator.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("worker"));

router.get("/assignments", getWorkerAssignmentsController);
router.get("/assignments/:assignmentId", assignmentIdValidation, getWorkerAssignmentByIdController);
router.post("/assignments/:assignmentId/complete", assignmentIdValidation, workerCompleteAssignmentController);

export default router;