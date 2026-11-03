import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "The type must be employer_logo or photo",
      errors: errors.array(),
    });
  }
  next();
};

const uploadSignatureValidation = [
  body("type")
    .isIn(["worker_profile", "photo", "employer_logo"])
    .withMessage("The type must be employer_logo or photo"),
  validate,
];

export { uploadSignatureValidation };
