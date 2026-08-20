import express from "express";
import { signupController, loginController, getMeController, logoutController } from "../controllers/auth.controller.js";
import { sendOtpController, verifyOtpController } from "../controllers/phone.controller.js";
import { googleAuthController } from "../controllers/google.controller.js";
import { signupValidation, loginValidation, sendOtpValidation, verifyOtpValidation, googleAuthValidation } from "../validators/auth.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signupValidation, signupController);
router.post("/login", loginValidation, loginController);
router.post("/google", googleAuthValidation, googleAuthController);
router.get("/me", authenticate, getMeController);
router.post("/logout", authenticate, logoutController);
router.post("/phone/send-otp", sendOtpValidation, sendOtpController);
router.post("/phone/verify-otp", verifyOtpValidation, verifyOtpController);

export default router;