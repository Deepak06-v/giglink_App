import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";
import DeviceToken from "../models/DeviceToken.js";
import Notification from "../models/Notification.js";
import PhoneOtp from "../models/PhoneOtp.js";

const DELETED_USER_NAME = "Deleted User";

const deleteAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const phoneProvider = (user.authProviders || []).find(
    (provider) => provider.provider === "phone"
  );

  await WorkerProfile.deleteMany({ user: userId });
  await EmployerProfile.deleteMany({ user: userId });
  await DeviceToken.deleteMany({ userId });
  await Notification.deleteMany({ recipient: userId });
  if (phoneProvider?.phone) {
    await PhoneOtp.deleteMany({ phone: phoneProvider.phone });
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        name: DELETED_USER_NAME,
        authProviders: [],
        isVerified: false,
        deletedAt: new Date(),
      },
      $unset: { email: 1, password: 1 },
    }
  );

  return { success: true, message: "Account deleted successfully" };
};

export { deleteAccount };
