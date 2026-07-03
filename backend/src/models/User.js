import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    default: null
  },
  password: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ["seth", "munsi", "labour"],
    required: true
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },
  addedBy: {
    type: String,
    default: "seth"
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
