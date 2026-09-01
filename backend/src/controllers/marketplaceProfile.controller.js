import {
  getWorkerMarketplaceProfile,
  getEmployerMarketplaceProfile,
} from "../services/marketplaceProfile.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const getWorkerMarketplaceProfileController = async (req, res) => {
  try {
    const userId = req.params.userId;
    const profile = await getWorkerMarketplaceProfile(userId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }
    return res.json({
      success: true,
      message: "Worker marketplace profile retrieved successfully",
      data: { profile },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getEmployerMarketplaceProfileController = async (req, res) => {
  try {
    const userId = req.params.userId;
    const profile = await getEmployerMarketplaceProfile(userId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Employer profile not found",
      });
    }
    return res.json({
      success: true,
      message: "Employer marketplace profile retrieved successfully",
      data: { profile },
    });
  } catch (error) {
    return handleError(res, error);
  }
};
