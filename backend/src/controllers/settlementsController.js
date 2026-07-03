import Settlement from "../models/Settlement.js";
import Farmer from "../models/Farmer.js";
import WeightEntry from "../models/WeightEntry.js";
import { accrueInterestForFarmer } from "../utils/interest.js";

export const getSettlements = async (req, res) => {
  const { farmerId, status } = req.query;
  const filter = { sethId: req.sethId };
  if (farmerId) filter.farmerId = farmerId;
  if (status)   filter.status = status;
  res.json(await Settlement.find(filter).sort({ createdAt: -1 }));
};

export const createSettlement = async (req, res) => {
  const {
    farmerId,
    weightEntryId,
    cropAmount,
    advanceRecovered  = 0,
    interestRecovered = 0,
    jamaRecovered     = 0,
    chhootAmount      = 0,
    chhootNotes       = null,
    recoveryMode,
    finalAmount,
    paymentMethod     = "cash",
    upiTransactionId  = null,
    deliveryBags      = 0,
    adjustedRate      = null,
    paidBy            = "munsi"
  } = req.body;

  const pCropAmount = Number(cropAmount);
  const pAdvanceRecovered = Number(advanceRecovered);
  const pInterestRecovered = Number(interestRecovered);
  const pJamaRecovered = Number(jamaRecovered);
  const pChhootAmount = Number(chhootAmount);
  const pFinalAmount = Number(finalAmount);
  const pDeliveryBags = Number(deliveryBags);

  // Security Loophole fix: Prevent negative amounts
  if (pAdvanceRecovered < 0 || pInterestRecovered < 0 || pJamaRecovered < 0 || pChhootAmount < 0 || pFinalAmount < 0) {
    return res.status(400).json({ error: "Settlement amounts cannot be negative" });
  }

  const farmer = await Farmer.findOne({ _id: farmerId, sethId: req.sethId });
  if (!farmer) return res.status(404).json({ error: "Farmer not found" });

  await accrueInterestForFarmer(farmer);

  // We always add jamaRecovered (which stays in Jama/recovers deficit)
  farmer.balance += pJamaRecovered;
  
  // We only add finalAmount if they chose to deposit the payout into their Jama tab
  if (paymentMethod === "Jama") {
    farmer.balance += pFinalAmount;
  }

  // Reduce principal and accrued interest by recovered amounts
  farmer.advanceAmount   = Math.max(0, farmer.advanceAmount - pAdvanceRecovered);
  farmer.accruedInterest = Math.max(0, farmer.accruedInterest - pInterestRecovered);

  if (pDeliveryBags > 0) {
    farmer.bagsIssued = Math.max(0, farmer.bagsIssued - pDeliveryBags);
  }

  await farmer.save();

  const settlement = await Settlement.create({
    farmerId,
    sethId:           req.sethId,
    farmerName:       farmer.name,
    weightEntryId,
    cropAmount:       pCropAmount,
    jamaRecovered:    pJamaRecovered,
    advanceRecovered: pAdvanceRecovered,
    interestRecovered:pInterestRecovered,
    chhootAmount:     pChhootAmount,
    chhootNotes,
    recoveryMode,
    finalAmount:      pFinalAmount,
    paymentMethod,
    paidBy,
    upiTransactionId,
    adjustedRate,
    status:           "completed",
    runningBalance:   farmer.balance,
    runningAdvance:   farmer.advanceAmount,
    runningInterest:  farmer.accruedInterest,
  });

  await WeightEntry.findOneAndUpdate({ _id: weightEntryId, sethId: req.sethId }, { status: "approved" });

  res.status(201).json(settlement);
};

export const getSettlementById = async (req, res) => {
  const s = await Settlement.findOne({ _id: req.params.id, sethId: req.sethId });
  if (!s) return res.status(404).json({ error: "Settlement not found" });
  res.json(s);
};
