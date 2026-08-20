import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./src/config/db.js";
import app from "./src/app.js";

const PORT = process.env.PORT || 7000;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

const startServer = async () => {
  try {
    await connectDB();

    // Listen on all network interfaces so physical devices
    // on the same Wi-Fi network can access the API.
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
      );
      console.log(`📡 Local: http://localhost:${PORT}`);
      console.log(`📱 LAN: http://<YOUR-PC-IP>:${PORT}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error("❌ Server error:", error);
      }

      process.exit(1);
    });

    const gracefulShutdown = async (signal) => {
      console.log(
        `${signal} received. Starting graceful shutdown...`
      );

      server.close(async () => {
        console.log("HTTP server closed.");

        await mongoose.connection.close(false);

        console.log("MongoDB connection closed.");

        process.exit(0);
      });

      setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();