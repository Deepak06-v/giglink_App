import mongoose from "mongoose";

const phoneOtpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    hashedCode: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumed: {
      type: Boolean,
      default: false,
    },
    lastResentAt: {
      type: Date,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    ipHash: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PhoneOtp = mongoose.model("PhoneOtp", phoneOtpSchema, "phoneotps");

export default PhoneOtp;