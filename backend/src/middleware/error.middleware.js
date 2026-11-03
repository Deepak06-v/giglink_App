import { isOriginAllowed } from "../config/cors.js";

const applyCorsHeaders = (req, res) => {
  const origin = req.headers?.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
};

export const errorHandler = (err, req, res, next) => {
  applyCorsHeaders(req, res);

  console.error(`Error: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  if (err.message && err.message.startsWith("CORS origin denied")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", "),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource ID",
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "Field";
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export const notFound = (req, res) => {
  applyCorsHeaders(req, res);

  return res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
