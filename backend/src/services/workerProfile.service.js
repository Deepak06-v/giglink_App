import WorkerProfile from "../models/WorkerProfile.js";

const getWorkerProfile = async (userId) => {
  const profile = await WorkerProfile.findOne({ user: userId });
  if (!profile) {
    return {
      user: userId,
      phone: "",
      profileImage: "",
      bio: "",
      location: {
        city: "",
        state: "",
        pincode: "",
      },
      skills: [],
      experience: "",
      languages: [],
      availability: "AVAILABLE",
      weeklyAvailability: [],
    };
  }
  return profile;
};

const createOrUpdateWorkerProfile = async (userId, updateData) => {
  const protectedFields = ["user", "createdAt", "updatedAt"];
  protectedFields.forEach((field) => delete updateData[field]);

  const profile = await WorkerProfile.findOneAndUpdate(
    { user: userId },
    { $set: updateData },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return profile;
};

export { getWorkerProfile, createOrUpdateWorkerProfile };