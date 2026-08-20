import mongoose from "mongoose";

const workerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    skills: [{ type: String, trim: true }],
    experience: {
      type: String,
      trim: true,
    },
    languages: [{ type: String, trim: true }],
    availability: {
      type: String,
      enum: ["AVAILABLE", "LIMITED", "UNAVAILABLE"],
      default: "AVAILABLE",
    },
  },
  {
    timestamps: true,
  }
);

const WorkerProfile = mongoose.model("WorkerProfile", workerProfileSchema, "worker_profiles");

export default WorkerProfile;