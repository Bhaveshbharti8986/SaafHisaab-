import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  type:      { type: String, enum: ["palledari", "bhada", "misc", "salary", "direct_purchase"], required: true },
  sethId:    { type: String, required: true, index: true },
  amount:    { type: Number, required: true },
  paidBy:    { type: String, enum: ["seth", "munsi"], default: "munsi" },
  notes:     { type: String, default: null },
  date:   { type: String, required: true },
  cropType: { type: String, default: null },
  weight:   { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("Expense", expenseSchema);
