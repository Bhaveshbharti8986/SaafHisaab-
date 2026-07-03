import Farmer from "../models/Farmer.js";
import WeightEntry from "../models/WeightEntry.js";
import Transaction from "../models/Transaction.js";
import Settlement from "../models/Settlement.js";
import InterestAccrual from "../models/InterestAccrual.js";
import { accrueInterestForFarmer } from "../utils/interest.js";

export const getFarmers = async (req, res) => {
  const { search, page = 1, limit = 50, paginate = false } = req.query;
  const filter = { sethId: req.sethId };
  if (search) {
    filter.$or = [{ name: new RegExp(search, "i") }, { village: new RegExp(search, "i") }, { phone: new RegExp(search, "i") }];
  }
  
  if (paginate === "true" || paginate === true) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const farmers = await Farmer.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit));
    const total = await Farmer.countDocuments(filter);
    return res.json({ data: farmers, hasMore: skip + farmers.length < total });
  } else {
    const farmers = await Farmer.find(filter).sort({ name: 1 }).limit(search ? 50 : 200);
    return res.json(farmers);
  }
};

export const createFarmer = async (req, res) => {
  const farmerData = { ...req.body, sethId: req.sethId };
  const farmer = await Farmer.create(farmerData);
  res.status(201).json(farmer);
};

export const getFarmerById = async (req, res) => {
  const farmer = await Farmer.findOne({ _id: req.params.id, sethId: req.sethId });
  if (!farmer) return res.status(404).json({ error: "Farmer not found" });
  res.json(farmer);
};

export const updateFarmer = async (req, res) => {
  const farmer = await Farmer.findOneAndUpdate({ _id: req.params.id, sethId: req.sethId }, req.body, { new: true });
  if (!farmer) return res.status(404).json({ error: "Farmer not found" });
  res.json(farmer);
};

export const deleteFarmer = async (req, res) => {
  const farmer = await Farmer.findOneAndDelete({ _id: req.params.id, sethId: req.sethId });
  if (!farmer) return res.status(404).json({ error: "Farmer not found" });
  res.sendStatus(204);
};

export const getFarmerSummary = async (req, res) => {
  const farmer = await Farmer.findOne({ _id: req.params.id, sethId: req.sethId });
  if (!farmer) return res.status(404).json({ error: "Farmer not found" });

  await accrueInterestForFarmer(farmer);
  await farmer.save();

  const deliveries   = await WeightEntry.find({ farmerId: req.params.id, sethId: req.sethId });
  const payments     = await Transaction.find({ farmerId: req.params.id, type: "payment", sethId: req.sethId });
  const pendingCount = await Settlement.countDocuments({ farmerId: req.params.id, status: "pending", sethId: req.sethId });

  const totalDeliveries = deliveries.reduce((s, d) => s + d.totalAmount, 0);
  const totalPaid       = payments.reduce((s, t) => s + t.amount, 0);

  res.json({
    farmerId: farmer._id,
    balance: farmer.balance,
    bagsIssued: farmer.bagsIssued,
    totalDeliveries,
    totalPaid,
    pendingSettlements: pendingCount,
    accruedInterest: farmer.accruedInterest,
  });
};

export const getFarmerTimeline = async (req, res) => {
  const { limit = 100 } = req.query;
  const l = parseInt(limit);

  const farmer = await Farmer.findOne({ _id: req.params.id, sethId: req.sethId });
  if (!farmer) return res.status(404).json({ error: "Farmer not found" });

  await accrueInterestForFarmer(farmer);
  await farmer.save();

  const deliveries = await WeightEntry.find({ farmerId: req.params.id, sethId: req.sethId }).sort({ createdAt: -1 }).limit(l);
  const txns       = await Transaction.find({ farmerId: req.params.id, sethId: req.sethId }).sort({ createdAt: -1 }).limit(l);
  const interestEvents = await InterestAccrual.find({ farmerId: req.params.id, sethId: req.sethId }).sort({ createdAt: -1 }).limit(l);
  const settlements = await Settlement.find({ farmerId: req.params.id, sethId: req.sethId }).sort({ createdAt: -1 }).limit(l);

  const entries = [];

  for (const d of deliveries) {
    entries.push({
      id: d._id,
      type: "delivery",
      description: `${d.cropType.charAt(0).toUpperCase() + d.cropType.slice(1)} delivery — ${d.totalBags} Bori`,
      amount: d.netAmount ?? d.totalAmount,
      bags: d.totalBags,
      cropType: d.cropType,
      voiceNoteUrl: d.voiceNoteUrl,
      date: d.createdAt,
      ratePerKg: d.ratePerKg,
      totalWeight: d.totalWeight,
      kardaWeight: d.kardaWeight ?? 0,
      netWeight: d.netWeight ?? d.totalWeight,
      palledariAmount: d.palledariAmount ?? 0,
      totalAmount: d.totalAmount,
      status: d.status,
      bagWeights: d.bagWeights ?? [],
    });
    if (d.voiceNoteUrl) {
      entries.push({
        id: d._id + "_voice",
        type: "voice_note",
        description: "Voice Note by Munsi",
        amount: null,
        bags: null,
        cropType: null,
        voiceNoteUrl: d.voiceNoteUrl,
        date: d.createdAt,
        ratePerKg: null,
        totalWeight: null,
        labourCharge: null,
      });
    }
  }

  for (const t of txns) {
    const descMap = {
      advance:    "Pre-Season Advance",
      payment:    "Seth ne payment ki",
      bag_issue:  `${t.bags ?? 0} Boris Issued`,
      bag_return: `${t.bags ?? 0} Boris Returned`,
      petty_cash: "Petty Cash Given",
    };
    entries.push({
      id: t._id,
      type: t.type,
      description: descMap[t.type] ?? t.type,
      amount: t.amount,
      bags: t.bags,
      cropType: null,
      voiceNoteUrl: null,
      date: t.createdAt,
      ratePerKg: null,
      totalWeight: null,
      labourCharge: null,
      paymentMode: t.paymentMode,
      runningBalance: t.runningBalance,
      runningAdvance: t.runningAdvance,
      runningInterest: t.runningInterest,
    });
  }

  for (const i of interestEvents) {
    entries.push({
      id: i._id,
      type: "interest_accrual",
      description: `Interest Generated (${i.ratePerMonth}% for ${i.days} days)`,
      amount: i.amount,
      bags: null,
      cropType: null,
      voiceNoteUrl: null,
      date: i.createdAt,
      ratePerKg: null,
      totalWeight: null,
      labourCharge: null,
    });
  }

  for (const s of settlements) {
    entries.push({
      id: s._id,
      type: "settlement",
      description: `Crop Settlement`,
      amount: s.finalAmount,
      bags: null,
      cropType: null,
      voiceNoteUrl: null,
      date: s.createdAt,
      ratePerKg: null,
      totalWeight: null,
      labourCharge: null,
      paymentMode: s.paymentMethod,
      cropAmount: s.cropAmount,
      jamaRecovered: s.jamaRecovered,
      advanceRecovered: s.advanceRecovered,
      interestRecovered: s.interestRecovered,
      chhootAmount: s.chhootAmount,
      runningBalance: s.runningBalance,
      runningAdvance: s.runningAdvance,
      runningInterest: s.runningInterest,
    });
  }

  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(entries);
};
