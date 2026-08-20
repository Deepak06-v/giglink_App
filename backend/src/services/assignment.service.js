import Assignment from "../models/Assignment.js";
import Job from "../models/Job.js";

const createAssignment = async (jobId, workerId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  const existingAssignment = await Assignment.findOne({ job: jobId, worker: workerId });
  if (existingAssignment) {
    const error = new Error("Assignment already exists");
    error.statusCode = 409;
    throw error;
  }

  const activeAssignmentsCount = await Assignment.countDocuments({
    job: jobId,
    status: "ACTIVE",
  });

  if (activeAssignmentsCount >= job.workersRequired) {
    const error = new Error("Job already has required number of workers");
    error.statusCode = 400;
    throw error;
  }

  const assignment = await Assignment.create({
    job: jobId,
    worker: workerId,
    status: "ACTIVE",
  });

  if (activeAssignmentsCount + 1 >= job.workersRequired) {
    job.status = "FILLED";
    await job.save();
  }

  return assignment;
};

const getAssignmentsByWorker = async (workerId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [assignments, total] = await Promise.all([
    Assignment.find({ worker: workerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "job",
        populate: { path: "employer", select: "name" },
      }),
    Assignment.countDocuments({ worker: workerId }),
  ]);

  return {
    assignments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getAssignmentById = async (assignmentId, workerId) => {
  const assignment = await Assignment.findOne({ _id: assignmentId, worker: workerId })
    .populate({
      path: "job",
      populate: { path: "employer", select: "name" },
    });

  if (!assignment) {
    const error = new Error("Assignment not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  return assignment;
};

const getAssignmentsByJob = async (jobId) => {
  return await Assignment.find({ job: jobId, status: "ACTIVE" });
};

const getActiveAssignmentsByJob = async (jobId) => {
  return await Assignment.find({ job: jobId, status: "ACTIVE" });
};

export {
  createAssignment,
  getAssignmentsByWorker,
  getAssignmentById,
  getAssignmentsByJob,
  getActiveAssignmentsByJob,
};