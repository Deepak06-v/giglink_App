import express from "express";
import { getUploadSignatureController } from "../controllers/upload.controller.js";
import { uploadSignatureValidation } from "../validators/upload.validator.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("worker", "employer"));

router.post("/upload/signature", uploadSignatureValidation, getUploadSignatureController);

export default router;
