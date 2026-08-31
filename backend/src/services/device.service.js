import DeviceToken from "../models/DeviceToken.js";

const VALID_PROVIDERS = ["expo", "fcm"];

const registerDeviceToken = async (userId, token, platform, provider = "expo") => {
  if (!VALID_PROVIDERS.includes(provider)) {
    const error = new Error(`Unsupported push provider: ${provider}`);
    error.statusCode = 400;
    throw error;
  }
  const device = await DeviceToken.findOneAndUpdate(
    { userId, token },
    {
      $set: {
        userId,
        token,
        platform,
        provider,
        lastActiveAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return device;
};

const unregisterDeviceToken = async (userId, token) => {
  const result = await DeviceToken.deleteOne({ userId, token });
  return { deleted: result.deletedCount > 0 };
};

const getActiveDeviceTokens = async (userId) => {
  const devices = await DeviceToken.find({ userId }).select("token").lean();
  return devices.map((device) => device.token);
};

const getActiveDevices = async (userId) => {
  const devices = await DeviceToken.find({ userId }).select("token provider").lean();
  return devices.map((device) => ({ token: device.token, provider: device.provider }));
};

const removeDeviceTokens = async (tokens) => {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { deleted: 0 };
  }
  const result = await DeviceToken.deleteMany({ token: { $in: tokens } });
  return { deleted: result.deletedCount };
};

export {
  registerDeviceToken,
  unregisterDeviceToken,
  getActiveDeviceTokens,
  getActiveDevices,
  removeDeviceTokens,
};
