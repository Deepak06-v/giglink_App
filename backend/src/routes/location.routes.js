import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  geocodeController,
  reverseGeocodeController,
} from "../controllers/location.controller.js";

const router = express.Router();

router.post("/geocode", authenticate, geocodeController);
router.post("/reverse-geocode", authenticate, reverseGeocodeController);

export default router;