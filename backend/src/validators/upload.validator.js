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

const uploadSignatureValidation = [
  body("type")
    .isIn(["worker_profile", "employer_logo"])
    .withMessage("Type must be worker_profile or employer_logo"),
  validate,
];

export { uploadSignatureValidation };
