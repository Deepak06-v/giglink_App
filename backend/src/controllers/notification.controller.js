import {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notification.service.js";

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const getNotificationsController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const unreadParam = req.query.unread;
    const unreadOnly = unreadParam === "true" ? true : unreadParam === "false" ? false : null;

    const result = await getUserNotifications(userId, page, limit, unreadOnly);
    return res.json({
      success: true,
      message: "Notifications retrieved successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getUnreadCountController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await getUnreadCount(userId);
    return res.json({
      success: true,
      message: "Unread notification count retrieved successfully",
      data: { count },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const markAsReadController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.notificationId;
    const notification = await markNotificationAsRead(notificationId, userId);
    return res.json({
      success: true,
      message: "Notification marked as read",
      data: { notification },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const markAllAsReadController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await markAllNotificationsAsRead(userId);
    return res.json({
      success: true,
      message: "All notifications marked as read",
      data: { updatedCount: result.updatedCount },
    });
  } catch (error) {
    return handleError(res, error);
  }
};