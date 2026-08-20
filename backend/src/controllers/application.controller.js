import {
  applyToJob,
  getWorkerApplications,
  getWorkerApplicationById,
  withdrawApplication,
  getEmployerApplicationsForJob,
  getEmployerAllApplications,
  getEmployerApplicationById,
  acceptApplication,
  rejectApplication,
} from "../services/application.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const applyToJobController = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const jobId = req.params.jobId;
    const application = await applyToJob(jobId, workerId);
    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: { application },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getWorkerApplicationsController = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const result = await getWorkerApplications(workerId, page, limit, status);
    return res.json({
      success: true,
      message: "Applications retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getWorkerApplicationByIdController = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const application = await getWorkerApplicationById(req.params.applicationId, workerId);
    return res.json({
      success: true,
      data: { application },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const withdrawApplicationController = async (req, res) => {
  try {
    const workerId = req.user.userId;
    const application = await withdrawApplication(req.params.applicationId, workerId);
    return res.json({
      success: true,
      message: "Application withdrawn successfully",
      data: { application },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEmployerApplicationsForJobController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const jobId = req.params.jobId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const result = await getEmployerApplicationsForJob(jobId, employerId, page, limit, status);
    return res.json({
      success: true,
      message: "Applications retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEmployerAllApplicationsController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const result = await getEmployerAllApplications(employerId, page, limit, status);
    return res.json({
      success: true,
      message: "Applications retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEmployerApplicationByIdController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const application = await getEmployerApplicationById(req.params.applicationId, employerId);
    return res.json({
      success: true,
      data: { application },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const acceptApplicationController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const result = await acceptApplication(req.params.applicationId, employerId);
    return res.json({
      success: true,
      message: "Application accepted and assignment created",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const rejectApplicationController = async (req, res) => {
  try {
    const employerId = req.user.userId;
    const application = await rejectApplication(req.params.applicationId, employerId);
    return res.json({
      success: true,
      message: "Application rejected successfully",
      data: { application },
    });
  } catch (error) {
    return handleError(res, error);
  }
};