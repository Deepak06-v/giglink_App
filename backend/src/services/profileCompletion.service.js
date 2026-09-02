import User from "../models/User.js";
import WorkerProfile from "../models/WorkerProfile.js";
import EmployerProfile from "../models/EmployerProfile.js";

const isNonEmpty = (value) =>
  typeof value === "string" ? value.trim().length > 0 : Boolean(value);

const hasItems = (value) => Array.isArray(value) && value.length > 0;

const hasLocation = (location) => {
  if (!location) return false;
  return (
    isNonEmpty(location.city) &&
    isNonEmpty(location.state) &&
    isNonEmpty(location.pincode)
  );
};

const buildCompletion = (fields) => {
  const keys = Object.keys(fields);
  const completedCount = keys.filter((key) => fields[key]).length;
  const totalCount = keys.length;

  const percentage =
    totalCount === 0
      ? 0
      : Math.min(100, Math.max(0, Math.round((completedCount / totalCount) * 100)));

  const missingFields = keys.filter((key) => !fields[key]);

  return {
    complete: percentage === 100,
    percentage,
    missingFields,
    fields,
  };
};

/**
 * Determine worker profile completion.
 *
 * Completion is computed from the actual database documents only:
 *  - if the User or WorkerProfile document does not exist, completion is 0%.
 *  - User.email is never required (phone-authenticated workers may not have one).
 *  - `experience` may legitimately be "No prior experience"; any non-empty value counts.
 *  - `availability` (the existing AVAILABLE/UNAVAILABLE enum) is used as the
 *    availability requirement. Detailed weekly working-hours data is intentionally
 *    NOT part of profile completion — a worker reaches 100% without configuring
 *    any working hours.
 *
 * Logical completion units (8):
 *  NAME, PROFILE_PHOTO, BIO, PHONE, LOCATION (city+state+pincode), SKILLS, EXPERIENCE, AVAILABILITY
 */
const getWorkerProfileCompletion = async (userId) => {
  const [user, profile] = await Promise.all([
    User.findById(userId).select("name").lean(),
    WorkerProfile.findOne({ user: userId }).lean(),
  ]);

  if (!user || !profile) {
    const empty = {
      NAME: false,
      PROFILE_PHOTO: false,
      BIO: false,
      PHONE: false,
      LOCATION: false,
      SKILLS: false,
      EXPERIENCE: false,
      AVAILABILITY: false,
    };
    return buildCompletion(empty);
  }

  const fields = {
    NAME: isNonEmpty(user.name),
    PROFILE_PHOTO: isNonEmpty(profile.profileImage),
    BIO: isNonEmpty(profile.bio),
    PHONE: isNonEmpty(profile.phone),
    LOCATION: hasLocation(profile.location),
    SKILLS: hasItems(profile.skills),
    EXPERIENCE: isNonEmpty(profile.experience),
    AVAILABILITY: isNonEmpty(profile.availability),
  };

  return buildCompletion(fields);
};

/**
 * Determine employer profile completion.
 *
 * EmployerProfile must exist; otherwise completion is 0%.
 * User.email is never required.
 *
 * Logical completion units (6):
 *  COMPANY_NAME, COMPANY_LOGO, COMPANY_DESCRIPTION, PHONE, ADDRESS, LOCATION (city+state+pincode)
 */
const getEmployerProfileCompletion = async (userId) => {
  const profile = await EmployerProfile.findOne({ user: userId }).lean();

  if (!profile) {
    const empty = {
      COMPANY_NAME: false,
      COMPANY_LOGO: false,
      COMPANY_DESCRIPTION: false,
      PHONE: false,
      ADDRESS: false,
      LOCATION: false,
    };
    return buildCompletion(empty);
  }

  const fields = {
    COMPANY_NAME: isNonEmpty(profile.companyName),
    COMPANY_LOGO: isNonEmpty(profile.logo),
    COMPANY_DESCRIPTION: isNonEmpty(profile.companyDescription),
    PHONE: isNonEmpty(profile.phone),
    ADDRESS: isNonEmpty(profile.address),
    LOCATION: hasLocation({ city: profile.city, state: profile.state, pincode: profile.pincode }),
  };

  return buildCompletion(fields);
};

export { getWorkerProfileCompletion, getEmployerProfileCompletion };
