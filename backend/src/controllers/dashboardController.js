import Farmer from "../models/Farmer.js";
import WeightEntry from "../models/WeightEntry.js";
import Transaction from "../models/Transaction.js";
import Settlement from "../models/Settlement.js";
import Expense from "../models/Expense.js";
import GodownStock from "../models/GodownStock.js";
import B2bDispatch from "../models/B2bDispatch.js";
import FundTransfer from "../models/FundTransfer.js";
import InterestAccrual from "../models/InterestAccrual.js";
import CropRate from "../models/CropRate.js";
import Settings from "../models/Settings.js";

export const getSummary = async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const todayStart = new Date(today);
  const [
    todayEntries, todayDirectPurchases, todayExpensesAgg,
    weightTotalsAgg, expenseCropAgg, todaySalesAgg, dispatchItemsAgg, settlementAgg,
    todayTransactionsAgg, todaySettlementsAgg
  ] = await Promise.all([
    WeightEntry.aggregate([{ $match: { sethId: req.sethId, createdAt: { $gte: todayStart } } }, { $group: { _id: null, totalWeight: { $sum: "$totalWeight" }, totalAmount: { $sum: "$netAmount" } } }]),
    Expense.aggregate([{ $match: { sethId: req.sethId, type: "direct_purchase", date: today } }, { $group: { _id: null, totalWeight: { $sum: "$weight" }, totalAmount: { $sum: "$amount" } } }]),
    Expense.aggregate([{ $match: { sethId: req.sethId, date: today, type: { $ne: "direct_purchase" } } }, { $group: { _id: null, totalAmount: { $sum: "$amount" } } }]),
    WeightEntry.aggregate([{ $match: { sethId: req.sethId, createdAt: { $gte: todayStart } } }, { $group: { _id: "$cropType", bought: { $sum: "$totalWeight" } } }]),
    Expense.aggregate([{ $match: { sethId: req.sethId, type: "direct_purchase", date: today } }, { $group: { _id: "$cropType", bought: { $sum: "$weight" } } }]),
    B2bDispatch.aggregate([{ $match: { sethId: req.sethId, createdAt: { $gte: todayStart } } }, { $group: { _id: null, totalSalesValue: { $sum: "$paidAmount" } } }]),
    B2bDispatch.aggregate([{ $match: { sethId: req.sethId, createdAt: { $gte: todayStart } } }, { $unwind: "$items" }, { $group: { _id: "$items.cropType", totalSold: { $sum: "$items.weightKg" } } }]),
    Settlement.aggregate([{ $match: { sethId: req.sethId, createdAt: { $gte: todayStart } } }, { $group: { _id: null, interestEarned: { $sum: "$interestRecovered" } } }]),
    Transaction.aggregate([{ $match: { sethId: req.sethId, createdAt: { $gte: todayStart }, type: { $in: ["advance", "payment", "petty_cash"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Settlement.aggregate([{ $match: { sethId: req.sethId, createdAt: { $gte: todayStart }, paymentMethod: { $ne: "Jama" } } }, { $group: { _id: null, total: { $sum: "$finalAmount" } } }])
  ]);

  const todayPurchaseKg = (todayEntries[0]?.totalWeight || 0) + (todayDirectPurchases[0]?.totalWeight || 0);
  const todayExpenseTotal = todayExpensesAgg[0]?.totalAmount || 0;
  
  // Today Kharedi (Total Value of Crop Purchased, used for P&L)
  const todayKharedi = (todayEntries[0]?.totalAmount || 0) + (todayDirectPurchases[0]?.totalAmount || 0);

  // Today Cash Outflow (Bhugtan - actual cash that left wallets today)
  const todayCashOutflow = todayExpenseTotal + (todayDirectPurchases[0]?.totalAmount || 0) + (todayTransactionsAgg[0]?.total || 0) + (todaySettlementsAgg[0]?.total || 0);

  // Accrual Profit Calculation for Today
  const currentRates = await CropRate.find({ sethId: req.sethId });
  const settingsDoc = await Settings.findOne({ sethId: req.sethId });
  const shrinkageRate = settingsDoc ? (settingsDoc.shrinkagePercent / 100) : 0.02;
  const getRate = (crop) => currentRates.find(r => r.cropType === crop)?.ratePerKg || (crop === 'wheat' ? 22 : crop === 'maize' ? 20 : crop === 'soybean' ? 45 : 30);
  
  let todayInventoryValue = 0;
  let todayShrinkageLoss = 0;
  
  ['wheat', 'maize', 'rice', 'soybean'].forEach(crop => {
    const b = weightTotalsAgg.find(w => w._id === crop)?.bought || 0;
    const db = expenseCropAgg.find(e => e._id === crop)?.bought || 0;
    const s = dispatchItemsAgg.find(d => d._id === crop)?.totalSold || 0;
    const tB = b + db;
    todayInventoryValue += (tB - s) * getRate(crop);
    todayShrinkageLoss += (tB * shrinkageRate) * getRate(crop);
  });

  const todaySalesValue = todaySalesAgg[0]?.totalSalesValue || 0;
  const todayInterestEarned = settlementAgg[0]?.interestEarned || 0;
  
  const todayGrossMargin = todaySalesValue + todayInventoryValue - todayKharedi;
  const todayNetProfit = todayGrossMargin + todayInterestEarned - todayExpenseTotal - todayShrinkageLoss;

  const [activeFarmers, totalFarmers, pendingSettlements] = await Promise.all([
    Farmer.countDocuments({ sethId: req.sethId, $or: [{ balance: { $ne: 0 } }, { bagsIssued: { $gt: 0 } }] }),
    Farmer.countDocuments({ sethId: req.sethId }),
    WeightEntry.countDocuments({ sethId: req.sethId, status: "pending" })
  ]);

  // Aggregations for Wallets
  const [
    b2bSales, transfersToMunsi,
    sethExpenses, sethSettlements, sethAdvances, sethPayments,
    munsiExpenses, munsiSettlements, munsiAdvances, munsiPayments
  ] = await Promise.all([
    // Total B2B Revenue (Sum of all paidAmount)
    B2bDispatch.aggregate([{ $match: { sethId: req.sethId } }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
    
    // Transfers grouped by direction
    FundTransfer.aggregate([{ $match: { sethId: req.sethId } }, { $group: { _id: "$direction", total: { $sum: "$amount" } } }]),

    // Seth Outflows
    Expense.aggregate([{ $match: { sethId: req.sethId, paidBy: "seth" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Settlement.aggregate([{ $match: { sethId: req.sethId, paidBy: "seth", paymentMethod: { $ne: "Jama" } } }, { $group: { _id: null, total: { $sum: "$finalAmount" } } }]),
    Transaction.aggregate([{ $match: { sethId: req.sethId, paidBy: "seth", type: { $in: ["advance", "payment", "petty_cash"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    
    // Seth Inflows (from Farmers paying cash directly to Seth)
    Transaction.aggregate([{ $match: { sethId: req.sethId, paidBy: "seth", type: "deposit" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),

    // Munsi Outflows
    Expense.aggregate([{ $match: { sethId: req.sethId, paidBy: "munsi" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Settlement.aggregate([{ $match: { sethId: req.sethId, paidBy: "munsi", paymentMethod: { $ne: "Jama" } } }, { $group: { _id: null, total: { $sum: "$finalAmount" } } }]),
    Transaction.aggregate([{ $match: { sethId: req.sethId, paidBy: "munsi", type: { $in: ["advance", "payment", "petty_cash"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),

    // Munsi Inflows (Farmers paying Munsi directly)
    Transaction.aggregate([{ $match: { sethId: req.sethId, paidBy: "munsi", type: "deposit" } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
  ]);

  const getTotal = (agg) => agg[0]?.total || 0;

  const totalB2B = getTotal(b2bSales);
  
  const sethToMunsiAmount = transfersToMunsi.find(t => t._id === "seth_to_munsi")?.total || 0;
  const legacyTransfers  = transfersToMunsi.find(t => !t._id)?.total || 0;
  const totalTransfersToMunsi = sethToMunsiAmount + legacyTransfers;
  const totalTransfersToSeth  = transfersToMunsi.find(t => t._id === "munsi_to_seth")?.total || 0;

  const sethWalletBalance = 
    totalB2B 
    + getTotal(sethPayments)
    - getTotal(sethExpenses) 
    - getTotal(sethSettlements) 
    - getTotal(sethAdvances)
    - totalTransfersToMunsi
    + totalTransfersToSeth;

  const munsiCashBalance = 
    totalTransfersToMunsi
    - totalTransfersToSeth
    + getTotal(munsiPayments)
    - getTotal(munsiExpenses)
    - getTotal(munsiSettlements)
    - getTotal(munsiAdvances);

  res.json({
    todayPurchaseKg,
    todayKharedi,
    todayCashOutflow,
    todayNetProfit,
    sethWalletBalance,
    munsiCashBalance,
    pendingSettlements,
    activeFarmers,
    totalFarmers,
    todayExpenses: todayExpenseTotal,
  });
};

export const getPassbook = async (req, res) => {
  const today      = new Date().toISOString().split("T")[0];
  const filterDate = req.query.date || "all";
  const limit      = parseInt(req.query.limit || "50");
  const role       = req.query.role || "seth";

  let settlements, expenses, txns, txnsIn, b2bSales;

  if (filterDate === "all") {
    settlements = await Settlement.find({ sethId: req.sethId, paymentMethod: { $ne: "Jama" } }).sort({ createdAt: -1 }).limit(limit);
    expenses    = await Expense.find({ sethId: req.sethId }).sort({ createdAt: -1 }).limit(limit);
    txns        = await Transaction.find({ sethId: req.sethId, type: { $in: ["advance", "petty_cash", "payment"] } }).sort({ createdAt: -1 }).limit(limit);
    txnsIn      = await Transaction.find({ sethId: req.sethId, type: "deposit" }).sort({ createdAt: -1 }).limit(limit);
    b2bSales    = await B2bDispatch.find({ sethId: req.sethId, paidAmount: { $gt: 0 } }).sort({ createdAt: -1 }).limit(limit);
  } else {
    const start = new Date(filterDate);
    const end   = new Date(filterDate); end.setDate(end.getDate() + 1);
    settlements = await Settlement.find({ sethId: req.sethId, paymentMethod: { $ne: "Jama" }, createdAt: { $gte: start, $lt: end } });
    expenses    = await Expense.find({ sethId: req.sethId, date: filterDate });
    txns        = await Transaction.find({ sethId: req.sethId, type: { $in: ["advance", "petty_cash", "payment"] }, createdAt: { $gte: start, $lt: end } });
    txnsIn      = await Transaction.find({ sethId: req.sethId, type: "deposit", createdAt: { $gte: start, $lt: end } });
    b2bSales    = await B2bDispatch.find({ sethId: req.sethId, paidAmount: { $gt: 0 }, createdAt: { $gte: start, $lt: end } });
  }

  let allEntries = [
    ...settlements.map(s => ({ id: s._id, description: s.farmerName, amount: s.finalAmount, direction: "out", category: s.paymentMethod === "UPI" ? "upi_out" : "cash_out", farmerName: s.farmerName, time: s.createdAt, paidBy: s.paidBy })),
    ...expenses.map(e    => ({ id: e._id, description: e.type === "palledari" ? "Palledari Labor" : e.type === "bhada" ? "Bhada Transport" : "Miscellaneous", amount: e.amount, direction: "out", category: "expense", farmerName: null, time: e.createdAt, paidBy: e.paidBy })),
    ...txns.map(t        => ({ id: t._id, description: `${t.farmerName} — ${t.type === "advance" ? "Advance" : t.type === "payment" ? "Payment" : "Petty Cash"}`, amount: t.amount, direction: "out", category: t.type, farmerName: t.farmerName, time: t.createdAt, paidBy: t.paidBy })),
    ...txnsIn.map(t      => ({ id: t._id, description: `${t.farmerName} — Jama`, amount: t.amount, direction: "in", category: "jama", farmerName: t.farmerName, time: t.createdAt, paidBy: t.paidBy })),
    ...b2bSales.map(b    => ({ id: b._id, description: `B2B Sales — ${b.buyerName || 'Buyer'}`, amount: b.paidAmount, direction: "in", category: "sales", farmerName: null, time: b.createdAt, paidBy: "seth" })),
  ];

  if (role === "munsi") {
    allEntries = allEntries.filter(e => e.paidBy === "munsi");
  }

  const sortedEntries = allEntries.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, limit);

  res.json(sortedEntries);
};

export const getAnalytics = async (req, res) => {
  const { startDate, endDate } = req.query;
  const matchStage = { sethId: req.sethId };
  if (startDate && endDate) {
    const endObj = new Date(endDate);
    endObj.setDate(endObj.getDate() + 1);
    matchStage.createdAt = { $gte: new Date(startDate), $lt: endObj };
  }

  const [
    settlementAgg, salesAgg, expenseAgg, weightAgg, 
    activeFarmers, newFarmers, settlementCleared, settlementPending, cropTotalsAgg, dispatchCropAgg
  ] = await Promise.all([
    Settlement.aggregate([{ $match: matchStage }, { $group: { _id: null, interestEarned: { $sum: "$interestRecovered" } } }]),
    B2bDispatch.aggregate([{ $match: matchStage }, { $group: { _id: null, totalSales: { $sum: "$paidAmount" } } }]),
    Expense.aggregate([
      { $match: matchStage }, 
      { $group: { 
          _id: null, 
          totalExpenses: { $sum: { $cond: [{ $ne: ["$type", "direct_purchase"] }, "$amount", 0] } },
          directBuySpend: { $sum: { $cond: [{ $eq: ["$type", "direct_purchase"] }, "$amount", 0] } },
          directBuyVolume: { $sum: { $cond: [{ $eq: ["$type", "direct_purchase"] }, "$weight", 0] } }
        }
      }
    ]),
    WeightEntry.aggregate([{ $match: matchStage }, { $group: { _id: null, volumeTraded: { $sum: "$totalWeight" }, totalSpend: { $sum: "$netAmount" } } }]),
    Farmer.countDocuments({ sethId: req.sethId, balance: { $ne: 0 } }),
    Farmer.countDocuments(matchStage.createdAt ? { sethId: req.sethId, createdAt: matchStage.createdAt } : { sethId: req.sethId, createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } }),
    Settlement.countDocuments({ status: "completed", ...matchStage }),
    Settlement.countDocuments({ status: "pending", ...matchStage }),
    B2bDispatch.aggregate([{ $match: matchStage }, { $unwind: "$items" }, { $group: { _id: "$items.cropType", revenue: { $sum: "$items.itemValue" } } }]),
    B2bDispatch.aggregate([{ $match: matchStage }, { $unwind: "$items" }, { $group: { _id: "$items.cropType", sold: { $sum: "$items.weightKg" } } }])
  ]);

  const totalSpend    = (weightAgg[0]?.totalSpend || 0) + (expenseAgg[0]?.directBuySpend || 0);
  const totalSales    = salesAgg[0]?.totalSales || 0;
  const totalExpenses = expenseAgg[0]?.totalExpenses || 0;
  const interestEarned = settlementAgg[0]?.interestEarned || 0;
  
  const godown = await GodownStock.findOne({ sethId: req.sethId }) || { wheat: 0, maize: 0, rice: 0, soybean: 0 };
  const currentRates = await CropRate.find({ sethId: req.sethId });
  const settingsDoc = await Settings.findOne({ sethId: req.sethId });
  const shrinkageRate = settingsDoc ? (settingsDoc.shrinkagePercent / 100) : 0.02;
  const getRate = (crop) => currentRates.find(r => r.cropType === crop)?.ratePerKg || (crop === 'wheat' ? 22 : crop === 'maize' ? 20 : crop === 'soybean' ? 45 : 30);
  
  const weightTotalsAgg = await WeightEntry.aggregate([
    { $match: matchStage },
    { $group: { _id: "$cropType", bought: { $sum: "$totalWeight" } } }
  ]);

  const expenseCropAgg = await Expense.aggregate([
    { $match: { ...matchStage, type: "direct_purchase" } },
    { $group: { _id: "$cropType", bought: { $sum: "$weight" } } }
  ]);

  let inventoryValue = 0;
  let topShrinkageLoss = 0;
  
  ['wheat', 'maize', 'rice', 'soybean'].forEach(crop => {
    const b = weightTotalsAgg.find(w => w._id === crop)?.bought || 0;
    const db = expenseCropAgg.find(e => e._id === crop)?.bought || 0;
    const s = dispatchCropAgg.find(d => d._id === crop)?.sold || 0;
    const totalBought = b + db;
    
    inventoryValue += (totalBought - s) * getRate(crop);
    topShrinkageLoss += (totalBought * shrinkageRate) * getRate(crop);
  });

  const totalBoughtVolume = (weightAgg[0]?.volumeTraded || 0) + (expenseAgg[0]?.directBuyVolume || 0);
  const netProfit     = totalSales + inventoryValue - totalSpend - totalExpenses - topShrinkageLoss + interestEarned;
  const volumeTraded  = totalBoughtVolume;

  // Real profit trend grouping by day
  let monthMatch = { sethId: req.sethId };
  if (startDate && endDate) {
    const endObj = new Date(endDate);
    endObj.setDate(endObj.getDate() + 1);
    monthMatch.createdAt = { $gte: new Date(startDate), $lt: endObj };
  }

  // We need to find the earliest date in the database to know where to start the daily array
  let earliestDate = startDate ? new Date(startDate) : null;
  if (!earliestDate) {
    const earliestSettlement = await Settlement.findOne({ sethId: req.sethId }).sort({ createdAt: 1 });
    earliestDate = earliestSettlement ? earliestSettlement.createdAt : new Date();
    // Default to at least 30 days ago if the database is very new
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (earliestDate > thirtyDaysAgo) earliestDate = thirtyDaysAgo;
  }
  earliestDate.setHours(0, 0, 0, 0);

  const dayGroup = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } };

  const realTrendAgg = await WeightEntry.aggregate([
    { $match: monthMatch },
    { $group: { _id: dayGroup, spend: { $sum: "$netAmount" } } }
  ]);
  const interestTrendAgg = await Settlement.aggregate([
    { $match: monthMatch },
    { $group: { _id: dayGroup, interest: { $sum: "$interestRecovered" } } }
  ]);

  const salesTrendAgg = await B2bDispatch.aggregate([
    { $match: monthMatch },
    { $group: { _id: dayGroup, sales: { $sum: "$paidAmount" } } }
  ]);

  const expenseTrendAgg = await Expense.aggregate([
    { $match: monthMatch },
    { $group: { 
        _id: dayGroup, 
        expenses: { $sum: { $cond: [{ $ne: ["$type", "direct_purchase"] }, "$amount", 0] } },
        directSpend: { $sum: { $cond: [{ $eq: ["$type", "direct_purchase"] }, "$amount", 0] } }
      } 
    }
  ]);

  const cropDayAgg = await B2bDispatch.aggregate([
    { $match: monthMatch },
    { $unwind: "$items" },
    { $group: { _id: { date: dayGroup, crop: "$items.cropType" }, revenue: { $sum: "$items.itemValue" } } }
  ]);

  const expenseDayAgg = await Expense.aggregate([
    { $match: monthMatch },
    { $group: { _id: { date: dayGroup, type: "$type" }, amount: { $sum: "$amount" } } }
  ]);

  const weightTrendAgg = await WeightEntry.aggregate([
    { $match: monthMatch },
    { $group: { _id: { date: dayGroup, crop: "$cropType" }, bought: { $sum: "$totalWeight" } } }
  ]);

  const directWeightTrendAgg = await Expense.aggregate([
    { $match: { ...monthMatch, type: "direct_purchase" } },
    { $group: { _id: { date: dayGroup, crop: "$cropType" }, bought: { $sum: "$weight" } } }
  ]);

  const dispatchTrendAgg = await B2bDispatch.aggregate([
    { $match: monthMatch },
    { $unwind: "$items" },
    { $group: { _id: { date: dayGroup, crop: "$items.cropType" }, sold: { $sum: "$items.weightKg" } } }
  ]);

  const dailyTrendMap = {};

  // Initialize dates for the range to avoid gaps
  let current = new Date(earliestDate);
  const endD = (startDate && endDate) ? new Date(endDate) : new Date();
  while (current <= endD) {
    const dStr = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    dailyTrendMap[dStr] = { date: dStr, profit: 0, spend: 0, sales: 0, expenses: 0, interest: 0 };
    current.setDate(current.getDate() + 1);
  }

  const ensureDay = (dateStr) => {
    if (!dateStr) return null;
    if (!dailyTrendMap[dateStr]) {
      dailyTrendMap[dateStr] = { date: dateStr, profit: 0, spend: 0, sales: 0, expenses: 0, interest: 0 };
    }
    return dateStr;
  };

  realTrendAgg.forEach(t => {
    const k = ensureDay(t._id);
    if(k) dailyTrendMap[k].spend += t.spend;
  });
  interestTrendAgg.forEach(t => {
    const k = ensureDay(t._id);
    if(k) dailyTrendMap[k].interest += (t.interest || 0);
  });
  salesTrendAgg.forEach(t => {
    const k = ensureDay(t._id);
    if(k) dailyTrendMap[k].sales += t.sales;
  });
  expenseTrendAgg.forEach(t => {
    const k = ensureDay(t._id);
    if(k) {
      dailyTrendMap[k].expenses += t.expenses;
      dailyTrendMap[k].spend += t.directSpend;
    }
  });

  cropDayAgg.forEach(t => {
    const k = ensureDay(t._id.date);
    if(k) dailyTrendMap[k][t._id.crop] = (dailyTrendMap[k][t._id.crop] || 0) + t.revenue;
  });

  expenseDayAgg.forEach(t => {
    const k = ensureDay(t._id.date);
    if(k) dailyTrendMap[k][t._id.type] = (dailyTrendMap[k][t._id.type] || 0) + t.amount;
  });

  const dailyTrend = Object.values(dailyTrendMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => {
      const dayBought = weightTrendAgg.filter(w => w._id.date === d.date);
      const dayDirectBought = directWeightTrendAgg.filter(w => w._id.date === d.date);
      const daySold = dispatchTrendAgg.filter(x => x._id.date === d.date);
      
      let dayInventoryValue = 0;
      let dayShrinkageLoss = 0;
      let dayVolume = 0;

      ['wheat', 'maize', 'rice', 'soybean'].forEach(crop => {
        const b = dayBought.find(w => w._id.crop === crop)?.bought || 0;
        const db = dayDirectBought.find(w => w._id.crop === crop)?.bought || 0;
        const totalB = b + db;
        const s = daySold.find(x => x._id.crop === crop)?.sold || 0;
        const rate = getRate(crop);
        
        dayVolume += totalB;
        dayInventoryValue += (totalB - s) * rate;
        dayShrinkageLoss += (totalB * shrinkageRate) * rate;
      });

      d.grossMargin = d.sales + dayInventoryValue - d.spend;
      d.profit = d.grossMargin - d.expenses - dayShrinkageLoss + d.interest;
      d.volume = dayVolume;
      return d;
    });

  const cropTotals = { wheat: 0, maize: 0, rice: 0, soybean: 0 };
  for (const c of cropTotalsAgg) if (c._id) cropTotals[c._id] = c.revenue;
  
  const topCrops = Object.entries(cropTotals).map(([crop, revenue]) => ({ crop, revenue })).sort((a, b) => b.revenue - a.revenue);

  res.json({ netProfit, totalSpend, totalSales, totalExpenses, volumeTraded, activeFarmers, newFarmers, dailyTrend, topCrops, settlementStatus: { cleared: settlementCleared, pending: settlementPending, overdue: 0 } });
};

export const getPLReport = async (req, res) => {
  const { startDate, endDate, seasonName } = req.query;
  const matchStage = { sethId: req.sethId };
  if (startDate && endDate) {
    const endObj = new Date(endDate);
    endObj.setDate(endObj.getDate() + 1);
    matchStage.createdAt = { $gte: new Date(startDate), $lt: endObj };
  }

  const [
    weightAgg, dispatchSalesAgg, dispatchItemsAgg, settlementAgg, expenseAgg, advanceAgg, weightTotalsAgg, expenseCropAgg
  ] = await Promise.all([
    WeightEntry.aggregate([{ $match: matchStage }, { $group: { _id: null, totalWeight: { $sum: "$totalWeight" }, totalSpend: { $sum: "$netAmount" }, count: { $sum: 1 } } }]),
    B2bDispatch.aggregate([{ $match: matchStage }, { $group: { _id: null, totalSalesValue: { $sum: "$paidAmount" } } }]),
    B2bDispatch.aggregate([{ $match: matchStage }, { $unwind: "$items" }, { $group: { _id: "$items.cropType", totalSold: { $sum: "$items.weightKg" } } }]),
    Settlement.aggregate([{ $match: matchStage }, { $group: { _id: null, interestEarned: { $sum: "$interestRecovered" } } }]),
    Expense.aggregate([{ $match: matchStage }, { $group: { _id: null, totalExpenses: { $sum: { $cond: [{ $ne: ["$type", "direct_purchase"] }, "$amount", 0] } }, directBuySpend: { $sum: { $cond: [{ $eq: ["$type", "direct_purchase"] }, "$amount", 0] } }, directBuyVolume: { $sum: { $cond: [{ $eq: ["$type", "direct_purchase"] }, "$weight", 0] } } } }]),
    Farmer.aggregate([{ $match: { sethId: req.sethId } }, { $group: { _id: null, pendingAdvances: { $sum: "$advanceAmount" } } }]),
    WeightEntry.aggregate([{ $match: matchStage }, { $group: { _id: "$cropType", bought: { $sum: "$totalWeight" } } }]),
    Expense.aggregate([{ $match: { ...matchStage, type: "direct_purchase" } }, { $group: { _id: "$cropType", bought: { $sum: "$weight" } } }])
  ]);

  const totalBought = (weightAgg[0]?.totalWeight || 0) + (expenseAgg[0]?.directBuyVolume || 0);
  const count = weightAgg[0]?.count || 1;
  
  const totalSold = dispatchItemsAgg.reduce((sum, d) => sum + (d.totalSold || 0), 0);
  const totalSalesValue = dispatchSalesAgg[0]?.totalSalesValue || 0;
  
  const currentRates = await CropRate.find({ sethId: req.sethId });
  const settingsDoc = await Settings.findOne({ sethId: req.sethId });
  const shrinkageRate = settingsDoc ? (settingsDoc.shrinkagePercent / 100) : 0.02;
  const getRate = (crop) => currentRates.find(r => r.cropType === crop)?.ratePerKg || (crop === 'wheat' ? 22 : crop === 'maize' ? 20 : crop === 'soybean' ? 45 : 30);
  
  let inventoryValue = 0;
  let inventoryKg = 0;
  let shrinkageLoss = 0;
  
  ['wheat', 'maize', 'rice', 'soybean'].forEach(crop => {
    const b = weightTotalsAgg.find(w => w._id === crop)?.bought || 0;
    const db = expenseCropAgg.find(e => e._id === crop)?.bought || 0;
    const s = dispatchItemsAgg.find(d => d._id === crop)?.totalSold || 0;
    const tB = b + db;
    
    inventoryKg += (tB - s);
    inventoryValue += (tB - s) * getRate(crop);
    shrinkageLoss += (tB * shrinkageRate) * getRate(crop);
  });
  
  shrinkageLoss = Math.round(shrinkageLoss * 100) / 100;
  const shrinkageKg = Math.round((totalBought * shrinkageRate) * 100) / 100;

  const totalCropCost = (weightAgg[0]?.totalSpend || 0) + (expenseAgg[0]?.directBuySpend || 0);
  const interestEarned = settlementAgg[0]?.interestEarned || 0;
  
  const totalExpenses = expenseAgg[0]?.totalExpenses || 0;
  const pendingAdvances = advanceAgg[0]?.pendingAdvances || 0;

  const grossMargin = (totalSalesValue + inventoryValue) - totalCropCost;
  const netProfit = grossMargin + interestEarned - totalExpenses - shrinkageLoss;

  res.json({ grossMargin, interestEarned, totalExpenses, shrinkageLoss, netProfit, pendingAdvances, season: seasonName || "All Time", totalBought, totalSold, shrinkageKg, inventoryValue, inventoryKg });
};

export const getInterest = async (req, res) => {
  const { startDate, endDate } = req.query;

  let matchStage = { sethId: req.sethId };
  if (startDate && endDate) {
    const endObj = new Date(endDate);
    endObj.setDate(endObj.getDate() + 1);
    matchStage = { sethId: req.sethId, createdAt: { $gte: new Date(startDate), $lt: endObj } };
  }

  const accruedAgg = await InterestAccrual.aggregate([{ $match: matchStage }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  const totalAccrued = accruedAgg[0]?.total || 0;

  const settlementAgg = await Settlement.aggregate([{ $match: matchStage }, { $group: { _id: null, total: { $sum: "$interestRecovered" } } }]);
  const totalRecovered = settlementAgg[0]?.total || 0;

  const farmerAgg = await Farmer.aggregate([{ $match: { sethId: req.sethId } }, { $group: { _id: null, outstandingInterest: { $sum: "$accruedInterest" } } }]);
  const outstandingInterest = farmerAgg[0]?.outstandingInterest || 0;

  let earliestDate = startDate ? new Date(startDate) : null;
  if (!earliestDate) {
    const earliestInterest = await InterestAccrual.findOne({ sethId: req.sethId }).sort({ createdAt: 1 });
    earliestDate = earliestInterest ? earliestInterest.createdAt : new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (earliestDate > thirtyDaysAgo) earliestDate = thirtyDaysAgo;
  }
  earliestDate.setHours(0, 0, 0, 0);

  const dayGroup = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } };

  const interestTrendAgg = await InterestAccrual.aggregate([
    { $match: matchStage },
    { $group: { _id: dayGroup, amount: { $sum: "$amount" } } }
  ]);

  const recoveryTrendAgg = await Settlement.aggregate([
    { $match: matchStage },
    { $group: { _id: dayGroup, recovered: { $sum: "$interestRecovered" } } }
  ]);

  const dailyTrendMap = {};
  let current = new Date(earliestDate);
  const endD = (startDate && endDate) ? new Date(endDate) : new Date();
  while (current <= endD) {
    const dStr = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    dailyTrendMap[dStr] = { date: dStr, amount: 0, recovered: 0 };
    current.setDate(current.getDate() + 1);
  }

  interestTrendAgg.forEach(t => {
    if (t._id && dailyTrendMap[t._id]) dailyTrendMap[t._id].amount = t.amount;
  });

  recoveryTrendAgg.forEach(t => {
    if (t._id && dailyTrendMap[t._id]) dailyTrendMap[t._id].recovered = t.recovered || 0;
  });

  let cumulative = 0;
  const trend = Object.values(dailyTrendMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => {
      cumulative += d.amount;
      return { 
        date: d.date,
        label: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), 
        amount: d.amount, 
        recovered: d.recovered, 
        cumulative 
      };
    });

  const advanceAgg = await Farmer.aggregate([{ $match: { sethId: req.sethId } }, { $group: { _id: null, totalAdvances: { $sum: "$advanceAmount" } } }]);
  const totalAdvances = advanceAgg[0]?.totalAdvances || 0;

  const topDebtors = await Farmer.aggregate([
    { $match: { sethId: req.sethId, $or: [{ advanceAmount: { $gt: 0 } }, { accruedInterest: { $gt: 0 } }] } },
    { $project: { name: 1, phone: 1, advanceAmount: 1, accruedInterest: 1, totalOwed: { $add: ["$advanceAmount", "$accruedInterest"] } } },
    { $sort: { totalOwed: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    totalAccrued,
    totalRecovered,
    outstandingInterest,
    totalAdvances,
    trend,
    topDebtors
  });
};

export const getInterestDebtors = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const matchStage = { sethId: req.sethId, $or: [{ advanceAmount: { $gt: 0 } }, { accruedInterest: { $gt: 0 } }] };
  
  if (search) {
    matchStage.$and = [
      {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { village: { $regex: search, $options: "i" } }
        ]
      }
    ];
  }

  const debtors = await Farmer.aggregate([
    { $match: matchStage },
    { $project: { name: 1, phone: 1, village: 1, advanceAmount: 1, accruedInterest: 1, totalOwed: { $add: ["$advanceAmount", "$accruedInterest"] } } },
    { $sort: { totalOwed: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]);

  const total = await Farmer.countDocuments(matchStage);

  res.json({ debtors, total, page, pages: Math.ceil(total / limit) });
};
export const getGodownAnalysis = async (req, res) => {
  const now = new Date();
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0,0,0,0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 29);
  thirtyDaysAgo.setHours(0,0,0,0);

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(now.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0,0,0,0);

  try {
    const formatDates = (start, count, isMonth = false) => {
      return Array.from({ length: count }).map((_, i) => {
        const d = new Date(start);
        if (isMonth) {
          d.setMonth(d.getMonth() + i);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return `${d.getFullYear()}-${mm}`;
        } else {
          d.setDate(d.getDate() + i);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${d.getFullYear()}-${mm}-${dd}`;
        }
      });
    };

    const days7 = formatDates(sevenDaysAgo, 7);
    const days30 = formatDates(thirtyDaysAgo, 30);
    const months12 = formatDates(twelveMonthsAgo, 12, true);

    const godownData = await GodownStock.findOne({ sethId: req.sethId }) || { wheat: 0, maize: 0, rice: 0, soybean: 0 };

    const getPurchases = (dateField, sinceDate) => WeightEntry.aggregate([
      { $match: { sethId: req.sethId, createdAt: { $gte: sinceDate } } },
      { $group: { _id: { date: dateField, crop: "$cropType" }, totalIn: { $sum: "$totalWeight" } } }
    ]);
    const getDirectPurchases = (dateField, sinceDate) => Expense.aggregate([
      { $match: { sethId: req.sethId, type: 'direct_purchase', createdAt: { $gte: sinceDate } } },
      { $group: { _id: { date: dateField, crop: "$cropType" }, totalIn: { $sum: "$weight" } } }
    ]);
    const getSales = (dateField, sinceDate) => B2bDispatch.aggregate([
      { $match: { sethId: req.sethId, createdAt: { $gte: sinceDate } } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      { $group: {
          _id: { date: dateField, crop: { $cond: [{ $ifNull: ["$items", false] }, "$items.cropType", "$cropType"] } },
          totalOut: { $sum: { $cond: [{ $ifNull: ["$items", false] }, "$items.weightKg", "$weightKg"] } }
      }}
    ]);

    const dailyDate = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } };
    const monthlyDate = { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } };

    const [
      wP, wDP, wS,
      mP, mDP, mS,
      yP, yDP, yS
    ] = await Promise.all([
      getPurchases(dailyDate, sevenDaysAgo), getDirectPurchases(dailyDate, sevenDaysAgo), getSales(dailyDate, sevenDaysAgo),
      getPurchases(dailyDate, thirtyDaysAgo), getDirectPurchases(dailyDate, thirtyDaysAgo), getSales(dailyDate, thirtyDaysAgo),
      getPurchases(monthlyDate, twelveMonthsAgo), getDirectPurchases(monthlyDate, twelveMonthsAgo), getSales(monthlyDate, twelveMonthsAgo)
    ]);

    const buildSeries = (dateList, purchases, direct, sales, getLabel) => {
      const series = { wheat: [], maize: [], rice: [], soybean: [] };
      let curr = { 
        wheat: godownData.wheat || 0,
        maize: godownData.maize || 0,
        rice: godownData.rice || 0,
        soybean: godownData.soybean || 0
      };
      
      const reversedDates = [...dateList].reverse();
      reversedDates.forEach(dateStr => {
        const label = getLabel(dateStr);
        Object.keys(series).forEach(crop => {
          const p = purchases.find(x => x._id.date === dateStr && x._id.crop === crop);
          const d = direct.find(x => x._id.date === dateStr && x._id.crop === crop);
          const s = sales.find(x => x._id.date === dateStr && x._id.crop === crop);
          const inV = (p ? p.totalIn : 0) + (d ? d.totalIn : 0);
          const outV = s ? s.totalOut : 0;
          
          series[crop].push({ date: label, stock: curr[crop], dispatch: outV });
          curr[crop] = curr[crop] - inV + outV;
        });
      });
      
      Object.keys(series).forEach(crop => series[crop].reverse());
      return series;
    };

    const getDayLabel = (d) => new Date(d).toLocaleDateString("en-IN", { weekday: "short" });
    const getDateLabel = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const getMonthLabel = (m) => new Date(m + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

    res.json({
      weekly: buildSeries(days7, wP, wDP, wS, getDayLabel),
      monthly: buildSeries(days30, mP, mDP, mS, getDateLabel),
      yearly: buildSeries(months12, yP, yDP, yS, getMonthLabel)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to aggregate godown analysis" });
  }
};
