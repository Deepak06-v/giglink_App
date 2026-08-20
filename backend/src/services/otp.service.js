import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

import PhoneOtp from "../models/PhoneOtp.js";
import * as smsService from "./sms.service.js";

let smsSender = smsService.sendOtp;

const setSmsSender = (fn) => {
  smsSender = fn;
};

const BCRYPT_COST = 10;

const getConfig = () => {
  const ttlMinutes = parseInt(process.env.OTP_TTL_MINUTES || "5", 10);
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);
  const resendCooldownSeconds = parseInt(
    process.env.OTP_RESEND_COOLDOWN_SECONDS || "30",
    10
  );
  const maxResends = parseInt(process.env.OTP_MAX_RESENDS || "3", 10);
  return { ttlMinutes, maxAttempts, resendCooldownSeconds, maxResends };
};

const generateOtp = () => randomInt(100000, 1000000).toString();

const createAuthError = (statusCode, code, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const invalidateOtp = async (doc) => {
  await PhoneOtp.findOneAndUpdate(
    { _id: doc._id },
    { $set: { consumed: true } }
  );
};

const issueOtp = async ({ phone, ipHash }) => {
  const { ttlMinutes, maxResends, resendCooldownSeconds } = getConfig();
  const code = generateOtp();
  const hashedCode = await bcrypt.hash(code, BCRYPT_COST);
  const now = Date.now();

  let existing;
  try {
    existing = await PhoneOtp.findOne({ phone });
  } catch {
    existing = null;
  }

  if (
    existing &&
    !existing.consumed &&
    existing.expiresAt &&
    existing.expiresAt.getTime() > now
  ) {
    if (now - existing.lastResentAt.getTime() < resendCooldownSeconds * 1000) {
      throw createAuthError(
        429,
        "OTP_TOO_SOON",
        "Please wait before requesting another code"
      );
    }

    if (existing.resendCount >= maxResends) {
      throw createAuthError(
        429,
        "OTP_MAX_RESENDS",
        "Too many OTP requests. Please try again later"
      );
    }

    existing.hashedCode = hashedCode;
    existing.expiresAt = new Date(now + ttlMinutes * 60 * 1000);
    existing.attempts = 0;
    existing.consumed = false;
    existing.lastResentAt = new Date();
    existing.resendCount += 1;
    existing.ipHash = ipHash;
    await existing.save();
  } else if (existing) {
    existing.hashedCode = hashedCode;
    existing.expiresAt = new Date(now + ttlMinutes * 60 * 1000);
    existing.attempts = 0;
    existing.consumed = false;
    existing.lastResentAt = new Date();
    existing.resendCount = 0;
    existing.ipHash = ipHash;
    await existing.save();
  } else {
    try {
      await PhoneOtp.create({
        phone,
        hashedCode,
        expiresAt: new Date(now + ttlMinutes * 60 * 1000),
        attempts: 0,
        consumed: false,
        lastResentAt: new Date(),
        resendCount: 0,
        ipHash,
      });
    } catch (error) {
      if (error.code === 11000) {
        existing = await PhoneOtp.findOne({ phone });
        if (existing && !existing.consumed && existing.expiresAt.getTime() > now) {
          existing.hashedCode = hashedCode;
          existing.expiresAt = new Date(now + ttlMinutes * 60 * 1000);
          existing.attempts = 0;
          existing.consumed = false;
          existing.lastResentAt = new Date();
          existing.resendCount += 1;
          existing.ipHash = ipHash;
          await existing.save();
        } else if (existing) {
          existing.hashedCode = hashedCode;
          existing.expiresAt = new Date(now + ttlMinutes * 60 * 1000);
          existing.attempts = 0;
          existing.consumed = false;
          existing.lastResentAt = new Date();
          existing.resendCount = 0;
          existing.ipHash = ipHash;
          await existing.save();
        }
      } else {
        throw error;
      }
    }
  }

  try {
    await smsSender(phone, code);
  } catch (error) {
    const latest = await PhoneOtp.findOne({ phone });
    if (latest) {
      await invalidateOtp(latest);
    }
    throw error;
  }

  return { phone, expiresAt: new Date(now + ttlMinutes * 60 * 1000) };
};

const verifyOtp = async ({ phone, code }) => {
  const { maxAttempts } = getConfig();

  const doc = await PhoneOtp.findOne({ phone });
  if (!doc) {
    throw createAuthError(400, "OTP_INVALID", "Invalid or expired code");
  }

  if (doc.consumed) {
    throw createAuthError(400, "OTP_USED", "Code already used");
  }

  if (doc.expiresAt.getTime() <= Date.now()) {
    await invalidateOtp(doc);
    throw createAuthError(
      400,
      "OTP_EXPIRED",
      "Code expired. Please request a new code."
    );
  }

  if (doc.attempts >= maxAttempts) {
    throw createAuthError(
      429,
      "OTP_MAX_ATTEMPTS",
      "Too many incorrect attempts. Please request a new code."
    );
  }

  const isMatch = await bcrypt.compare(code, doc.hashedCode);

  if (!isMatch) {
    const updated = await PhoneOtp.findOneAndUpdate(
      { _id: doc._id, consumed: false },
      { $inc: { attempts: 1 } },
      { new: true }
    );

    if (!updated || updated.attempts >= maxAttempts) {
      if (updated) {
        await invalidateOtp(updated);
      }
      throw createAuthError(
        429,
        "OTP_MAX_ATTEMPTS",
        "Too many incorrect attempts. Please request a new code."
      );
    }

    const remaining = maxAttempts - updated.attempts;
    throw createAuthError(
      400,
      "OTP_WRONG",
      `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining`
    );
  }

  const claimed = await PhoneOtp.findOneAndUpdate(
    { _id: doc._id, consumed: false },
    { $set: { consumed: true } },
    { new: true }
  );

  if (!claimed) {
    throw createAuthError(400, "OTP_USED", "Code already used");
  }

  return { phone };
};

export { generateOtp, issueOtp, verifyOtp, setSmsSender };