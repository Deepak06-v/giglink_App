import Job from "../models/Job.js";
import Assignment from "../models/Assignment.js";
import Application from "../models/Application.js";
import EmployerProfile from "../models/EmployerProfile.js";
import User from "../models/User.js";
import {
  calculateNumberOfDays,
  calculateHoursBetweenTimes,
  calculateTotalHours,
  validateCoordinates,
  buildScheduleInfo,
} from "../utils/schedule.js";

const VALID_CATEGORIES = [
  "EVENT_STAFF",
  "CATERING",
  "WAREHOUSE",
  "MOVING",
  "DELIVERY_ASSISTANCE",
  "CLEANING",
  "PROMOTIONAL",
  "GENERAL_LABOR",
  "OTHER",
];

const VALID_SORT_OPTIONS = [
  "newest",
  "oldest",
  "pay_high",
  "pay_low",
  "date_soon",
  "date_late",
];

const MAX_LIMIT = 50;

/**
 * Enrich job response with calculated schedule info
 * Adds duration object with numberOfDays, hoursPerDay, totalHours
 * @param {object} job - Job document (plain object or Mongoose doc)
 * @returns {object} Job with duration info
 */
const enrichJobWithDuration = (job) => {
  if (!job) return job;

  // Convert to plain object if it's a Mongoose document
  const jobObj = job.toObject ? job.toObject() : { ...job };

  // Calculate schedule info if we have multi-day job
  if (jobObj.schedule?.startDate && jobObj.schedule?.endDate) {
    try {
      const scheduleInfo = buildScheduleInfo({
        startDate: jobObj.schedule.startDate,
        endDate: jobObj.schedule.endDate,
        startTime: jobObj.schedule.startTime,
        endTime: jobObj.schedule.endTime,
      });

      // Add duration info to response
      jobObj.duration = scheduleInfo;
    } catch (error) {
      console.warn("Error calculating schedule info:", error.message);
      // Fallback to stored durationHours
      jobObj.duration = {
        numberOfDays: 1,
        hoursPerDay: jobObj.schedule?.durationHours || 0,
        totalHours: jobObj.schedule?.durationHours || 0,
      };
    }
  } else if (jobObj.schedule?.durationHours) {
    // Legacy format fallback
    jobObj.duration = {
      numberOfDays: 1,
      hoursPerDay: jobObj.schedule.durationHours,
      totalHours: jobObj.schedule.durationHours,
    };
  }

  return jobObj;
};

const buildDiscoveryFilter = (query) => {
  const filter = { status: "OPEN" };

  const now = new Date();

  // Independent OR groups (search, date) are composed under $and so that
  // combining them applies AND semantics instead of one overwriting the other.
  const orGroups = [];

  if (query.q) {
    const searchRegex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    orGroups.push([
      { title: searchRegex },
      { description: searchRegex },
      { category: searchRegex },
    ]);
  }

  if (query.category) {
    if (!VALID_CATEGORIES.includes(query.category)) {
      const error = new Error("Invalid category");
      error.statusCode = 400;
      throw error;
    }
    filter.category = query.category;
  }

  if (query.city) {
    filter["location.city"] = new RegExp(`^${query.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  }

  if (query.minPay !== undefined || query.maxPay !== undefined) {
    filter["compensation.amount"] = {};
    if (query.minPay !== undefined) {
      const minPay = parseFloat(query.minPay);
      if (isNaN(minPay) || minPay < 0) {
        const error = new Error("minPay must be a non-negative number");
        error.statusCode = 400;
        throw error;
      }
      filter["compensation.amount"].$gte = minPay;
    }
    if (query.maxPay !== undefined) {
      const maxPay = parseFloat(query.maxPay);
      if (isNaN(maxPay) || maxPay < 0) {
        const error = new Error("maxPay must be a non-negative number");
        error.statusCode = 400;
        throw error;
      }
      filter["compensation.amount"].$lte = maxPay;
    }
    if (query.minPay !== undefined && query.maxPay !== undefined) {
      if (parseFloat(query.minPay) > parseFloat(query.maxPay)) {
        const error = new Error("minPay cannot be greater than maxPay");
        error.statusCode = 400;
        throw error;
      }
    }
  }

  if (query.compensationType) {
    if (!["hourly", "fixed"].includes(query.compensationType)) {
      const error = new Error("Compensation type must be hourly or fixed");
      error.statusCode = 400;
      throw error;
    }
    filter["compensation.type"] = query.compensationType;
  }

  // Support filtering by date ranges using startDate (new) or date (legacy)
  if (query.date) {
    const date = new Date(query.date);
    if (isNaN(date.getTime())) {
      const error = new Error("Invalid date format");
      error.statusCode = 400;
      throw error;
    }
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Check both startDate and legacy date field
    orGroups.push([
      { "schedule.startDate": { $gte: startOfDay, $lte: endOfDay } },
      { "schedule.date": { $gte: startOfDay, $lte: endOfDay } },
    ]);
  }

  if (query.fromDate || query.toDate) {
    const dateFilter = {};
    if (query.fromDate) {
      const fromDate = new Date(query.fromDate);
      if (isNaN(fromDate.getTime())) {
        const error = new Error("Invalid fromDate format");
        error.statusCode = 400;
        throw error;
      }
      fromDate.setHours(0, 0, 0, 0);
      dateFilter.$gte = fromDate;
    }
    if (query.toDate) {
      const toDate = new Date(query.toDate);
      if (isNaN(toDate.getTime())) {
        const error = new Error("Invalid toDate format");
        error.statusCode = 400;
        throw error;
      }
      toDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = toDate;
    }
    if (query.fromDate && query.toDate) {
      if (new Date(query.fromDate) > new Date(query.toDate)) {
        const error = new Error("fromDate cannot be greater than toDate");
        error.statusCode = 400;
        throw error;
      }
    }

    // Check both startDate and legacy date field
    orGroups.push([
      { "schedule.startDate": dateFilter },
      { "schedule.date": dateFilter },
    ]);
  }

  // A single OR group keeps its existing top-level $or shape.
  if (orGroups.length === 1) {
    filter.$or = orGroups[0];
  }

  const andGroups = [
    {
      $or: [
        { hiringDeadline: { $exists: false } },
        { hiringDeadline: null },
        { hiringDeadline: { $gte: now } },
      ],
    },
  ];

  // Multiple OR groups (e.g. search + date) are AND-composed under $and.
  if (orGroups.length > 1) {
    for (const group of orGroups) {
      andGroups.unshift({ $or: group });
    }
  }

  filter.$and = andGroups;

  return filter;
};

const buildSort = (sortOption) => {
  switch (sortOption) {
    case "newest":
      return { createdAt: -1 };
    case "oldest":
      return { createdAt: 1 };
    case "pay_high":
      return { "compensation.amount": -1 };
    case "pay_low":
      return { "compensation.amount": 1 };
    case "date_soon":
      // Sort by startDate first, then date for backward compat
      return { "schedule.startDate": 1, "schedule.date": 1 };
    case "date_late":
      return { "schedule.startDate": -1, "schedule.date": -1 };
    default:
      return { createdAt: -1 };
  }
};

/**
 * Process job data for creation or update
 * Calculates durationHours from startTime/endTime if not provided
 * Validates coordinates
 * @param {object} jobData - Raw job data from request
 * @returns {object} Processed job data
 */
const processJobData = (jobData) => {
  const processed = { ...jobData };

  // Calculate durationHours if not provided
  if (
    processed.schedule?.startTime &&
    processed.schedule?.endTime &&
    !processed.schedule?.durationHours
  ) {
    try {
      processed.schedule.durationHours = calculateHoursBetweenTimes(
        processed.schedule.startTime,
        processed.schedule.endTime
      );
    } catch (error) {
      throw new Error(`Failed to calculate duration: ${error.message}`);
    }
  }

  // Validate and ensure coordinates are properly formatted when supplied.
  // If coordinates are entirely absent, skip validation and allow address-only jobs.
  const { coordinates = {} } = processed.location || {};
  const hasLat = coordinates.latitude !== undefined && coordinates.latitude !== null && coordinates.latitude !== "";
  const hasLng = coordinates.longitude !== undefined && coordinates.longitude !== null && coordinates.longitude !== "";
  if (hasLat || hasLng) {
    try {
      const validated = validateCoordinates(
        coordinates.latitude,
        coordinates.longitude
      );
      processed.location.coordinates = validated;
    } catch (error) {
      throw new Error(`Location validation failed: ${error.message}`);
    }
  } else {
    // Neither coordinate supplied — drop any empty coordinates object
    if (processed.location) {
      delete processed.location.coordinates;
    }
  }

  return processed;
};

const createJob = async (employerId, jobData) => {
  // Process and validate the data
  const processed = processJobData(jobData);

  const job = await Job.create({
    ...processed,
    employer: employerId,
    status: "DRAFT",
  });

  return enrichJobWithDuration(job);
};

const getJobById = async (jobId) => {
  const job = await Job.findById(jobId).populate("employer", "name email");
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }
  return enrichJobWithDuration(job);
};

const getPublicJobs = async (query = {}, workerId = null) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit) || 20));
  const sortOption = query.sort || "newest";

  if (!VALID_SORT_OPTIONS.includes(sortOption)) {
    const error = new Error("Invalid sort option");
    error.statusCode = 400;
    throw error;
  }

  const filter = buildDiscoveryFilter(query);
  const sort = buildSort(sortOption);
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("employer", "name")
      .lean(),
    Job.countDocuments(filter),
  ]);

  let enrichedJobs = jobs;

  if (workerId) {
    const jobIds = jobs.map((job) => job._id);
    const [applications, assignments, activeAssignments] = await Promise.all([
      Application.find({ job: { $in: jobIds }, worker: workerId }).lean(),
      Assignment.find({ job: { $in: jobIds }, worker: workerId, status: "ACTIVE" }).lean(),
      Assignment.aggregate([
        { $match: { job: { $in: jobIds }, status: "ACTIVE" } },
        { $group: { _id: "$job", count: { $sum: 1 } } },
      ]),
    ]);

    const applicationMap = new Map(applications.map((app) => [app.job.toString(), app]));
    const assignmentSet = new Set(assignments.map((a) => a.job.toString()));
    const activeAssignmentCountMap = new Map(
      activeAssignments.map((a) => [a._id.toString(), a.count])
    );

    enrichedJobs = jobs.map((job) => {
      const jobIdStr = job._id.toString();
      const application = applicationMap.get(jobIdStr);
      const isAssigned = assignmentSet.has(jobIdStr);

      let hasApplied = false;
      let applicationStatus = null;

      if (application) {
        hasApplied = true;
        applicationStatus = application.status;
      }

      const now = new Date();
      const hiringDeadlinePassed = job.hiringDeadline && new Date(job.hiringDeadline) < now;
      const isOpen = job.status === "OPEN";
      const activeCount = activeAssignmentCountMap.get(jobIdStr) || 0;
      const hasCapacity = activeCount < job.workersRequired;
      const canApply = isOpen && !hiringDeadlinePassed && !hasApplied && !isAssigned && hasCapacity;

      return enrichJobWithDuration({
        ...job,
        employer: job.employer,
        canApply,
        hasApplied,
        applicationStatus,
        isAssigned,
      });
    });
  } else {
    const jobIds = jobs.map((job) => job._id);
    const activeAssignments = await Assignment.aggregate([
      { $match: { job: { $in: jobIds }, status: "ACTIVE" } },
      { $group: { _id: "$job", count: { $sum: 1 } } },
    ]);
    const activeAssignmentCountMap = new Map(
      activeAssignments.map((a) => [a._id.toString(), a.count])
    );

    enrichedJobs = jobs.map((job) => {
      const jobIdStr = job._id.toString();
      const activeCount = activeAssignmentCountMap.get(jobIdStr) || 0;
      const hasCapacity = activeCount < job.workersRequired;

      return enrichJobWithDuration({
        ...job,
        employer: job.employer,
        hasCapacity,
      });
    });
  }

  return {
    jobs: enrichedJobs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getJobByIdPublic = async (jobId, workerId = null) => {
  const job = await Job.findById(jobId).lean();
  if (!job) {
    const error = new Error("Job not found");
    error.statusCode = 404;
    throw error;
  }

  let application = null;
  let assignment = null;
  if (workerId) {
    [application, assignment] = await Promise.all([
      Application.findOne({ job: jobId, worker: workerId }).lean(),
      Assignment.findOne({ job: jobId, worker: workerId }).lean(),
    ]);
  }

  const hasRelationship = !!(application || assignment);

  if (job.status !== "OPEN" && !hasRelationship) {
    const error = new Error("Job not available");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  if (job.hiringDeadline && new Date(job.hiringDeadline) < now && !hasRelationship) {
    const error = new Error("Job not available");
    error.statusCode = 404;
    throw error;
  }

  let employerInfo = null;
  const employerProfile = await EmployerProfile.findOne({ user: job.employer })
    .select("companyName logo")
    .lean();

  if (employerProfile) {
    employerInfo = {
      id: job.employer,
      companyName: employerProfile.companyName,
      logo: employerProfile.logo,
    };
  } else {
    const employerUser = await User.findById(job.employer).select("name").lean();
    if (employerUser) {
      employerInfo = {
        id: job.employer,
        name: employerUser.name,
      };
    }
  }

  let applicationState = null;
  if (workerId) {
    const hasApplied = !!application;
    const applicationStatus = application?.status || null;
    const isAssigned = assignment?.status === "ACTIVE";

    const hiringDeadlinePassed = job.hiringDeadline && new Date(job.hiringDeadline) < now;
    const isOpen = job.status === "OPEN";
    const hasCapacity = job.workersRequired > 0;
    const canApply = isOpen && !hiringDeadlinePassed && !hasApplied && !isAssigned && hasCapacity;

    applicationState = {
      canApply,
      hasApplied,
      applicationStatus,
      isAssigned,
    };
  }

  return enrichJobWithDuration({
    ...job,
    employer: employerInfo,
    ...(applicationState && { applicationState }),
  });
};

const getEmployerJobs = async (employerId, status, page = 1, limit = 20) => {
  const filter = { employer: employerId };
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Job.countDocuments(filter),
  ]);

  const enrichedJobs = jobs.map((job) => enrichJobWithDuration(job));

  return {
    jobs: enrichedJobs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getEmployerCompletedJobs = async (employerId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    Job.find({ employer: employerId, status: "COMPLETED" })
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit),
    Job.countDocuments({ employer: employerId, status: "COMPLETED" }),
  ]);

  const enrichedJobs = jobs.map((job) => enrichJobWithDuration(job));

  return {
    jobs: enrichedJobs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const updateJob = async (jobId, employerId, updateData) => {
  const job = await Job.findOne({ _id: jobId, employer: employerId });
  if (!job) {
    const error = new Error("Job not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  const protectedFields = [
    "employer",
    "createdAt",
    "updatedAt",
    "completedAt",
    "completion",
  ];
  protectedFields.forEach((field) => delete updateData[field]);

  // Process the update data (calculate duration, validate coordinates, etc.)
  const processed = processJobData(updateData);

  Object.assign(job, processed);
  await job.save();
  return enrichJobWithDuration(job);
};

const deleteJob = async (jobId, employerId) => {
  const job = await Job.findOne({ _id: jobId, employer: employerId });
  if (!job) {
    const error = new Error("Job not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  const activeAssignments = await Assignment.countDocuments({
    job: jobId,
    status: "ACTIVE",
  });

  if (activeAssignments > 0) {
    const error = new Error("Cannot delete job with active assignments");
    error.statusCode = 409;
    throw error;
  }

  await Job.findByIdAndDelete(jobId);
  return { message: "Job deleted successfully" };
};

const getJobWithCompletionInfo = async (jobId, employerId) => {
  const job = await Job.findOne({ _id: jobId, employer: employerId });
  if (!job) {
    const error = new Error("Job not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  const activeAssignments = await Assignment.find({
    job: jobId,
    status: "ACTIVE",
  });

  const workersCompleted = activeAssignments.filter((a) => a.workerCompleted).length;
  const workersRequired = job.workersRequired;

  return {
    job: enrichJobWithDuration(job),
    completion: {
      employerCompleted: job.completion?.employerCompleted || false,
      workersCompleted,
      workersRequired,
      isCompleted: job.status === "COMPLETED",
    },
  };
};

export {
  createJob,
  getJobById,
  getPublicJobs,
  getJobByIdPublic,
  getEmployerJobs,
  getEmployerCompletedJobs,
  updateJob,
  deleteJob,
  getJobWithCompletionInfo,
  buildDiscoveryFilter,
};