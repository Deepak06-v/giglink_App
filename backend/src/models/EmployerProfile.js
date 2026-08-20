import mongoose from "mongoose";

const employerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    companyDescription: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    phone: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const EmployerProfile = mongoose.model("EmployerProfile", employerProfileSchema, "employer_profiles");

export default EmployerProfile;