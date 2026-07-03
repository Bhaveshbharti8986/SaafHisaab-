import mongoose from "mongoose";

const fundTransferSchema = new mongoose.Schema({
  amount:    { type: Number, required: true },
  sethId:    { type: String, required: true, index: true },
  direction: { type: String, enum: ["seth_to_munsi", "munsi_to_seth"], default: "seth_to_munsi" },
  date:      { type: Date, required: true },
  notes:     { type: String, default: null },
}, { timestamps: true });

fundTransferSchema.index({ date: -1 });

export default mongoose.model("FundTransfer", fundTransferSchema);
