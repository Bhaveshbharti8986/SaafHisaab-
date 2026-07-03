import mongoose from "mongoose";

const godownStockSchema = new mongoose.Schema({
  sethId:     { type: String, required: true, unique: true },
  wheat:      { type: Number, default: 0 },
  maize:      { type: Number, default: 0 },
  rice:       { type: Number, default: 0 },
  soybean:    { type: Number, default: 0 },
  emptyBags:  { type: Number, default: 0 },
  lastUpdated:{ type: Date, default: Date.now },
}, { optimisticConcurrency: true });

export default mongoose.model("GodownStock", godownStockSchema);
