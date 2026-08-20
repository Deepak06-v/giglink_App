const sendOtp = async (phone, code) => {
  const smsProvider = process.env.SMS_PROVIDER || "";
  const isProduction = process.env.NODE_ENV === "production";

  if (smsProvider && smsProvider !== "dev") {
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

  console.log(`[SMS:DEV] OTP for ${phone}: ${code}`);
  return { dev: true };
};

export { sendOtp };