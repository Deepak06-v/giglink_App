import https from "https";

const sendOtp = async (phone, code) => {
  const smsProvider = process.env.SMS_PROVIDER || "";
  const textbeeApiKey = process.env.TEXTBEE_API_KEY || "";
  const textbeeDeviceId = process.env.TEXTBEE_DEVICE_ID || "";
  const isProduction = process.env.NODE_ENV === "production";

  if (smsProvider === "textbee") {
    if (!textbeeApiKey || textbeeApiKey.trim() === "") {
      const error = new Error("SMS provider is not configured");
      error.statusCode = 503;
      error.code = "SMS_PROVIDER_NOT_CONFIGURED";
      throw error;
    }

    const payload = {
      recipients: [phone],
      message: `Your GigLink verification code is: ${code}. It expires in 5 minutes.`,
    };

    if (textbeeDeviceId && textbeeDeviceId.trim() !== "") {
      payload.deviceId = textbeeDeviceId;
    }

    const options = {
      hostname: "api.textbee.dev",
      path: "/api/v1/gateway/send-sms",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": textbeeApiKey,
      },
      timeout: 10000,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          // Successful acceptance — do not guarantee delivery.
          // The existing otp.service.js invalidation logic handles failures.
          resolve();
        });
      });

      req.on("error", (err) => {
        // Network error, timeout, or DNS failure.
        // The caller (otp.service.js) will invalidate the OTP.
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("request timeout"));
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  if (smsProvider && smsProvider !== "dev" && smsProvider !== "textbee") {
    const error = new Error("SMS provider is not configured");
    error.statusCode = 503;
    error.code = "SMS_PROVIDER_NOT_CONFIGURED";
    throw error;
  }

  if (isProduction) {
    const error = new Error("SMS delivery is unavailable");
    error.statusCode = 503;
    error.code = "SMS_UNAVAILABLE";
    throw error;
  }

  // Development stub: log OTP and return success.
  console.log(`[SMS:DEV] OTP for ${phone}: ${code}`);
  return { dev: true };
};

export { sendOtp };