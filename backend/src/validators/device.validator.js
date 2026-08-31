import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

const registerDeviceValidation = [
  body("token")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Push token is required"),
  body("platform")
    .isIn(["android", "ios", "web"])
    .withMessage("Platform must be android, ios, or web"),
  body("provider")
    .optional()
    .isIn(["expo", "fcm"])
    .withMessage("Provider must be expo or fcm"),
  validate,
];

export { registerDeviceValidation };
