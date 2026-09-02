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
      enum: ["AVAILABLE", "UNAVAILABLE"],
      default: "AVAILABLE",
    },
    // DEPRECATED (legacy): recurring weekly working hours. The product no longer
    // uses a weekly schedule — a worker is simply AVAILABLE or UNAVAILABLE. This
    // column is retained only to avoid a destructive migration on existing
    // records; application code no longer reads or writes it.
    weeklyAvailability: [
      {
        day: {
          type: Number,
          required: true,
          min: 0,
          max: 6,
        },
        startTime: {
          type: String,
          required: true,
          trim: true,
          match: /^\d{1,2}:\d{2}$/,
        },
        endTime: {
          type: String,
          required: true,
          trim: true,
          match: /^\d{1,2}:\d{2}$/,
        },
      },
      { _id: false },
    ],
  },
  {
    timestamps: true,
  }
);

const WorkerProfile = mongoose.model("WorkerProfile", workerProfileSchema, "worker_profiles");

export default WorkerProfile;