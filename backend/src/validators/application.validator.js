import { body, validationResult, query, param } from "express-validator";

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

const applicationIdValidation = [
  param("applicationId")
    .isMongoId()
    .withMessage("Invalid application ID"),
  validate,
];

const jobIdValidation = [
  param("jobId")
    .isMongoId()
    .withMessage("Invalid job ID"),
  validate,
];

const assignmentIdValidation = [
  param("assignmentId")
    .isMongoId()
    .withMessage("Invalid assignment ID"),
  validate,
];

const listApplicationsQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("status")
    .optional()
    .isIn(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"])
    .withMessage("Invalid status"),
  validate,
];

const employerApplicationsQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("status")
    .optional()
    .isIn(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"])
    .withMessage("Invalid status"),
  validate,
];

export {
  applicationIdValidation,
  jobIdValidation,
  assignmentIdValidation,
  listApplicationsQueryValidation,
  employerApplicationsQueryValidation,
};