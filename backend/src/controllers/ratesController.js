import CropRate from "../models/CropRate.js";
import Farmer from "../models/Farmer.js";

export const getRates = async (req, res) => {
  res.json(await CropRate.find({ sethId: req.sethId }).sort({ cropType: 1 }));
};

export const updateRate = async (req, res) => {
  const { cropType, ratePerKg } = req.body;
  if (ratePerKg < 0) return res.status(400).json({ error: "Rate cannot be negative" });
  
  const existing = await CropRate.findOne({ cropType, sethId: req.sethId });
  const trend = existing
    ? (ratePerKg > existing.ratePerKg ? "up" : ratePerKg < existing.ratePerKg ? "down" : "stable")
    : "stable";

  const rate = await CropRate.findOneAndUpdate(
    { cropType, sethId: req.sethId },
    { ratePerKg, previousRate: existing?.ratePerKg ?? null, trend, sethId: req.sethId },
    { new: true, upsert: true }
  );
  res.json(rate);
};

export const broadcastRates = async (req, res) => {
  const farmers = await Farmer.find({ sethId: req.sethId }, "_id");
  const rates   = await CropRate.find({ sethId: req.sethId });
  const rateLines = rates.map(r => `${r.cropType.charAt(0).toUpperCase() + r.cropType.slice(1)}: ₹${r.ratePerKg.toFixed(2)}/kg`).join(", ");
  res.json({
    messagesSent: farmers.length,
    farmersReached: farmers.length,
    message: `Jai Shri Ram! Aaj ke rates: ${rateLines} — Rajesh Traders`,
  });
};
