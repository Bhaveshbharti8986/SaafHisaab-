import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  sethId: { type: String, required: true, unique: true },

  // Mandi Deduction Defaults
  kardaPerBagKg: { type: Number, default: 0.5 },    // Weight deducted per bag (kg)
  labourPerBagCash: { type: Number, default: 5 },   // Cash deducted per bag (₹)
  shrinkagePercent: { type: Number, default: 2 },   // Default 2% shrinkage loss

  // Profile Information
  ownerName: { type: String, default: "" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  businessName: { type: String, default: "" },
  gstNumber: { type: String, default: "" },
  address: { type: String, default: "" },
  village: { type: String, default: "" },

}, { timestamps: true });

export default mongoose.model("Settings", settingsSchema);
