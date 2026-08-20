import { validationResult, body, param, query } from "express-validator";

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

const employerCreateReviewValidation = [
  body("workerId")
    .notEmpty()
    .withMessage("Worker ID is required")
    .isMongoId()
    .withMessage("Invalid worker ID"),
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .optional()
    .isString()
    .withMessage("Comment must be a string")
    .isLength({ max: 1000 })
    .withMessage("Comment must be less than 1000 characters"),
  validate,
];

const workerCreateReviewValidation = [
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .optional()
    .isString()
    .withMessage("Comment must be a string")
    .isLength({ max: 1000 })
    .withMessage("Comment must be less than 1000 characters"),
  validate,
];

const jobIdValidation = [
  param("jobId").isMongoId().withMessage("Invalid job ID"),
  validate,
];

const userIdValidation = [
  param("userId").isMongoId().withMessage("Invalid user ID"),
  validate,
];

const listReviewsQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  validate,
];

export {
  employerCreateReviewValidation,
  workerCreateReviewValidation,
  jobIdValidation,
  userIdValidation,
  listReviewsQueryValidation,
};