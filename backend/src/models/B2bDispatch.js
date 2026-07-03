import mongoose from "mongoose";

const b2bDispatchItemSchema = new mongoose.Schema({
  cropType:   { type: String, enum: ["wheat", "maize", "rice", "soybean"], required: true },
  weightKg:   { type: Number, required: true },
  ratePerKg:  { type: Number, required: true },
  itemValue:  { type: Number, required: true }
});

const b2bDispatchSchema = new mongoose.Schema({
  truckNumber:   { type: String, required: true },
  sethId:        { type: String, required: true, index: true },
  
  // New array for multiple crops
  items:         [b2bDispatchItemSchema],

  // Kept for backwards compatibility if old records don't have items array
  cropType:      { type: String, enum: ["wheat", "maize", "rice", "soybean"] },
  weightKg:      { type: Number },
  ratePerKg:     { type: Number },

  totalValue:    { type: Number, required: true },
  paidAmount:    { type: Number, default: 0 },
  
  dispatchDate:  { type: String, required: true },
  dueDate:       { type: String, required: true },
  paymentStatus: { type: String, enum: ["pending", "partial", "paid", "overdue"], default: "pending" },
  buyerName:     { type: String, default: null },
  notes:         { type: String, default: null },
}, { timestamps: true });

export default mongoose.model("B2bDispatch", b2bDispatchSchema);
