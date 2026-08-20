import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";

const buildEmailProviderEntry = (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  return {
    provider: "email",
    providerId: normalizedEmail,
    email: normalizedEmail,
    linkedAt: new Date(),
  };
};

const ensureEmailProvider = async (user) => {
  try {
    await User.updateOne(
      { _id: user._id, "authProviders.provider": { $ne: "email" } },
      { $push: { authProviders: buildEmailProviderEntry(user.email) } }
    );
  } catch {
    // Best-effort: provider metadata must never affect login success.
  }
};

const signup = async ({ name, email, password, role }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    authProviders: [buildEmailProviderEntry(email)],
  });

  const token = generateToken({ userId: user._id.toString(), role: user.role });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
    token,
  };
};

const login = async ({ email, password, role }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  if (user.role !== role) {
    const error = new Error("Invalid credentials for this role");
    error.statusCode = 401;
    throw error;
  }

  await ensureEmailProvider(user);

  const token = generateToken({ userId: user._id.toString(), role: user.role });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
    token,
  };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
  };
};

const findUserByPhone = async (normalizedPhone) => {
  return User.findOne({
    authProviders: {
      $elemMatch: { provider: "phone", providerId: normalizedPhone },
    },
  });
};

const createPhoneUser = async ({ name, role, normalizedPhone }) => {
  try {
    return await User.create({
      name,
      role,
      authProviders: [
        {
          provider: "phone",
          providerId: normalizedPhone,
          phone: normalizedPhone,
          linkedAt: new Date(),
        },
      ],
    });
  } catch (error) {
    if (error.code === 11000) {
      const dup = new Error("Phone number already registered");
      dup.statusCode = 409;
      throw dup;
    }
    throw error;
  }
};

const buildPhoneSession = (user) => {
  const token = generateToken({ userId: user._id.toString(), role: user.role });
  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email ?? null,
      role: user.role,
      isVerified: user.isVerified,
    },
    token,
  };
};

const buildGoogleProviderEntry = (sub, email) => ({
  provider: "google",
  providerId: sub,
  email: (email || "").trim().toLowerCase(),
  linkedAt: new Date(),
});

const findUserByGoogle = async (sub) => {
  return User.findOne({
    authProviders: {
      $elemMatch: { provider: "google", providerId: sub },
    },
  });
};

const createGoogleUser = async ({ sub, email, name, role }) => {
  try {
    return await User.create({
      name,
      email,
      role,
      authProviders: [buildGoogleProviderEntry(sub, email)],
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await findUserByGoogle(sub);
      if (existing) {
        return existing;
      }
      const dup = new Error("Account already exists");
      dup.statusCode = 409;
      throw dup;
    }
    throw error;
  }
};

const buildGoogleSession = (user, isNewUser) => {
  const token = generateToken({ userId: user._id.toString(), role: user.role });
  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email ?? null,
      role: user.role,
      isVerified: user.isVerified,
    },
    token,
    isNewUser,
  };
};

const googleLoginOrSignup = async ({ sub, email, name, role }) => {
  if (!sub) {
    const error = new Error("Invalid Google identity");
    error.statusCode = 400;
    throw error;
  }
  if (!email || !email.trim()) {
    const error = new Error("A verified Google email is required");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await findUserByGoogle(sub);
  if (existingUser) {
    return buildGoogleSession(existingUser, false);
  }

  const emailUser = await User.findOne({ email: email.trim().toLowerCase() });
  if (emailUser) {
    const error = new Error(
      "An account with this email already exists. Sign in with your email and password."
    );
    error.statusCode = 409;
    throw error;
  }

  if (!role || !["worker", "employer"].includes(role)) {
    const error = new Error("Role is required for a new account");
    error.statusCode = 400;
    throw error;
  }
  if (!name || !name.trim()) {
    const error = new Error("Name is required for a new account");
    error.statusCode = 400;
    throw error;
  }

  const user = await createGoogleUser({
    sub,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
  });

  return buildGoogleSession(user, true);
};

const phoneLoginOrSignup = async ({ normalizedPhone, role, name }) => {
  let user = await findUserByPhone(normalizedPhone);
  let isNewUser = false;

  if (!user) {
    if (!role || !["worker", "employer"].includes(role)) {
      const error = new Error("Role is required for a new account");
      error.statusCode = 400;
      throw error;
    }
    if (!name || !name.trim()) {
      const error = new Error("Name is required for a new account");
      error.statusCode = 400;
      throw error;
    }

    user = await createPhoneUser({
      name: name.trim(),
      role,
      normalizedPhone,
    });
    isNewUser = true;
  }

  return { user, isNewUser };
};

export {
  signup,
  login,
  getCurrentUser,
  buildEmailProviderEntry,
  ensureEmailProvider,
  findUserByPhone,
  createPhoneUser,
  buildPhoneSession,
  phoneLoginOrSignup,
  buildGoogleProviderEntry,
  findUserByGoogle,
  createGoogleUser,
  buildGoogleSession,
  googleLoginOrSignup,
};