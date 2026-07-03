import mongoose from "mongoose";

const farmerSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  sethId:         { type: String, required: true, index: true },
  fatherName:     { type: String, default: "" },
  village:        { type: String, default: "" },
  fullAddress:    { type: String, default: "" },
  phone:          { type: String, default: "" },
  guarantorName:  { type: String, default: "" },
  guarantorPhone: { type: String, default: "" },
  balance:        { type: Number, default: 0 },
  bagsIssued:     { type: Number, default: 0 },
  advanceAmount:  { type: Number, default: 0 },
  interestRate:   { type: Number, default: 0 },
  chargeInterest: { type: Boolean, default: false },
  accruedInterest:{ type: Number, default: 0 },
  lastInterestCalculatedDate: { type: Date, default: Date.now },
  notes:          { type: String, default: "" },
}, { timestamps: true, optimisticConcurrency: true });

farmerSchema.index({ name: 1 });
farmerSchema.index({ village: 1 });
farmerSchema.index({ balance: 1 }); // for active farmer counts

export default mongoose.model("Farmer", farmerSchema);
