import FundTransfer from "../models/FundTransfer.js";

export const getFundTransfers = async (req, res) => {
  const transfers = await FundTransfer.find({ sethId: req.sethId }).sort({ createdAt: -1 });
  res.json(transfers);
};

export const createFundTransfer = async (req, res) => {
  const { amount, date, notes, direction } = req.body;
  if (!amount) return res.status(400).json({ error: "Amount is required" });
  const parsedAmount = Number(amount);
  if (parsedAmount < 0) return res.status(400).json({ error: "Amount cannot be negative" });

  const transfer = await FundTransfer.create({
    amount: parsedAmount,
    sethId: req.sethId,
    direction: direction || "seth_to_munsi",
    date: date || new Date(),
    notes
  });

  res.status(201).json(transfer);
};
