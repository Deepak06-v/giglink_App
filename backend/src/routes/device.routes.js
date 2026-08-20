import express from "express";
import {
  registerDeviceController,
  unregisterDeviceController,
} from "../controllers/device.controller.js";
import { registerDeviceValidation } from "../validators/device.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router.post("/", registerDeviceValidation, registerDeviceController);
router.delete("/:token", unregisterDeviceController);

export default router;
