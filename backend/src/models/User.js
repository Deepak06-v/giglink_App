import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["worker", "employer"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    authProviders: {
      type: [
        {
          provider: {
            type: String,
            required: true,
            enum: ["email", "google", "phone"],
          },
          providerId: {
            type: String,
            required: true,
          },
          email: {
            type: String,
            trim: true,
            lowercase: true,
          },
          phone: {
            type: String,
            trim: true,
          },
          linkedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index(
  { "authProviders.providerId": 1 },
  {
    unique: true,
    partialFilterExpression: { "authProviders.provider": "phone" },
    name: "authProviders.providerId_phone_unique",
  }
);

userSchema.index(
  { "authProviders.providerId": 1 },
  {
    unique: true,
    partialFilterExpression: { "authProviders.provider": "google" },
    name: "authProviders.providerId_google_unique",
  }
);

const User = mongoose.model("User", userSchema, "users");

export default User;