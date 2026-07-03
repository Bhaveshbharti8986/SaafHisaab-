import WeightEntry from "../models/WeightEntry.js";
import Farmer from "../models/Farmer.js";
import GodownStock from "../models/GodownStock.js";
import { accrueInterestForFarmer } from "../utils/interest.js";
import Settlement from "../models/Settlement.js";

async function getOrCreateStock(sethId) {
  let stock = await GodownStock.findOne({ sethId });
  if (!stock) stock = await GodownStock.create({ sethId });
  return stock;
}

export const getWeightEntries = async (req, res) => {
  const { farmerId, status } = req.query;
  const filter = { sethId: req.sethId };
  if (farmerId) filter.farmerId = farmerId;
  if (status)   filter.status = status;
  const entries = await WeightEntry.find(filter).sort({ createdAt: -1 });
  res.json(entries);
};

export const createWeightEntry = async (req, res) => {
  const { farmerId, cropType, bagWeights, ratePerKg, voiceNoteUrl, munsiName, kardaWeight, palledariAmount } = req.body;
  const farmer = await Farmer.findOne({ _id: farmerId, sethId: req.sethId });
  if (!farmer) return res.status(404).json({ error: "Farmer not found" });

  const pRatePerKg = Number(ratePerKg);
  const bags = Array.isArray(bagWeights) && bagWeights.length > 0 ? bagWeights.map(Number) : [];
  const totalBags = bags.length || (req.body.totalBags !== undefined ? Number(req.body.totalBags) : 0);
  
  // Security Loophole fix: Prevent negative inputs
  if (totalBags < 0 || pRatePerKg < 0) return res.status(400).json({ error: "Values cannot be negative" });

  const totalWeight = bags.length > 0
    ? Math.round(bags.reduce((s, w) => s + w, 0) * 100) / 100
    : (req.body.totalWeight !== undefined ? Number(req.body.totalWeight) : 0);
  
  if (totalWeight < 0) return res.status(400).json({ error: "Weight cannot be negative" });

  const totalAmount = Math.round(totalWeight * pRatePerKg * 100) / 100;
  
  const kw = kardaWeight !== undefined ? Number(kardaWeight) : 0;
  const pa = palledariAmount !== undefined ? Number(palledariAmount) : 0;
  
  if (kw < 0 || pa < 0) return res.status(400).json({ error: "Deductions cannot be negative" });

  const netWeight = Math.max(0, totalWeight - kw);
  const netAmount = Math.max(0, Math.round(netWeight * pRatePerKg * 100) / 100 - pa);

  const entry = await WeightEntry.create({
    farmerId,
    sethId: req.sethId,
    farmerName: farmer.name,
    cropType,
    totalBags,
    totalWeight,
    bagWeights: bags,
    ratePerKg: pRatePerKg,
    totalAmount,
    kardaWeight: kw,
    netWeight,
    palledariAmount: pa,
    netAmount,
    voiceNoteUrl: voiceNoteUrl ?? null,
    munsiName:   munsiName ?? null,
    status: "pending",
  });

  const stock = await getOrCreateStock(req.sethId);
  stock[cropType] = (stock[cropType] || 0) + totalWeight;
  stock.lastUpdated = new Date();
  await stock.save();

  res.status(201).json(entry);
};

export const getWeightEntryById = async (req, res) => {
  const entry = await WeightEntry.findOne({ _id: req.params.id, sethId: req.sethId });
  if (!entry) return res.status(404).json({ error: "Weight entry not found" });
  res.json(entry);
};

export const updateWeightEntry = async (req, res) => {
  const { ratePerKg, status } = req.body;
  const entry = await WeightEntry.findOne({ _id: req.params.id, sethId: req.sethId });
  if (!entry) return res.status(404).json({ error: "Weight entry not found" });
  
  // Loophole fix
  if (ratePerKg !== undefined && ratePerKg < 0) return res.status(400).json({ error: "Rate cannot be negative" });

  if (ratePerKg !== undefined) {
    entry.ratePerKg   = ratePerKg;
    entry.totalAmount = Math.round(entry.totalWeight * ratePerKg * 100) / 100;
    entry.netAmount   = Math.max(0, Math.round(entry.netWeight * ratePerKg * 100) / 100 - entry.palledariAmount);
  }
  if (status !== undefined) entry.status = status;
  await entry.save();
  res.json(entry);
};

export const approveWeightEntry = async (req, res) => {
  const entry = await WeightEntry.findOne({ _id: req.params.id, sethId: req.sethId });
  if (!entry) return res.status(404).json({ error: "Weight entry not found" });

  if (entry.status !== "pending") {
    return res.json(entry);
  }

  const farmer = await Farmer.findOne({ _id: entry.farmerId, sethId: req.sethId });
  await accrueInterestForFarmer(farmer);

  // Auto-settlement: full net amount goes to Jama
  farmer.balance += entry.netAmount;

  await Settlement.create({
    farmerId: entry.farmerId,
    sethId: req.sethId,
    farmerName: entry.farmerName,
    weightEntryId: entry._id,
    cropAmount: entry.netAmount,
    recoveryMode: "skip",
    finalAmount: entry.netAmount,
    paymentMethod: "Jama",
    status: "completed",
    runningBalance: farmer.balance,
    runningAdvance: farmer.advanceAmount,
    runningInterest: farmer.accruedInterest,
  });

  entry.status = "approved";
  await entry.save();
  await farmer.save();

  res.json(entry);
};

export const holdWeightEntry = async (req, res) => {
  const entry = await WeightEntry.findOneAndUpdate({ _id: req.params.id, sethId: req.sethId }, { status: "held" }, { new: true });
  if (!entry) return res.status(404).json({ error: "Weight entry not found" });
  res.json(entry);
};
