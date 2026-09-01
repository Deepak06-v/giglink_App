import { body, validationResult } from "express-validator";

// Maximum number of weekly-availability windows permitted per weekday. Kept
// small to bound complexity while supporting multiple slots per day (Phase 8).
export const MAX_WINDOWS_PER_DAY = 3;

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

const workerProfileUpdateValidation = [
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must be less than 20 characters"),
  body("profileImage")
    .optional()
    .trim()
    .isURL()
    .withMessage("Profile image must be a valid URL"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Bio must be less than 1000 characters"),
  body("location.city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City must be less than 100 characters"),
  body("location.state")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("State must be less than 100 characters"),
  body("location.pincode")
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage("Pincode must be less than 10 characters"),
  body("skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array"),
  body("skills.*")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Each skill must be less than 50 characters"),
  body("experience")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Experience must be less than 1000 characters"),
  body("languages")
    .optional()
    .isArray()
    .withMessage("Languages must be an array"),
  body("languages.*")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Each language must be less than 50 characters"),
  body("availability")
    .optional()
    .isIn(["AVAILABLE", "LIMITED", "UNAVAILABLE"])
    .withMessage("Availability must be AVAILABLE, LIMITED, or UNAVAILABLE"),
  body("weeklyAvailability")
    .optional()
    .isArray()
    .withMessage("Weekly availability must be an array"),
  body("weeklyAvailability.*.day")
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage("Weekly availability day must be an integer between 0 and 6"),
  body("weeklyAvailability.*.startTime")
    .optional()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage("Weekly availability start time must be in HH:MM format (24-hour)")
    .custom((value) => {
      if (value === undefined || value === null) {
        return true;
      }
      const [hours, minutes] = value.split(":").map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error("Invalid start time values");
      }
      return true;
    }),
  body("weeklyAvailability.*.endTime")
    .optional()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage("Weekly availability end time must be in HH:MM format (24-hour)")
    .custom((value) => {
      if (value === undefined || value === null) {
        return true;
      }
      const [hours, minutes] = value.split(":").map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error("Invalid end time values");
      }
      return true;
    }),
  body("weeklyAvailability").custom((value, { req }) => {
    if (!Array.isArray(value) || value.length === 0) {
      return true;
    }

    const maxWindowsPerDay = MAX_WINDOWS_PER_DAY;
    const windowCountByDay = new Map();
    for (const window of value) {
      if (!window || typeof window !== "object") {
        throw new Error("Each weekly availability entry must be an object");
      }

      const { day, startTime, endTime } = window;

      if (typeof day !== "number" || day < 0 || day > 6 || !Number.isInteger(day)) {
        throw new Error("Invalid weekly availability entry: day must be an integer between 0 and 6");
      }

      const count = windowCountByDay.get(day) || 0;
      if (count >= maxWindowsPerDay) {
        throw new Error(
          `Too many weekly availability windows for day ${day}; at most ${maxWindowsPerDay} allowed`
        );
      }
      windowCountByDay.set(day, count + 1);

      const hasStart = typeof startTime === "string" && startTime.trim().length > 0;
      const hasEnd = typeof endTime === "string" && endTime.trim().length > 0;
      if (hasStart !== hasEnd) {
        throw new Error(`Weekly availability entry for day ${day} must have both start and end time`);
      }
    }

    return true;
  }),
  validate,
];

const employerProfileUpdateValidation = [
  body("companyName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Company name cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Company name must be less than 200 characters"),
  body("companyDescription")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Company description must be less than 2000 characters"),
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must be less than 20 characters"),
  body("logo")
    .optional()
    .trim()
    .isURL()
    .withMessage("Logo must be a valid URL"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must be less than 500 characters"),
  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City must be less than 100 characters"),
  body("state")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("State must be less than 100 characters"),
  body("pincode")
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage("Pincode must be less than 10 characters"),
  validate,
];

export { workerProfileUpdateValidation, employerProfileUpdateValidation };