import Job from "../models/Job.js";
import Assignment from "../models/Assignment.js";
import {
  notifyWorkerCompletionConfirmed,
  notifyEmployerCompletionConfirmed,
  notifyJobCompleted,
} from "./notification.service.js";

const evaluateJobCompletion = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.status === "COMPLETED" || job.status === "CANCELLED") {
    return {
      jobStatus: job.status,
      completion: {
        employerCompleted: job.completion?.employerCompleted || false,
        workersCompleted: 0,
        workersRequired: job.workersRequired,
        isCompleted: job.status === "COMPLETED",
      },
    };
  }

  const activeAssignments = await Assignment.find({ job: jobId, status: "ACTIVE" });
  const workersCompleted = activeAssignments.filter((a) => a.workerCompleted).length;
  const workersRequired = job.workersRequired;

  const employerCompleted = job.completion?.employerCompleted || false;

  let jobStatus = job.status;
  let isCompleted = false;

  if (employerCompleted && workersCompleted >= workersRequired && activeAssignments.length >= workersRequired) {
    job.status = "COMPLETED";
    job.completedAt = new Date();

    for (const assignment of activeAssignments) {
      if (assignment.workerCompleted) {
        assignment.status = "COMPLETED";
        await assignment.save();
      }
    }

    await job.save();
    jobStatus = "COMPLETED";
    isCompleted = true;
  }

  return {
    jobStatus,
    completion: {
      employerCompleted,
      workersCompleted,
      workersRequired,
      isCompleted,
    },
  };
};

const workerCompleteAssignment = async (assignmentId, workerId) => {
  const assignment = await Assignment.findOne({ _id: assignmentId, worker: workerId });
  if (!assignment) {
    const error = new Error("Assignment not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  if (assignment.status !== "ACTIVE") {
    const error = new Error("Assignment is not active");
    error.statusCode = 400;
    throw error;
  }

  if (assignment.workerCompleted) {
    const error = new Error("Worker has already confirmed completion");
    error.statusCode = 400;
    throw error;
  }

  const jobId = assignment.job.toString();

  assignment.workerCompleted = true;
  assignment.workerCompletedAt = new Date();
  await assignment.save();

  const result = await evaluateJobCompletion(jobId);

  if (!result.completion.isCompleted && !result.completion.employerCompleted) {
    const job = await Job.findById(jobId).select("employer").lean();
    if (job) {
      await notifyWorkerCompletionConfirmed(jobId, assignmentId, job.employer);
    }
  } else if (result.completion.isCompleted) {
    const activeAssignments = await Assignment.find({ job: jobId, status: "ACTIVE" });
    const participantIds = [
      ...new Set([
        ...activeAssignments.filter(a => a.workerCompleted).map(a => a.worker.toString()),
      ]),
    ];
    const job = await Job.findById(jobId).select("employer").lean();
    if (job) {
      participantIds.push(job.employer.toString());
    }
    await notifyJobCompleted(jobId, participantIds);
  }

  return {
    assignmentStatus: assignment.status,
    jobStatus: result.jobStatus,
    waitingFor: result.completion.isCompleted ? null : (result.completion.employerCompleted ? "workers" : "employer"),
  };
};

const employerCompleteJob = async (jobId, employerId) => {
  const job = await Job.findOne({ _id: jobId, employer: employerId });
  if (!job) {
    const error = new Error("Job not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  if (job.status === "COMPLETED") {
    const error = new Error("Job is already completed");
    error.statusCode = 400;
    throw error;
  }

  if (job.status === "CANCELLED") {
    const error = new Error("Cannot complete a cancelled job");
    error.statusCode = 400;
    throw error;
  }

  if (job.completion?.employerCompleted) {
    const error = new Error("Employer has already confirmed completion");
    error.statusCode = 400;
    throw error;
  }

  const activeAssignments = await Assignment.find({ job: jobId, status: "ACTIVE" });
  if (activeAssignments.length === 0) {
    const error = new Error("Job has no active assignments");
    error.statusCode = 400;
    throw error;
  }

  const workersCompletedBefore = activeAssignments.filter(a => a.workerCompleted).length;
  const workersRequired = job.workersRequired;

  job.completion = {
    employerCompleted: true,
    employerCompletedAt: new Date(),
  };
  await job.save();

  const result = await evaluateJobCompletion(jobId);

  if (!result.completion.isCompleted) {
    const workerIds = activeAssignments
      .filter(a => a.workerCompleted)
      .map(a => a.worker.toString());
    if (workerIds.length > 0) {
      await notifyEmployerCompletionConfirmed(jobId, workerIds);
    }
  } else if (result.completion.isCompleted) {
    const activeAssignmentsUpdated = await Assignment.find({ job: jobId, status: "ACTIVE" });
    const participantIds = [
      ...new Set([
        ...activeAssignmentsUpdated.filter(a => a.workerCompleted).map(a => a.worker.toString()),
        job.employer.toString(),
      ]),
    ];
    await notifyJobCompleted(jobId, participantIds);
  }

  return {
    jobStatus: result.jobStatus,
    completion: result.completion,
  };
};

const getCompletionStatus = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  const activeAssignments = await Assignment.find({ job: jobId, status: "ACTIVE" });
  const workersCompleted = activeAssignments.filter((a) => a.workerCompleted).length;
  const workersRequired = job.workersRequired;
  const employerCompleted = job.completion?.employerCompleted || false;

  let waitingFor = null;
  if (job.status === "IN_PROGRESS" || job.status === "FILLED") {
    if (!employerCompleted) {
      waitingFor = "employer";
    } else if (workersCompleted < workersRequired || activeAssignments.length < workersRequired) {
      waitingFor = "workers";
    }
  }

  return {
    jobStatus: job.status,
    completion: {
      employerCompleted,
      workersCompleted,
      workersRequired,
      isCompleted: job.status === "COMPLETED",
    },
    waitingFor,
  };
};

export {
  evaluateJobCompletion,
  workerCompleteAssignment,
  employerCompleteJob,
  getCompletionStatus,
};