import {
  geocodeAddress,
  reverseGeocodeCoordinates,
} from "../services/geocoding.service.js";
const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const geocodeController = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

   const location = await geocodeAddress(address.trim());

return res.json({
  success: true,
  message: "Address geocoded successfully",
  data: { location },
});
  } catch (error) {
    return handleError(res, error);
  }
};

export const reverseGeocodeController = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    const location = await reverseGeocodeCoordinates(latitude, longitude);

return res.json({
  success: true,
  message: "Location reverse geocoded successfully",
  data: { location },
});
  } catch (error) {
    return handleError(res, error);
  }
};