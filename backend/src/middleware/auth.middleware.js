import { verifyToken } from "../utils/jwt.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(`[AUTH] incoming ${req.method} ${req.originalUrl} Authorization header:`, authHeader ? 'present' : 'missing');
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = verifyToken(token);
    console.log('[AUTH] token decoded:', decoded);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  } catch (error) {
    next();
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('[AUTHZ] route:', req.method, req.originalUrl, 'user role:', req.user?.role, 'allowedRoles:', allowedRoles);
    if (!req.user || !req.user.role) {
      console.log('[AUTHZ] missing req.user or role');
      return res.status(403).json({
        success: false,
        message: "Authorization required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log('[AUTHZ] role denied:', req.user.role);
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permissions",
      });
    }
    console.log('[AUTHZ] role granted');
    next();
  };
};