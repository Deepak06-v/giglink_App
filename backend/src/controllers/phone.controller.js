import { createHash } from "crypto";

import {
  buildPhoneSession,
  phoneLoginOrSignup,
} from "../services/auth.service.js";
import { issueOtp, verifyOtp } from "../services/otp.service.js";
import { normalizePhone } from "../utils/phone.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const hashIp = (ip) => createHash("sha256").update(ip || "").digest("hex");

export const sendOtpController = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone, req.body.country);
    if (!phone) {
      const error = new Error("Invalid phone number");
      error.statusCode = 400;
      throw error;
    }

    await issueOtp({ phone, ipHash: hashIp(req.ip) });

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const verifyOtpController = async (req, res) => {
  try {
    const { code, role, name } = req.body;
    const phone = normalizePhone(req.body.phone, req.body.country);
    if (!phone) {
      const error = new Error("Invalid phone number");
      error.statusCode = 400;
      throw error;
    }

    await verifyOtp({ phone, code });

    const { user, isNewUser } = await phoneLoginOrSignup({
      normalizedPhone: phone,
      role,
      name,
    });

    const session = buildPhoneSession(user);

    return res.json({
      success: true,
      message: "Phone verified successfully",
      data: { ...session, isNewUser },
    });
  } catch (error) {
    return handleError(res, error);
  }
};