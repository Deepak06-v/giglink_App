import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        validate: {
          validator: (v) => !isNaN(v) && isFinite(v) && v >= -90 && v <= 90,
          message: "Latitude must be a number between -90 and 90",
        },
      },
      longitude: {
        type: Number,
        required: true,
        validate: {
          validator: (v) => !isNaN(v) && isFinite(v) && v >= -180 && v <= 180,
          message: "Longitude must be a number between -180 and 180",
        },
      },
    },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    // Legacy field for backward compatibility (deprecated)
    date: { type: Date },
    
    // Multi-day job support
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    
    // Time window
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    
    // Duration is calculated, not manually supplied
    // Kept for backward compatibility but should not be required for new jobs
    durationHours: { type: Number, min: 0.5 },
  },
  { _id: false }
);

const compensationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ["hourly", "fixed"] },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
  },
  { _id: false }
);

const requirementsSchema = new mongoose.Schema(
  {
    skills: [{ type: String, trim: true }],
    experience: { type: String, trim: true },
    dressCode: { type: String, trim: true },
    languages: [{ type: String, trim: true }],
  },
  { _id: false }
);

const completionSchema = new mongoose.Schema(
  {
    employerCompleted: { type: Boolean, default: false },
    employerCompletedAt: { type: Date },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "EVENT_STAFF",
        "CATERING",
        "WAREHOUSE",
        "MOVING",
        "DELIVERY_ASSISTANCE",
        "CLEANING",
        "PROMOTIONAL",
        "GENERAL_LABOR",
        "OTHER",
      ],
    },
    location: {
      type: locationSchema,
      required: true,
    },
    schedule: {
      type: scheduleSchema,
      required: true,
    },
    compensation: {
      type: compensationSchema,
      required: true,
    },
    workersRequired: {
      type: Number,
      required: true,
      min: 1,
    },
    requirements: {
      type: requirementsSchema,
      default: {},
    },
    hiringDeadline: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "OPEN", "FILLED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    completion: {
      type: completionSchema,
      default: {},
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Schema methods for backward compatibility
// Duration calculation is handled in the service layer
jobSchema.methods.hasDates = function () {
  return !!this.schedule.startDate && !!this.schedule.endDate;
};

jobSchema.index({ createdAt: -1 });
jobSchema.index({ "schedule.startDate": 1 });
jobSchema.index({ "schedule.date": 1 }); // Backward compatibility
jobSchema.index({ employer: 1, status: 1 });
jobSchema.index({ "location.city": 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ "compensation.amount": 1 });
jobSchema.index({ status: 1, "schedule.startDate": 1 });
jobSchema.index({ status: 1, "schedule.date": 1 }); // Backward compatibility
jobSchema.index({ status: 1, category: 1 });
jobSchema.index({ status: 1, "location.city": 1 });
jobSchema.index({ status: 1, "compensation.amount": 1 });

const Job = mongoose.model("Job", jobSchema, "jobs");

export default Job;