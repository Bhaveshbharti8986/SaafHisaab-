import Expense from "../models/Expense.js";
import GodownStock from "../models/GodownStock.js";

export const getExpenses = async (req, res) => {
  const { date } = req.query;
  const filter = (date && date !== "all") ? { date, sethId: req.sethId } : { sethId: req.sethId };
  res.json(await Expense.find(filter).sort({ createdAt: -1 }).limit(200));
};

export const createExpense = async (req, res) => {
  const { type, amount, notes, date, paidBy, metadata } = req.body;
  if (!type || amount == null || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const parsedAmount = Number(amount);
  // Security Loophole fix: Prevent negative expenses
  if (parsedAmount < 0) {
    return res.status(400).json({ error: "Expense amount cannot be negative" });
  }

  let cropType = null;
  let weight = 0;

  if (type === "direct_purchase" && metadata?.crop && metadata?.weightKg) {
    cropType = metadata.crop;
    weight = Number(metadata.weightKg);
    
    let stock = await GodownStock.findOne({ sethId: req.sethId });
    if (!stock) stock = new GodownStock({ sethId: req.sethId });
    stock[cropType] = (stock[cropType] || 0) + weight;
    stock.lastUpdated = new Date();
    await stock.save();
  }

  const expense = await Expense.create({
    type, sethId: req.sethId, amount: parsedAmount, notes, date, paidBy: paidBy || "munsi", cropType, weight
  });

  res.status(201).json(expense);
};

export const deleteExpense = async (req, res) => {
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, sethId: req.sethId });
  if (!expense) return res.status(404).json({ error: "Expense not found" });
  res.sendStatus(204);
};
