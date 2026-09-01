import Application from "../models/Application.js";
import Job from "../models/Job.js";
import Assignment from "../models/Assignment.js";
import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import {
  notifyApplicationReceived,
  notifyApplicationAccepted,
  notifyApplicationRejected,
  notifyApplicationWithdrawn,
  notifyJobFilled,
} from "./notification.service.js";
import { getWorkerProfileCompletion } from "./profileCompletion.service.js";
import { matchWorkerToJob } from "./availabilityMatching.service.js";

/**
 * Fetch the weekly availability of many workers at once, keyed by user id.
 * Workers without a profile (or without a configured schedule) are excluded.
 * @param {Array<string|import("mongoose").Types.ObjectId>} workerIds
 * @returns {Promise<Map<string, Array>>} userId string -> weeklyAvailability
 */
const getWorkerAvailabilityMap = async (workerIds) => {
  const map = new Map();
  if (!workerIds.length) {
    return map;
  }
  const profiles = await WorkerProfile.find({ user: { $in: workerIds } })
    .select("user weeklyAvailability")
    .lean();
  for (const profile of profiles) {
    if (profile.weeklyAvailability && profile.weeklyAvailability.length > 0) {
      map.set(profile.user.toString(), profile.weeklyAvailability);
    }
  }
  return map;
};

/**
 * Attach a read-only `availabilityMatch` to each application, matching the
 * worker's weekly availability against the job schedule. Workers without a
 * configured schedule are left with `availabilityMatch: null`.
 * @param {object[]} applications
 * @param {object} job the already-loaded job (must carry `schedule`)
 * @param {Map<string, Array>} availabilityByWorkerId
 * @returns {object[]} same applications, enriched in place
 */
const enrichApplicationsWithAvailability = (applications, job, availabilityByWorkerId) => {
  for (const application of applications) {
    const workerId = application.worker?._id?.toString?.() || application.worker?.toString?.();
    const availability = workerId ? availabilityByWorkerId.get(workerId) : undefined;
    application.availabilityMatch = availability
      ? matchWorkerToJob(job, availability)
      : null;
  }
  return applications;
};

const applyToJob = async (jobId, workerId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.status !== "OPEN") {
    const error = new Error("Job is not open for applications");
    error.statusCode = 400;
    throw error;
  }

  if (job.hiringDeadline && new Date() > new Date(job.hiringDeadline)) {
    const error = new Error("Hiring deadline has passed");
    error.statusCode = 400;
    throw error;
  }

  if (job.employer.toString() === workerId) {
    const error = new Error("Cannot apply to your own job");
    error.statusCode = 400;
    throw error;
  }

  const existingApplication = await Application.findOne({ job: jobId, worker: workerId });
  if (existingApplication) {
    const error = new Error("You have already applied to this job");
    error.statusCode = 409;
    throw error;
  }

  const activeAssignmentsCount = await Assignment.countDocuments({
    job: jobId,
    status: "ACTIVE",
  });

  if (activeAssignmentsCount >= job.workersRequired) {
    const error = new Error("Job has reached the required number of workers");
    error.statusCode = 400;
    throw error;
  }

  const completion = await getWorkerProfileCompletion(workerId);
  if (!completion.complete) {
    const err = new Error("Complete your profile to apply");
    err.statusCode = 400;
    err.code = "PROFILE_INCOMPLETE";
    err.data = {
      percentage: completion.percentage,
      role: "worker",
      missingFields: completion.missingFields,
    };
    throw err;
  }

  const application = await Application.create({
    job: jobId,
    worker: workerId,
    status: "PENDING",
    appliedAt: new Date(),
  });

  await notifyApplicationReceived(jobId, application._id);

  return application;
};

const getWorkerApplications = async (workerId, page = 1, limit = 20, status = null) => {
  const filter = { worker: workerId };
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const [applications, total] = await Promise.all([
    Application.find(filter)
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "job",
        select: "title category location schedule compensation status employer",
        populate: { path: "employer", select: "name" },
      }),
    Application.countDocuments(filter),
  ]);

  return {
    applications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getWorkerApplicationById = async (applicationId, workerId) => {
  const application = await Application.findOne({ _id: applicationId, worker: workerId })
    .populate({
      path: "job",
      select: "title category location schedule compensation status employer",
      populate: { path: "employer", select: "name" },
    });

  if (!application) {
    const error = new Error("Application not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  return application;
};

const withdrawApplication = async (applicationId, workerId) => {
  const application = await Application.findOne({ _id: applicationId, worker: workerId });
  if (!application) {
    const error = new Error("Application not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  if (application.status !== "PENDING") {
    const error = new Error("Only pending applications can be withdrawn");
    error.statusCode = 400;
    throw error;
  }

  const jobId = application.job;
  application.status = "WITHDRAWN";
  await application.save();

  await notifyApplicationWithdrawn(jobId, application._id, application.job.employer);

  return application;
};

const getEmployerApplicationsForJob = async (jobId, employerId, page = 1, limit = 20, status = null) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  if (job.employer.toString() !== employerId) {
    const error = new Error("Access denied: not your job");
    error.statusCode = 403;
    throw error;
  }

  const filter = { job: jobId };
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const [applications, total, availabilityByWorkerId] = await Promise.all([
    Application.find(filter)
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "worker",
        select: "name email",
      }),
    Application.countDocuments(filter),
    Application.find(filter)
      .distinct("worker")
      .then((workerIds) => getWorkerAvailabilityMap(workerIds)),
  ]);

  enrichApplicationsWithAvailability(applications, job, availabilityByWorkerId);

  return {
    applications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getEmployerAllApplications = async (employerId, page = 1, limit = 20, status = null) => {
  const employerJobs = await Job.find({ employer: employerId }).select("_id schedule title");
  const jobIds = employerJobs.map((job) => job._id);

  const filter = { job: { $in: jobIds } };
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const scheduleMap = new Map();
  for (const job of employerJobs) {
    scheduleMap.set(job._id.toString(), job);
  }

  const [applications, total, availabilityByWorkerId] = await Promise.all([
    Application.find(filter)
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "worker",
        select: "name email",
      })
      .populate({
        path: "job",
        select: "title category",
      }),
    Application.countDocuments(filter),
    Application.find(filter)
      .distinct("worker")
      .then((workerIds) => getWorkerAvailabilityMap(workerIds)),
  ]);

  for (const application of applications) {
    const jobForMatch = scheduleMap.get(application.job?._id?.toString?.());
    if (jobForMatch) {
      const workerId = application.worker?._id?.toString?.();
      const availability = workerId ? availabilityByWorkerId.get(workerId) : undefined;
      application.availabilityMatch = availability
        ? matchWorkerToJob(jobForMatch, availability)
        : null;
    } else {
      application.availabilityMatch = null;
    }
  }

  return {
    applications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getEmployerApplicationById = async (applicationId, employerId) => {
  const application = await Application.findById(applicationId)
    .populate({
      path: "worker",
      select: "name email",
    })
    .populate({
      path: "job",
      select: "title category location schedule compensation status employer",
      populate: { path: "employer", select: "name" },
    });

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  if (application.job.employer?._id?.toString() !== employerId) {
    const error = new Error("Access denied: not your application");
    error.statusCode = 403;
    throw error;
  }

  const workerId = application.worker?._id?.toString?.();
  let availabilityMatch = null;
  if (workerId) {
    const availability = await getWorkerAvailabilityMap([workerId]).then(
      (map) => map.get(workerId)
    );
    availabilityMatch = availability
      ? matchWorkerToJob(application.job, availability)
      : null;
  }

  return {
    ...application.toObject ? application.toObject() : { ...application },
    availabilityMatch,
  };
};

const acceptApplication = async (applicationId, employerId) => {
  const application = await Application.findById(applicationId)
    .populate("job");

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  if (application.job.employer.toString() !== employerId) {
    const error = new Error("Access denied: not your job");
    error.statusCode = 403;
    throw error;
  }

  if (application.status !== "PENDING") {
    const error = new Error("Only pending applications can be accepted");
    error.statusCode = 400;
    throw error;
  }

  if (application.job.status !== "OPEN") {
    const error = new Error("Job is not open for hiring");
    error.statusCode = 400;
    throw error;
  }

  const activeAssignmentsCount = await Assignment.countDocuments({
    job: application.job._id,
    status: "ACTIVE",
  });

  if (activeAssignmentsCount >= application.job.workersRequired) {
    const error = new Error("Job has reached the required number of workers");
    error.statusCode = 400;
    throw error;
  }

  const existingAssignment = await Assignment.findOne({
    job: application.job._id,
    worker: application.worker,
  });
  if (existingAssignment) {
    const error = new Error("Worker is already assigned to this job");
    error.statusCode = 409;
    throw error;
  }

  const assignment = await Assignment.create({
    job: application.job._id,
    worker: application.worker,
    status: "ACTIVE",
  });

  application.status = "ACCEPTED";
  application.reviewedAt = new Date();
  application.reviewedBy = employerId;
  await application.save();

  const newActiveCount = activeAssignmentsCount + 1;
  let jobFilled = false;
  if (newActiveCount >= application.job.workersRequired) {
    application.job.status = "FILLED";
    await application.job.save();
    jobFilled = true;
  }

  const workerId = application.worker.toString();
  const jobId = application.job._id.toString();
  const assignmentId = assignment._id.toString();

  await notifyApplicationAccepted(jobId, applicationId, assignmentId, workerId);

  if (jobFilled) {
    await notifyJobFilled(jobId);
  }

  return {
    application,
    assignment,
  };
};

const rejectApplication = async (applicationId, employerId) => {
  const application = await Application.findById(applicationId)
    .populate("job");

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  if (application.job.employer.toString() !== employerId) {
    const error = new Error("Access denied: not your job");
    error.statusCode = 403;
    throw error;
  }

  if (application.status !== "PENDING") {
    const error = new Error("Only pending applications can be rejected");
    error.statusCode = 400;
    throw error;
  }

  const jobId = application.job._id;
  const workerId = application.worker;

  application.status = "REJECTED";
  application.reviewedAt = new Date();
  application.reviewedBy = employerId;
  await application.save();

  await notifyApplicationRejected(jobId, applicationId, workerId);

  return application;
};

export {
  applyToJob,
  getWorkerApplications,
  getWorkerApplicationById,
  withdrawApplication,
  getEmployerApplicationsForJob,
  getEmployerAllApplications,
  getEmployerApplicationById,
  acceptApplication,
  rejectApplication,
};