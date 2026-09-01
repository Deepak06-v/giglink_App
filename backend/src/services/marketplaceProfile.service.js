import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";
import { getUserRatingSummary } from "./review.service.js";

const getWorkerMarketplaceProfile = async (userId) => {
  const [user, profile, rating] = await Promise.all([
    User.findById(userId).select("name").lean(),
    WorkerProfile.findOne({ user: userId }).lean(),
    getUserRatingSummary(userId),
  ]);

  if (!profile) {
    return null;
  }

  return {
    id: user ? user._id.toString() : userId,
    name: user ? user.name : undefined,
    profileImage: profile.profileImage || undefined,
    bio: profile.bio || undefined,
    skills: profile.skills?.length ? profile.skills : undefined,
    experience: profile.experience || undefined,
    languages: profile.languages?.length ? profile.languages : undefined,
    availability: profile.availability || undefined,
    weeklyAvailability: profile.weeklyAvailability?.length
      ? profile.weeklyAvailability
      : undefined,
    location: {
      city: profile.location?.city || undefined,
      state: profile.location?.state || undefined,
    },
    rating,
  };
};

const getEmployerMarketplaceProfile = async (userId) => {
  const [user, profile, rating] = await Promise.all([
    User.findById(userId).select("name").lean(),
    EmployerProfile.findOne({ user: userId }).lean(),
    getUserRatingSummary(userId),
  ]);

  if (!profile) {
    return null;
  }

  return {
    id: user ? user._id.toString() : userId,
    companyName: profile.companyName || (user ? user.name : undefined),
    logo: profile.logo || undefined,
    companyDescription: profile.companyDescription || undefined,
    location: {
      city: profile.city || undefined,
      state: profile.state || undefined,
    },
    rating,
  };
};

export { getWorkerMarketplaceProfile, getEmployerMarketplaceProfile };
