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