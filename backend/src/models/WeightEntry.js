import mongoose from "mongoose";

const weightEntrySchema = new mongoose.Schema({
  farmerId:    { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
  sethId:      { type: String, required: true, index: true },
  farmerName:  { type: String, required: true },
  cropType:    { type: String, enum: ["wheat", "maize", "rice", "soybean"], required: true },
  totalBags:   { type: Number, required: true },
  totalWeight: { type: Number, required: true },
  bagWeights:  { type: [Number], default: [] },
  ratePerKg:   { type: Number, required: true },
  totalAmount: { type: Number, required: true }, // Gross Amount
  kardaWeight: { type: Number, default: 0 },
  netWeight:   { type: Number, default: 0 },
  palledariAmount: { type: Number, default: 0 },
  netAmount:   { type: Number, default: 0 },
  voiceNoteUrl:{ type: String, default: null },
  munsiName:   { type: String, default: null },
  status:      { type: String, enum: ["pending", "approved", "held"], default: "pending" },
}, { timestamps: true });

weightEntrySchema.index({ farmerId: 1, createdAt: -1 });
weightEntrySchema.index({ status: 1 });
weightEntrySchema.index({ createdAt: -1 });

export default mongoose.model("WeightEntry", weightEntrySchema);
