import {
  getAssignmentsByWorker,
  getAssignmentById,
} from "../services/assignment.service.js";
import { workerCompleteAssignment, getCompletionStatus } from "../services/completion.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const getWorkerAssignmentsController = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await getAssignmentsByWorker(workerId, page, limit);
    return res.json({
      success: true,
      message: "Assignments retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getWorkerAssignmentByIdController = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const assignment = await getAssignmentById(req.params.assignmentId, workerId);
    
    const completionStatus = await getCompletionStatus(
      assignment.job._id.toString(),
      req.user.userId
    );
    
    return res.json({
      success: true,
      data: {
        assignment,
        completion: completionStatus,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const workerCompleteAssignmentController = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const result = await workerCompleteAssignment(req.params.assignmentId, workerId);
    
    let message = "Completion recorded";
    if (result.waitingFor === "employer") {
      message = "Completion recorded. Waiting for employer confirmation.";
    } else if (result.waitingFor === "workers") {
      message = "Worker completion confirmed. Waiting for other workers.";
    } else if (!result.waitingFor) {
      message = "Job completed successfully";
    }
    
    return res.json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};