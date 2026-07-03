import B2bDispatch from "../models/B2bDispatch.js";
import GodownStock from "../models/GodownStock.js";

function withStatus(d) {
  const due  = new Date(d.dueDate);
  const now  = new Date();
  const diff = Math.ceil((due - now) / 86400000);
  
  let paymentStatus = "pending";
  if (d.paidAmount >= d.totalValue) {
    paymentStatus = "paid";
  } else if (d.paidAmount > 0) {
    paymentStatus = "partial";
  }
  
  if (paymentStatus !== "paid" && diff < 0) {
    paymentStatus = "overdue";
  }

  return {
    ...d.toObject(),
    paymentStatus,
    daysOverdue:   diff < 0 && paymentStatus !== "paid" ? Math.abs(diff) : null,
    daysRemaining: diff >= 0 && paymentStatus !== "paid" ? diff : null,
  };
}

export const getDispatches = async (req, res) => {
  const dispatches = await B2bDispatch.find({ sethId: req.sethId }).sort({ createdAt: -1 });
  res.json(dispatches.map(withStatus));
};

export const createDispatch = async (req, res) => {
  const { truckNumber, items, dispatchDate, dueDate, buyerName, notes } = req.body;
  
  let totalValue = 0;
  let dispatchItems = items;

  if (items && items.length > 0) {
    // Loophole fix: Prevent negative items
    for (const item of items) {
      if (item.weightKg < 0 || item.itemValue < 0 || item.ratePerKg < 0) {
        return res.status(400).json({ error: "B2B items cannot have negative values" });
      }
    }
    totalValue = items.reduce((sum, item) => sum + item.itemValue, 0);
  } else {
    const { cropType, weightKg, ratePerKg } = req.body;
    if (weightKg < 0 || ratePerKg < 0) return res.status(400).json({ error: "Cannot have negative values" });
    totalValue = weightKg * ratePerKg;
    dispatchItems = [{ cropType, weightKg, ratePerKg, itemValue: totalValue }];
  }

  const dispatch = await B2bDispatch.create({
    truckNumber,
    sethId: req.sethId,
    items: dispatchItems,
    totalValue,
    paidAmount: 0,
    dispatchDate,
    dueDate,
    buyerName: buyerName ?? null,
    notes: notes ?? null
  });

  let stock = await GodownStock.findOne({ sethId: req.sethId });
  if (stock) {
    for (const item of dispatchItems) {
      stock[item.cropType] = Math.max(0, (stock[item.cropType] || 0) - item.weightKg);
    }
    stock.lastUpdated = new Date();
    await stock.save();
  }

  res.status(201).json(withStatus(dispatch));
};

export const updateDispatch = async (req, res) => {
  const { paidAmount } = req.body;
  let updateData = { ...req.body };
  
  if (paidAmount !== undefined) {
    if (paidAmount < 0) return res.status(400).json({ error: "Paid amount cannot be negative" });
    const existing = await B2bDispatch.findOne({ _id: req.params.id, sethId: req.sethId });
    if (existing) {
      if (paidAmount >= existing.totalValue) updateData.paymentStatus = "paid";
      else if (paidAmount > 0) updateData.paymentStatus = "partial";
      else updateData.paymentStatus = "pending";
    }
  }

  const dispatch = await B2bDispatch.findOneAndUpdate({ _id: req.params.id, sethId: req.sethId }, updateData, { new: true });
  if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });
  res.json(withStatus(dispatch));
};

export const deleteDispatch = async (req, res) => {
  const dispatch = await B2bDispatch.findOneAndDelete({ _id: req.params.id, sethId: req.sethId });
  if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });
  res.sendStatus(204);
};
