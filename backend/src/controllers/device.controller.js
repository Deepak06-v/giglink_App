import {
  registerDeviceToken,
  unregisterDeviceToken,
} from "../services/device.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const registerDeviceController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { token, platform } = req.body;
    const provider = req.body.provider || "expo";
    const device = await registerDeviceToken(userId, token, platform, provider);
    return res.status(201).json({
      success: true,
      message: "Device registered successfully",
      data: { device },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const unregisterDeviceController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const token = req.params.token;
    const result = await unregisterDeviceToken(userId, token);
    return res.json({
      success: true,
      message: "Device unregistered successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
