import GodownStock from "../models/GodownStock.js";
import Expense from "../models/Expense.js";

async function getOrCreateStock(sethId) {
  let stock = await GodownStock.findOne({ sethId });
  if (!stock) stock = await GodownStock.create({ sethId });
  return stock;
}

export const getGodownStock = async (req, res) => {
  const stock = await getOrCreateStock(req.sethId);
  res.json(stock);
};

export const adjustStock = async (req, res) => {
  const { crop, quantityKg } = req.body;
  const stock = await getOrCreateStock(req.sethId);
  
  const parsedQuantityKg = Number(quantityKg);
  // Notice: quantityKg can be negative for manual shrink adjustments, 
  // but total stock cannot drop below 0.
  if (crop === "emptyBags") {
    stock.emptyBags = Math.max(0, stock.emptyBags + parsedQuantityKg);
  } else {
    stock[crop] = Math.max(0, (stock[crop] || 0) + parsedQuantityKg);
  }
  stock.lastUpdated = new Date();
  await stock.save();
  res.json(stock);
};

export const directPurchase = async (req, res) => {
  try {
    const { partyName, cropType, weight, rate, totalAmount } = req.body;
    
    // Security Loophole fix: Prevent negative direct purchases
    if (Number(weight) < 0 || Number(totalAmount) < 0 || Number(rate) < 0) {
      return res.status(400).json({ error: "Purchase amounts cannot be negative" });
    }

    // 1. Add Stock
    const stock = await getOrCreateStock(req.sethId);
    stock[cropType] = (stock[cropType] || 0) + Number(weight);
    stock.lastUpdated = new Date();
    await stock.save();

    // 2. Create Munsi Cash Expense
    const expense = await Expense.create({
      type: "direct_purchase",
      sethId: req.sethId,
      amount: Number(totalAmount),
      paidBy: "munsi",
      date: new Date().toISOString().split("T")[0],
      cropType,
      weight: Number(weight),
      notes: `Direct Purchase: ${cropType} - ${weight}kg @ ₹${rate}/kg from ${partyName}`
    });

    res.json({ success: true, stock, expense });
  } catch (error) {
    console.error("Direct Purchase Error:", error);
    res.status(500).json({ error: "Failed to process direct purchase" });
  }
};
