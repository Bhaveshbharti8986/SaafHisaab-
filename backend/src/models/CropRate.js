import mongoose from "mongoose";

const cropRateSchema = new mongoose.Schema({
  cropType:     { type: String, enum: ["wheat", "maize", "rice", "soybean"], required: true },
  sethId:       { type: String, required: true, index: true },
  ratePerKg:    { type: Number, required: true },
  previousRate: { type: Number, default: null },
  trend:        { type: String, enum: ["up", "down", "stable"], default: "stable" },
}, { timestamps: true });

cropRateSchema.index({ sethId: 1, cropType: 1 }, { unique: true });

export default mongoose.model("CropRate", cropRateSchema);
