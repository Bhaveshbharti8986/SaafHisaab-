import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema({
  farmerId:         { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
  sethId:           { type: String, required: true, index: true },
  farmerName:       { type: String, required: true },
  weightEntryId:    { type: mongoose.Schema.Types.ObjectId, ref: "WeightEntry", required: true },
  cropAmount:       { type: Number, required: true },
  advanceRecovered: { type: Number, default: 0 },
  interestRecovered:{ type: Number, default: 0 },
  jamaRecovered:    { type: Number, default: 0 },
  chhootAmount:     { type: Number, default: 0 },
  chhootNotes:      { type: String, default: null },
  recoveryMode:     { type: String, enum: ["full", "partial", "skip", "jama", "udhar", "both"], required: true },
  finalAmount:      { type: Number, required: true },
  paymentMethod:    { type: String, enum: ["Cash", "UPI", "PhonePe", "GPay", "Paytm", "cash", "upi", "bank_transfer", "Jama"], default: "Cash" },
  paidBy:           { type: String, enum: ["seth", "munsi"], default: "munsi" },
  upiTransactionId: { type: String, default: null },
  adjustedRate:     { type: Number, default: null },
  status:           { type: String, enum: ["completed", "pending"], default: "completed" },
  runningBalance:   { type: Number, default: 0 },
  runningAdvance:   { type: Number, default: 0 },
  runningInterest:  { type: Number, default: 0 },
}, { timestamps: true });

settlementSchema.index({ farmerId: 1, createdAt: -1 });
settlementSchema.index({ status: 1 });
settlementSchema.index({ createdAt: -1 });

export default mongoose.model("Settlement", settlementSchema);
