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

const VALID_CATEGORIES = [
  "EVENT_STAFF",
  "CATERING",
  "WAREHOUSE",
  "MOVING",
  "DELIVERY_ASSISTANCE",
  "CLEANING",
  "PROMOTIONAL",
  "GENERAL_LABOR",
  "OTHER",
];

const VALID_SORT_OPTIONS = [
  "newest",
  "oldest",
  "pay_high",
  "pay_low",
  "date_soon",
  "date_late",
];

const VALID_COMPENSATION_TYPES = ["hourly", "fixed"];

const createJobValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 5000 })
    .withMessage("Description must be less than 5000 characters"),
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(VALID_CATEGORIES)
    .withMessage("Invalid category"),
  
  // Location fields - address and coordinates are required
  body("location.address")
    .trim()
    .notEmpty()
    .withMessage("Address is required"),
  body("location.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),
  body("location.state")
    .trim()
    .notEmpty()
    .withMessage("State is required"),
  body("location.pincode")
    .trim()
    .notEmpty()
    .withMessage("Pincode is required"),
  body("location.coordinates.latitude")
    .notEmpty()
    .withMessage("Latitude is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a number between -90 and 90"),
  body("location.coordinates.longitude")
    .notEmpty()
    .withMessage("Longitude is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a number between -180 and 180"),
  
  // Schedule: Support multi-day jobs with startDate/endDate
  // Supports both new format (startDate/endDate) and legacy format (date)
  body("schedule.startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Start date must be in ISO8601 format (e.g., 2026-08-20)"),
  body("schedule.endDate")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("End date must be in ISO8601 format (e.g., 2026-08-23)")
    .custom((value, { req }) => {
      // Validate that endDate >= startDate
      const startDate = new Date(req.body.schedule.startDate);
      const endDate = new Date(value);
      if (endDate < startDate) {
        throw new Error("End date cannot be before start date");
      }
      return true;
    }),
  
  // Time fields
  body("schedule.startTime")
    .trim()
    .notEmpty()
    .withMessage("Start time is required")
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage("Start time must be in HH:MM format (24-hour)")
    .custom((value) => {
      const [hours, minutes] = value.split(":").map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error("Invalid time values");
      }
      return true;
    }),
  body("schedule.endTime")
    .trim()
    .notEmpty()
    .withMessage("End time is required")
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage("End time must be in HH:MM format (24-hour)")
    .custom((value) => {
      const [hours, minutes] = value.split(":").map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error("Invalid time values");
      }
      return true;
    }),
  
  // durationHours is now optional - it will be calculated from startTime/endTime
  // Kept for backward compatibility but should not be supplied by new clients
  body("schedule.durationHours")
    .optional()
    .isFloat({ min: 0.5 })
    .withMessage("Duration must be at least 0.5 hours"),
  
  // Compensation
  body("compensation.type")
    .notEmpty()
    .withMessage("Compensation type is required")
    .isIn(VALID_COMPENSATION_TYPES)
    .withMessage("Compensation type must be hourly or fixed"),
  body("compensation.amount")
    .notEmpty()
    .withMessage("Compensation amount is required")
    .isFloat({ min: 0 })
    .withMessage("Compensation amount must be a positive number"),
  
  // Workers required
  body("workersRequired")
    .notEmpty()
    .withMessage("Workers required is required")
    .isInt({ min: 1 })
    .withMessage("Workers required must be at least 1"),
  
  // Requirements (optional)
  body("requirements.skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array"),
  body("requirements.experience")
    .optional()
    .isString()
    .withMessage("Experience must be a string"),
  body("requirements.dressCode")
    .optional()
    .isString()
    .withMessage("Dress code must be a string"),
  body("requirements.languages")
    .optional()
    .isArray()
    .withMessage("Languages must be an array"),
  
  // Hiring deadline (optional)
  body("hiringDeadline")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid hiring deadline format"),
  
  validate,
];

const updateJobValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),
  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty")
    .isLength({ max: 5000 })
    .withMessage("Description must be less than 5000 characters"),
  body("category")
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage("Invalid category"),
  
  // Location fields are all optional for updates
  body("location.address")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Address cannot be empty"),
  body("location.city")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("City cannot be empty"),
  body("location.state")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("State cannot be empty"),
  body("location.pincode")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Pincode cannot be empty"),
  body("location.coordinates.latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a number between -90 and 90"),
  body("location.coordinates.longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a number between -180 and 180"),
  
  // Schedule fields
  body("schedule.startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be in ISO8601 format")
    .custom((value, { req }) => {
      if (value && req.body.schedule.endDate) {
        const startDate = new Date(value);
        const endDate = new Date(req.body.schedule.endDate);
        if (endDate < startDate) {
          throw new Error("End date cannot be before start date");
        }
      }
      return true;
    }),
  body("schedule.endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be in ISO8601 format"),
  body("schedule.startTime")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Start time cannot be empty")
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage("Start time must be in HH:MM format (24-hour)")
    .custom((value) => {
      if (value) {
        const [hours, minutes] = value.split(":").map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          throw new Error("Invalid time values");
        }
      }
      return true;
    }),
  body("schedule.endTime")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("End time cannot be empty")
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage("End time must be in HH:MM format (24-hour)")
    .custom((value) => {
      if (value) {
        const [hours, minutes] = value.split(":").map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          throw new Error("Invalid time values");
        }
      }
      return true;
    }),
  
  // Legacy date field (backward compatibility)
  body("schedule.date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),
  
  // Duration hours (optional for updates)
  body("schedule.durationHours")
    .optional()
    .isFloat({ min: 0.5 })
    .withMessage("Duration must be at least 0.5 hours"),
  
  // Compensation
  body("compensation.type")
    .optional()
    .isIn(VALID_COMPENSATION_TYPES)
    .withMessage("Compensation type must be hourly or fixed"),
  body("compensation.amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Compensation amount must be a positive number"),
  
  // Workers required
  body("workersRequired")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Workers required must be at least 1"),
  
  // Requirements (optional)
  body("requirements.skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array"),
  body("requirements.experience")
    .optional()
    .isString()
    .withMessage("Experience must be a string"),
  body("requirements.dressCode")
    .optional()
    .isString()
    .withMessage("Dress code must be a string"),
  body("requirements.languages")
    .optional()
    .isArray()
    .withMessage("Languages must be an array"),
  
  // Status (optional for updates)
  body("hiringDeadline")
    .optional()
    .isISO8601()
    .withMessage("Invalid hiring deadline format"),
  body("status")
    .optional()
    .isIn(["DRAFT", "OPEN", "FILLED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .withMessage("Invalid status"),
  
  validate,
];

const listJobsQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),
  query("category")
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage("Invalid category"),
  query("city")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("City must be between 1 and 100 characters"),
  query("minPay")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minPay must be a non-negative number"),
  query("maxPay")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxPay must be a non-negative number"),
  query("compensationType")
    .optional()
    .isIn(VALID_COMPENSATION_TYPES)
    .withMessage("Compensation type must be hourly or fixed"),
  query("date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format (use YYYY-MM-DD)"),
  query("fromDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid fromDate format (use YYYY-MM-DD)"),
  query("toDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid toDate format (use YYYY-MM-DD)"),
  query("sort")
    .optional()
    .isIn(VALID_SORT_OPTIONS)
    .withMessage("Invalid sort option"),
  validate,
];

const getJobByIdValidation = [
  param("jobId").isMongoId().withMessage("Invalid job ID"),
  validate,
];

export { createJobValidation, updateJobValidation, listJobsQueryValidation, getJobByIdValidation };