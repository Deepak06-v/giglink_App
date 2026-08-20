import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import jobRoutes from "./routes/job.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import workerProfileRoutes from "./routes/workerProfile.routes.js";
import employerProfileRoutes from "./routes/employerProfile.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import {
  applicationRoutes,
  employerApplicationRoutes,
} from "./routes/application.routes.js";
import employerReviewRoutes from "./routes/employerReview.routes.js";
import workerReviewRoutes from "./routes/workerReview.routes.js";
import userRoutes from "./routes/user.routes.js";
import deviceRoutes from "./routes/device.routes.js";
import locationRoutes from "./routes/location.routes.js";

import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { normalizePhone } from "./utils/phone.js";

const app = express();

// ======================================================
// Request Logger
// ======================================================

app.use((req, res, next) => {
  console.log(`📡 Incoming Request: ${req.method} ${req.url}`);
  next();
});

// ======================================================
// Security & Body Parsing
// ======================================================

app.use(helmet());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
  process.env.FRONTEND_URL,

  // React / Vite
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  // Other web development ports
  "http://localhost:3000",
  "http://127.0.0.1:3000",

  // Expo web
  "http://localhost:8081",
  "http://127.0.0.1:8081",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // React Native / mobile requests may not send an Origin header
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`❌ CORS blocked: ${origin}`);

      return callback(new Error(`CORS origin denied: ${origin}`));
    },

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization"],

    credentials: true,

    optionsSuccessStatus: 200,
  })
);

// ======================================================
// Rate Limiting
// ======================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 20,

  message: {
    success: false,
    message: "Too many requests, please try again later",
  },

  standardHeaders: true,

  legacyHeaders: false,
});

const otpMessage = {
  success: false,
  message: "Too many OTP requests, please try again later",
};

const sendOtpIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: otpMessage,
  standardHeaders: true,
  legacyHeaders: false,
});

const phoneKeyGenerator = async (req) => {
  const phone = normalizePhone(req.body?.phone, req.body?.country);
  return phone || ipKeyGenerator(req.ip);
};

const sendOtpPhoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: otpMessage,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: phoneKeyGenerator,
});

const verifyOtpIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: otpMessage,
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyOtpPhoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: otpMessage,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: phoneKeyGenerator,
});

// ======================================================
// Health Check
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
  });
});

// ======================================================
// Authentication
// ======================================================

app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/api/auth/phone/send-otp", sendOtpIpLimiter, sendOtpPhoneLimiter);
app.use("/api/auth/phone/verify-otp", verifyOtpIpLimiter, verifyOtpPhoneLimiter);

app.use("/api/auth", authRoutes);

// ======================================================
// Jobs
// ======================================================

app.use("/api/jobs", jobRoutes);

// ======================================================
// Worker
// ======================================================

app.use("/api/worker", assignmentRoutes);
app.use("/api/worker", workerProfileRoutes);
app.use("/api/worker", workerReviewRoutes);

// ======================================================
// Employer
// ======================================================

app.use("/api/employer", employerApplicationRoutes);
app.use("/api/employer", employerProfileRoutes);
app.use("/api/employer", employerReviewRoutes);

// ======================================================
// Notifications
// ======================================================

app.use("/api/notifications/devices", deviceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/location", locationRoutes);
// ======================================================
// Applications & Users
// ======================================================

app.use("/api", applicationRoutes);
app.use("/api", userRoutes);

// ======================================================
// Error Handling
// ======================================================

app.use(notFound);

app.use(errorHandler);

export default app;