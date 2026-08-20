import { body, validationResult } from "express-validator";

import { normalizePhone } from "../utils/phone.js";

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

const signupValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["worker", "employer"])
    .withMessage("Role must be either worker or employer"),
  validate,
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["worker", "employer"])
    .withMessage("Role must be either worker or employer"),
  validate,
];

const isValidPhoneValue = (value, { req }) => {
  const country = req.body?.country;
  if (!value.startsWith("+") && !country) {
    throw new Error("Country code is required");
  }
  if (!normalizePhone(value, country)) {
    throw new Error("Invalid phone number");
  }
  return true;
};

const countryValidation = body("country")
  .optional({ values: "falsy" })
  .isISO31661Alpha2()
  .withMessage("Invalid country code");

const sendOtpValidation = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone is required")
    .custom(isValidPhoneValue),
  countryValidation,
  validate,
];

const verifyOtpValidation = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone is required")
    .custom(isValidPhoneValue),
  countryValidation,
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Code must be 6 digits")
    .isNumeric()
    .withMessage("Code must be numeric"),
  body("role")
    .optional()
    .isIn(["worker", "employer"])
    .withMessage("Role must be either worker or employer"),
  body("name").optional().trim(),
  validate,
];

const googleAuthValidation = [
  body("idToken")
    .trim()
    .notEmpty()
    .withMessage("Google ID token is required"),
  body("role")
    .optional()
    .isIn(["worker", "employer"])
    .withMessage("Role must be either worker or employer"),
  validate,
];

export {
  signupValidation,
  loginValidation,
  sendOtpValidation,
  verifyOtpValidation,
  googleAuthValidation,
};