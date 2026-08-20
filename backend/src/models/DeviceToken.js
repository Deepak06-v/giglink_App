import mongoose from "mongoose";

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["android", "ios", "web"],
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

deviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema, "devicetokens");

export default DeviceToken;
