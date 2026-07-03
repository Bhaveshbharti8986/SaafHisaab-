import Transaction from "../models/Transaction.js";
import Farmer from "../models/Farmer.js";
import { accrueInterestForFarmer } from "../utils/interest.js";
import Settlement from "../models/Settlement.js";
import {updateLatestSettlement }from "../utils/helper.js";
export const getTransactions = async (req, res) => {
  const { farmerId, type, limit } = req.query;
  const filter = { sethId: req.sethId };
  if (farmerId) filter.farmerId = farmerId;
  if (type)     filter.type = type;
  let q = Transaction.find(filter).sort({ createdAt: -1 });
  if (limit)    q = q.limit(parseInt(limit));
  res.json(await q);
};

export const createTransaction = async (req, res) => {
  const { farmerId, type, amount, paymentMode = "Cash", paidBy = "munsi", bags, notes, interestRate, chargeInterest } = req.body;
  
  if (!farmerId || !type || amount === undefined || amount === null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  let parsedAmount = Number(amount);
  let parsedBags = bags !== undefined ? Number(bags) : undefined;
  let parsedInterestRate = interestRate !== undefined ? Number(interestRate) : undefined;

  // Security Loophole fix: Prevent negative transactions
  if (parsedAmount < 0) return res.status(400).json({ error: "Amount cannot be negative" });
  if (parsedBags !== undefined && parsedBags < 0) return res.status(400).json({ error: "Bags cannot be negative" });
  if (parsedInterestRate !== undefined && parsedInterestRate < 0) return res.status(400).json({ error: "Interest rate cannot be negative" });

  const farmer = await Farmer.findOne({ _id: farmerId, sethId: req.sethId });
  if (!farmer) return res.status(404).json({ error: "Farmer not found" });

  // 1. First accrue any pending interest before making a transaction
  await accrueInterestForFarmer(farmer);

  // 2. Apply transaction logic to farmer buckets
  if (type === "advance") {
    farmer.advanceAmount += parsedAmount;
    if (typeof chargeInterest === "boolean") farmer.chargeInterest = chargeInterest;
    if (chargeInterest && parsedInterestRate != null) farmer.interestRate = parsedInterestRate;
  }

  if (type === "payment") {
    farmer.balance -= parsedAmount;
  }
//deposite advance+intrest if extra than deposita to farmer balence   and deposote amountis :parsedAmount
  if (type === "deposit") {
    let remaining = parsedAmount;
    //recover intrest first   
    if (farmer.accruedInterest > 0) {
      if (remaining >= farmer.accruedInterest) {
     const interestRecovered = farmer.accruedInterest;
        await updateLatestSettlement(farmerId, req.sethId, interestRecovered);
        remaining -= interestRecovered;
        farmer.accruedInterest = 0;  // means total intrest recovered so it scou also updade in satelment intrest recovred 
      } else {
        farmer.accruedInterest -= remaining;
        await updateLatestSettlement(farmerId, req.sethId, remaining);
        remaining = 0;
      }
    }




    //pay the advance means paying principal
    if (remaining > 0 && farmer.advanceAmount > 0) {
      if (remaining >= farmer.advanceAmount) {
        remaining -= farmer.advanceAmount;
        farmer.advanceAmount = 0;
      } else {
        farmer.advanceAmount -= remaining;
        remaining = 0;
      }
    }
    // than exta deposit to farmer balence
    if (remaining > 0) {
      farmer.balance += remaining;
    }
  }





  if (type === "petty_cash") {
    farmer.balance -= parsedAmount;
  }

  if (type === "bag_issue")  farmer.bagsIssued = Math.max(0, farmer.bagsIssued + (parsedBags ?? 0));
  if (type === "bag_return") farmer.bagsIssued = Math.max(0, farmer.bagsIssued - (parsedBags ?? 0));

  await farmer.save();

  // 3. Create transaction with the precise running balances
  const transaction = await Transaction.create({
    farmerId: farmer._id,
    sethId: req.sethId,
    farmerName: farmer.name,
    type,
    amount: parsedAmount,
    paymentMode,
    paidBy,
    bags:  parsedBags  ?? null,
    notes: notes ?? null,
    runningBalance: farmer.balance,
    runningAdvance: farmer.advanceAmount,
    runningInterest: farmer.accruedInterest,
  });
  
  res.status(201).json({ transaction, farmer });
};
