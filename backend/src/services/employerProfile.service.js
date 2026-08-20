import EmployerProfile from "../models/EmployerProfile.js";

const getEmployerProfile = async (userId) => {
  const profile = await EmployerProfile.findOne({ user: userId });
  if (!profile) {
    return {
      user: userId,
      companyName: "",
      companyDescription: "",
      phone: "",
      logo: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    };
  }
  return profile;
};

const createOrUpdateEmployerProfile = async (userId, updateData) => {
  const protectedFields = ["user", "createdAt", "updatedAt"];
  protectedFields.forEach((field) => delete updateData[field]);

  const profile = await EmployerProfile.findOneAndUpdate(
    { user: userId },
    { $set: updateData },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return profile;
};

export { getEmployerProfile, createOrUpdateEmployerProfile };