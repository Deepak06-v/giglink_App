import {
  createJob,
  getJobById,
  getPublicJobs,
  getJobByIdPublic,
  getEmployerJobs,
  getEmployerCompletedJobs,
  updateJob,
  deleteJob,
  getJobWithCompletionInfo,
} from "../services/job.service.js";
import { employerCompleteJob, getCompletionStatus } from "../services/completion.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  const body = {
    success: false,
    message,
  };
  if (error.code) {
    body.code = error.code;
  }
  if (error.data) {
    body.data = error.data;
  }
  return res.status(statusCode).json(body);
};

export const getJobsController = async (req, res) => {
  try {
    const workerId = req.user?.role === "worker" ? req.user.userId : null;
    const result = await getPublicJobs(req.query, workerId);
    return res.json({
      success: true,
      message: "Jobs retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getJobByIdController = async (req, res) => {
  try {
    const workerId = req.user?.role === "worker" ? req.user.userId : null;
    const job = await getJobByIdPublic(req.params.jobId, workerId);
    return res.json({
      success: true,
      message: "Job retrieved successfully",
      data: { job },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createJobController = async (req, res) => {
  try {
    console.log('[JOB] createJobController user:', req.user);
    const employerId = req.user.userId;
    const job = await createJob(employerId, req.body);
    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: { job },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEmployerJobsController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await getEmployerJobs(employerId, status, page, limit);
    return res.json({
      success: true,
      message: "Jobs retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEmployerCompletedJobsController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await getEmployerCompletedJobs(employerId, page, limit);
    return res.json({
      success: true,
      message: "Completed jobs retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEmployerJobByIdController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const result = await getJobWithCompletionInfo(req.params.jobId, employerId);
    return res.json({
      success: true,
      message: "Job retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateJobController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const job = await updateJob(req.params.jobId, employerId, req.body);
    return res.json({
      success: true,
      message: "Job updated successfully",
      data: { job },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteJobController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const result = await deleteJob(req.params.jobId, employerId);
    return res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const employerCompleteJobController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const result = await employerCompleteJob(req.params.jobId, employerId);

    let message = "Employer completion confirmed";
    if (result.completion.isCompleted) {
      message = "Job completed successfully";
    } else if (result.completion.employerCompleted && !result.completion.isCompleted) {
      message = "Employer completion confirmed. Waiting for workers.";
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

export const getJobCompletionStatusController = async (req, res) => {
  try {
    const requester = req.user?.userId || null;
    const result = await getCompletionStatus(req.params.jobId, requester);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};