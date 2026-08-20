import { signup, login, getCurrentUser } from "../services/auth.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const signupController = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const result = await signup({ name, email, password, role });
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const result = await login({ email, password, role });
    return res.json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getMeController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await getCurrentUser(userId);
    return res.json({
      success: true,
      message: "Current user retrieved successfully",
      data: { user },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const logoutController = async (req, res) => {
  return res.json({
    success: true,
    message: "Logged out successfully",
  });
};