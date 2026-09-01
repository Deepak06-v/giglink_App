import { getWorkerProfile, createOrUpdateWorkerProfile } from "../services/workerProfile.service.js";
import { getWorkerProfileCompletion } from "../services/profileCompletion.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const getWorkerProfileController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [profile, completion] = await Promise.all([
      getWorkerProfile(userId),
      getWorkerProfileCompletion(userId),
    ]);
    return res.json({
      success: true,
      message: "Worker profile retrieved successfully",
      data: { profile: { ...profile, completion } },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateWorkerProfileController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await createOrUpdateWorkerProfile(userId, req.body);
    return res.json({
      success: true,
      message: "Worker profile updated successfully",
      data: { profile },
    });
  } catch (error) {
    return handleError(res, error);
  }
};