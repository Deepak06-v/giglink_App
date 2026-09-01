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
    // Recurring weekly working hours. Each entry is one window for a day of the
    // week (day: 0=Sunday ... 6=Saturday). Multiple windows per day are allowed
    // (up to MAX_WINDOWS_PER_DAY in profile.validator.js); the array is indexed
    // by weekday in availabilityMatching.service.js. Times use the application's
    // 24-hour HH:MM convention in local time. An empty array (or absent field)
    // means no weekly schedule configured.
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