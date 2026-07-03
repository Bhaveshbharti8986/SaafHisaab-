import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  farmerId:   { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
  sethId:     { type: String, required: true, index: true },
  farmerName: { type: String, required: true },
  type:       { type: String, enum: ["advance", "payment", "deposit", "bag_issue", "bag_return", "petty_cash"], required: true },
  amount:     { type: Number, required: true },
  interestRecovered: { type: Number, default: 0 },
  paymentMode:{ type: String, enum: ["Cash", "UPI", "PhonePe", "GPay", "Paytm"], default: "Cash" },
  paidBy:     { type: String, enum: ["seth", "munsi"], default: "munsi" },
  bags:       { type: Number, default: null },
  notes:      { type: String, default: null },
  runningBalance: { type: Number, default: 0 },
  runningAdvance: { type: Number, default: 0 },
  runningInterest: { type: Number, default: 0 },
}, { timestamps: true });

transactionSchema.index({ farmerId: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

export default mongoose.model("Transaction", transactionSchema);
