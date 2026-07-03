import mongoose from "mongoose";

const interestAccrualSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true },
  sethId:   { type: String, required: true, index: true },
  principalAmount: { type: Number, required: true },
  ratePerMonth: { type: Number, required: true },
  days: { type: Number, required: true },
  amount: { type: Number, required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true }
}, { timestamps: true });

export default mongoose.model("InterestAccrual", interestAccrualSchema);
