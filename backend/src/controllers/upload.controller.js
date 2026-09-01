import { getUploadSignature } from "../services/upload.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

/**
 * POST /api/profile/upload/signature (authenticated)
 *
 * The authenticated JWT identity (`req.user.userId`, `req.user.role`)
 * determines ownership and which asset type is permitted. The client only
 * supplies the asset `type`; it never supplies a user id.
 */
export const getUploadSignatureController = async (req, res) => {
  try {
    const { type } = req.body;
    const payload = getUploadSignature({
      type,
      userId: req.user.userId,
      role: req.user.role,
    });
    return res.json({
      success: true,
      message: "Upload authorization generated",
      data: { upload: payload },
    });
  } catch (error) {
    return handleError(res, error);
  }
};
