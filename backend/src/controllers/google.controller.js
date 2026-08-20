import { authenticateGoogle } from "../services/googleAuth.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const googleAuthController = async (req, res) => {
  try {
    const { idToken, role } = req.body;
    const session = await authenticateGoogle({ idToken, role });

    return res.json({
      success: true,
      message: "Google sign-in successful",
      data: session,
    });
  } catch (error) {
    return handleError(res, error);
  }
};