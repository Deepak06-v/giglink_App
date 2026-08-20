import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
    },
    workerCompleted: {
      type: Boolean,
      default: false,
    },
    workerCompletedAt: {
      type: Date,
    },
    employerCompleted: {
      type: Boolean,
      default: false,
    },
    employerCompletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

assignmentSchema.index({ job: 1, worker: 1 }, { unique: true });
assignmentSchema.index({ job: 1, status: 1 });
assignmentSchema.index({ worker: 1, status: 1 });

const Assignment = mongoose.model("Assignment", assignmentSchema, "assignments");

export default Assignment;