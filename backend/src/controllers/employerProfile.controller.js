import { getEmployerProfile, createOrUpdateEmployerProfile } from "../services/employerProfile.service.js";
import { getEmployerProfileCompletion } from "../services/profileCompletion.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const getEmployerProfileController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [profile, completion] = await Promise.all([
      getEmployerProfile(userId),
      getEmployerProfileCompletion(userId),
    ]);
    return res.json({
      success: true,
      message: "Employer profile retrieved successfully",
      data: { profile: { ...profile, completion } },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateEmployerProfileController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await createOrUpdateEmployerProfile(userId, req.body);
    return res.json({
      success: true,
      message: "Employer profile updated successfully",
      data: { profile },
    });
  } catch (error) {
    return handleError(res, error);
  }
};