import { validationResult, query, param } from "express-validator";

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

const notificationIdValidation = [
  param("notificationId")
    .isMongoId()
    .withMessage("Invalid notification ID"),
  validate,
];

const listNotificationsQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("unread")
    .optional()
    .isIn(["true", "false"])
    .withMessage("unread must be true or false"),
  validate,
];

export { notificationIdValidation, listNotificationsQueryValidation };