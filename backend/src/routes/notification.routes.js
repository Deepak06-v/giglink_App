import express from "express";
import {
  getNotificationsController,
  getUnreadCountController,
  markAsReadController,
  markAllAsReadController,
} from "../controllers/notification.controller.js";
import { notificationIdValidation, listNotificationsQueryValidation } from "../validators/notification.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", listNotificationsQueryValidation, getNotificationsController);
router.get("/unread-count", getUnreadCountController);
router.patch("/:notificationId/read", notificationIdValidation, markAsReadController);
router.patch("/read-all", markAllAsReadController);

export default router;