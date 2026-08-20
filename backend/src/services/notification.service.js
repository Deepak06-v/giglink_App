import Notification from "../models/Notification.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Assignment from "../models/Assignment.js";
import { pushNotifications } from "./push.service.js";

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  relatedJob = null,
  relatedApplication = null,
  relatedAssignment = null,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      relatedJob,
      relatedApplication,
      relatedAssignment,
    });
    if (notification) {
      // Fire-and-forget push delivery. The persisted notification is the
      // source of truth; push failure must never affect the business flow.
      void pushNotifications(notification);
    }
    return notification;
  } catch (error) {
    console.error(`Failed to create notification: ${error.message}`);
    return null;
  }
};

const getUserNotifications = async (userId, page = 1, limit = 20, unreadOnly = null) => {
  const filter = { recipient: userId };
  if (unreadOnly === true) {
    filter.isRead = false;
  } else if (unreadOnly === false) {
    filter.isRead = true;
  }

  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({ recipient: userId, isRead: false });
  return count;
};

const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) {
    const error = new Error("Notification not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

const markAllNotificationsAsRead = async (userId) => {
  const now = new Date();
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: now } }
  );
  return { updatedCount: result.modifiedCount };
};

const notifyApplicationReceived = async (jobId, applicationId) => {
  const job = await Job.findById(jobId).select("employer title").lean();
  if (!job) return null;

  return createNotification({
    recipient: job.employer,
    type: "APPLICATION_RECEIVED",
    title: "New application received",
    message: `A worker has applied for your job: ${job.title}.`,
    relatedJob: jobId,
    relatedApplication: applicationId,
  });
};

const notifyApplicationAccepted = async (jobId, applicationId, assignmentId, workerId) => {
  const job = await Job.findById(jobId).select("title").lean();
  if (!job) return null;

  return createNotification({
    recipient: workerId,
    type: "APPLICATION_ACCEPTED",
    title: "Application accepted",
    message: `Your application for ${job.title} was accepted.`,
    relatedJob: jobId,
    relatedApplication: applicationId,
    relatedAssignment: assignmentId,
  });
};

const notifyApplicationRejected = async (jobId, applicationId, workerId) => {
  const job = await Job.findById(jobId).select("title").lean();
  if (!job) return null;

  return createNotification({
    recipient: workerId,
    type: "APPLICATION_REJECTED",
    title: "Application rejected",
    message: `Your application for ${job.title} was not accepted.`,
    relatedJob: jobId,
    relatedApplication: applicationId,
  });
};

const notifyApplicationWithdrawn = async (jobId, applicationId, employerId) => {
  const job = await Job.findById(jobId).select("employer title").lean();
  if (!job) return null;

  return createNotification({
    recipient: job.employer,
    type: "APPLICATION_WITHDRAWN",
    title: "Application withdrawn",
    message: `A worker withdrew their application for ${job.title}.`,
    relatedJob: jobId,
    relatedApplication: applicationId,
  });
};

const notifyJobFilled = async (jobId) => {
  const job = await Job.findById(jobId).select("employer title").lean();
  if (!job) return null;

  return createNotification({
    recipient: job.employer,
    type: "JOB_FILLED",
    title: "Job filled",
    message: `Your job ${job.title} now has all required workers.`,
    relatedJob: jobId,
  });
};

const notifyWorkerCompletionConfirmed = async (jobId, assignmentId, employerId) => {
  const job = await Job.findById(jobId).select("title").lean();
  if (!job) return null;

  return createNotification({
    recipient: employerId,
    type: "WORKER_COMPLETION_CONFIRMED",
    title: "Worker confirmed completion",
    message: `A worker has confirmed completion for ${job.title}. Please confirm when the job is complete.`,
    relatedJob: jobId,
    relatedAssignment: assignmentId,
  });
};

const notifyEmployerCompletionConfirmed = async (jobId, workerIds) => {
  const job = await Job.findById(jobId).select("title").lean();
  if (!job) return null;

  const notifications = workerIds.map((workerId) =>
    createNotification({
      recipient: workerId,
      type: "EMPLOYER_COMPLETION_CONFIRMED",
      title: "Employer confirmed completion",
      message: `The employer has confirmed completion for ${job.title}.`,
      relatedJob: jobId,
    })
  );

  await Promise.all(notifications);
};

const notifyJobCompleted = async (jobId, participantIds) => {
  const job = await Job.findById(jobId).select("title").lean();
  if (!job) return null;

  const notifications = participantIds.map((recipient) =>
    createNotification({
      recipient,
      type: "JOB_COMPLETED",
      title: "Job completed",
      message: `${job.title} has been completed successfully.`,
      relatedJob: jobId,
    })
  );

  await Promise.all(notifications);
};

export {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyApplicationReceived,
  notifyApplicationAccepted,
  notifyApplicationRejected,
  notifyApplicationWithdrawn,
  notifyJobFilled,
  notifyWorkerCompletionConfirmed,
  notifyEmployerCompletionConfirmed,
  notifyJobCompleted,
};