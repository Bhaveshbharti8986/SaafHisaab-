import mongoose from "mongoose";
import Farmer from "../models/Farmer.js";
import WeightEntry from "../models/WeightEntry.js";
import Transaction from "../models/Transaction.js";
import Settlement from "../models/Settlement.js";
import InterestAccrual from "../models/InterestAccrual.js";

const toPaise = (value) => Math.round((Number(value) || 0) * 100);
const fromPaise = (value) => value / 100;
const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const INDIA_UTC_OFFSET_MINUTES = 330;

const eventSort = (a, b) => {
  const time = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (time) return time;
  const priority = { interest: 0, transaction: 1, settlement: 2 };
  return priority[a.kind] - priority[b.kind] || String(a._id).localeCompare(String(b._id));
};

const parseLocalDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return new Date(date.getTime() - INDIA_UTC_OFFSET_MINUTES * 60_000);
};

export function validateStatementRange(from, to) {
  const start = parseLocalDate(from);
  const end = parseLocalDate(to);
  if (!start || !end) return { error: "Invalid date range. Use YYYY-MM-DD." };
  if (start > end) return { error: "The from date must be on or before the to date." };
  const exclusiveEnd = new Date(end.getTime() + 86400000);
  const days = (exclusiveEnd.getTime() - start.getTime()) / 86400000;
  if (days > 3650) return { error: "Statement range cannot exceed 10 years." };
  return { start, exclusiveEnd };
}

export function reconcileStatementLedger({ opening, transactions, settlements, accruals }) {
  if (opening?.status !== "available") {
    return {
      closing: { status: "unavailable", jama: null, principal: null, interest: null },
      depositInterestRecovered: null,
      depositPrincipalRecovered: null,
      depositJamaAdded: null,
      depositAllocations: null,
      snapshotMismatches: 0,
    };
  }

  let jama = toPaise(opening.jama);
  let principal = toPaise(opening.principal);
  let interest = toPaise(opening.interest);
  let depositInterestRecovered = 0;
  let depositPrincipalRecovered = 0;
  let depositJamaAdded = 0;
  let snapshotMismatches = 0;
  const depositAllocations = {};
  const events = [
    ...transactions.map((item) => ({ kind: "transaction", createdAt: item.createdAt, _id: item._id, item })),
    ...settlements.map((item) => ({ kind: "settlement", createdAt: item.createdAt, _id: item._id, item })),
    ...accruals.map((item) => ({ kind: "interest", createdAt: item.createdAt, _id: item._id, item })),
  ].sort(eventSort);

  for (const event of events) {
    if (event.kind === "interest") {
      interest += toPaise(event.item.amount);
    } else if (event.kind === "transaction") {
      const amount = toPaise(event.item.amount);
      if (event.item.type === "payment" || event.item.type === "petty_cash") {
        jama -= amount;
      } else if (event.item.type === "advance") {
        principal += amount;
      } else if (event.item.type === "deposit") {
        let remaining = amount;
        const interestPart = Math.min(interest, remaining);
        interest -= interestPart;
        remaining -= interestPart;
        const principalPart = Math.min(principal, remaining);
        principal -= principalPart;
        remaining -= principalPart;
        jama += remaining;
        depositInterestRecovered += interestPart;
        depositPrincipalRecovered += principalPart;
        depositJamaAdded += remaining;
        depositAllocations[String(event.item._id)] = {
          interestRecovered: fromPaise(interestPart),
          principalRecovered: fromPaise(principalPart),
          jamaAdded: fromPaise(remaining),
        };
      }
    } else if (event.item.status === "completed") {
      jama += toPaise(event.item.jamaRecovered);
      principal = Math.max(0, principal - toPaise(event.item.advanceRecovered));
      interest = Math.max(0, interest - toPaise(event.item.interestRecovered));
      if (String(event.item.paymentMethod).toLowerCase() === "jama") {
        jama += toPaise(event.item.finalAmount);
      }
    }
    if (event.kind !== "interest") {
      const runningValues = [
        ["runningBalance", jama],
        ["runningAdvance", principal],
        ["runningInterest", interest],
      ];
      if (runningValues.some(([field, value]) =>
        event.item[field] != null && Number.isFinite(Number(event.item[field])) && toPaise(event.item[field]) !== value
      )) {
        snapshotMismatches += 1;
      }
    }
  }

  return {
    closing: {
      status: "available",
      jama: fromPaise(jama),
      principal: fromPaise(principal),
      interest: fromPaise(interest),
    },
    depositInterestRecovered: fromPaise(depositInterestRecovered),
    depositPrincipalRecovered: fromPaise(depositPrincipalRecovered),
    depositJamaAdded: fromPaise(depositJamaAdded),
    depositAllocations,
    snapshotMismatches,
  };
}

async function latestRunningSnapshot(farmerId, sethId, before) {
  const [txn, settlement] = await Promise.all([
    Transaction.findOne({ farmerId, sethId, createdAt: { $lt: before } })
      .sort({ createdAt: -1, _id: -1 })
      .lean(),
    Settlement.findOne({ farmerId, sethId, createdAt: { $lt: before } })
      .sort({ createdAt: -1, _id: -1 })
      .lean(),
  ]);
  const candidates = [txn, settlement].filter(Boolean);
  candidates.sort((a, b) => {
    const time = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return time || String(b._id).localeCompare(String(a._id));
  });
  if (!candidates.length) return null;
  const top = candidates[0];
  if (top.runningBalance == null || !Number.isFinite(Number(top.runningBalance))) {
    return null;
  }
  if (
    candidates.length > 1 &&
    new Date(candidates[0].createdAt).getTime() === new Date(candidates[1].createdAt).getTime() &&
    ["runningBalance", "runningAdvance", "runningInterest"].some(
      (field) => toPaise(candidates[0][field]) !== toPaise(candidates[1][field])
    )
  ) {
    return null;
  }
  return top;
}

export async function buildFarmerStatement({ farmerId, sethId, from, to }) {
  if (!mongoose.isValidObjectId(farmerId)) {
    return { status: 400, body: { error: "Invalid farmer ID" } };
  }

  const range = validateStatementRange(from, to);
  if (range.error) return { status: 400, body: { error: range.error } };

  const farmer = await Farmer.findOne({ _id: farmerId, sethId }).lean();
  if (!farmer) return { status: 404, body: { error: "Farmer not found" } };

  const tenantFilter = { farmerId: farmer._id, sethId };
  const periodFilter = { ...tenantFilter, createdAt: { $gte: range.start, $lt: range.exclusiveEnd } };

  const [deliveries, transactions, settlements, accruals] = await Promise.all([
    WeightEntry.find(periodFilter).sort({ createdAt: 1, _id: 1 }).lean(),
    Transaction.find(periodFilter).sort({ createdAt: 1, _id: 1 }).lean(),
    Settlement.find(periodFilter).sort({ createdAt: 1, _id: 1 }).lean(),
    InterestAccrual.find(periodFilter).sort({ createdAt: 1, _id: 1 }).lean(),
  ]);

  const normalizedDeliveries = deliveries.map((item) => ({
    id: String(item._id),
    date: item.createdAt,
    crop: item.cropType,
    bags: item.totalBags,
    bagWeights: Array.isArray(item.bagWeights) ? item.bagWeights.map(roundMoney) : [],
    totalWeight: roundMoney(item.totalWeight),
    kardaWeight: roundMoney(item.kardaWeight || 0),
    netWeight: roundMoney(item.netWeight ?? item.totalWeight),
    ratePerKg: roundMoney(item.ratePerKg),
    grossAmount: roundMoney(item.totalAmount),
    palledariAmount: roundMoney(item.palledariAmount || 0),
    netAmount: roundMoney(item.netAmount ?? item.totalAmount),
    status: item.status,
  }));

  const normalizedTransactions = transactions.map((item) => ({
    id: String(item._id),
    date: item.createdAt,
    type: item.type,
    amount: ["bag_issue", "bag_return"].includes(item.type) ? null : roundMoney(item.amount),
    bags: item.bags,
    interestRecovered: item.interestRecovered == null ? null : roundMoney(item.interestRecovered),
    principalRecovered: item.principalRecovered == null ? null : roundMoney(item.principalRecovered),
    jamaAdded: item.jamaAdded == null ? null : roundMoney(item.jamaAdded),
    paymentMode: item.paymentMode,
    paidBy: item.paidBy,
    notes: item.notes,
  }));

  const normalizedSettlements = settlements.map((item) => ({
    id: String(item._id),
    date: item.createdAt,
    weightEntryId: item.weightEntryId ? String(item.weightEntryId) : null,
    cropAmount: roundMoney(item.cropAmount),
    jamaRecovered: roundMoney(item.jamaRecovered),
    principalRecovered: roundMoney(item.advanceRecovered),
    interestRecovered: roundMoney(item.interestRecovered),
    chhootAmount: roundMoney(item.chhootAmount),
    finalAmount: roundMoney(item.finalAmount),
    paymentMethod: item.paymentMethod,
    paidBy: item.paidBy,
    status: item.status,
  }));

  const normalizedAccruals = accruals.map((item) => ({
    id: String(item._id),
    date: item.createdAt,
    principalAmount: roundMoney(item.principalAmount),
    monthlyRate: roundMoney(item.ratePerMonth),
    days: item.days,
    fromDate: item.fromDate,
    toDate: item.toDate,
    interestAmount: roundMoney(item.amount),
  }));

  const snapshot = await latestRunningSnapshot(farmer._id, sethId, range.start);
  let opening = null;

  if (snapshot) {
    const openingAccruals = await InterestAccrual.find({
      ...tenantFilter,
      createdAt: { $gt: snapshot.createdAt, $lt: range.start },
    }).sort({ createdAt: 1, _id: 1 }).lean();

    opening = {
      status: "available",
      jama: roundMoney(snapshot.runningBalance ?? 0),
      principal: roundMoney(snapshot.runningAdvance ?? 0),
      interest: roundMoney(
        fromPaise(
          openingAccruals.reduce((sum, item) => sum + toPaise(item.amount), toPaise(snapshot.runningInterest ?? 0))
        )
      ),
    };
  } else {
    // Check if there are any pre-period records at all
    const [priorTxns, priorSettlements, priorAccruals] = await Promise.all([
      Transaction.find({ ...tenantFilter, createdAt: { $lt: range.start } }).sort({ createdAt: 1, _id: 1 }).lean(),
      Settlement.find({ ...tenantFilter, createdAt: { $lt: range.start } }).sort({ createdAt: 1, _id: 1 }).lean(),
      InterestAccrual.find({ ...tenantFilter, createdAt: { $lt: range.start } }).sort({ createdAt: 1, _id: 1 }).lean(),
    ]);

    if (priorTxns.length === 0 && priorSettlements.length === 0 && priorAccruals.length === 0) {
      // Genesis: farmer had zero activity prior to range.start.
      // Balances are reliably zero.
      opening = {
        status: "available",
        jama: 0,
        principal: 0,
        interest: 0,
      };
    } else {
      // Prior records exist without a pre-computed running snapshot.
      // Reconstruct authoritatively from genesis (0) up to range.start.
      const priorRecon = reconcileStatementLedger({
        opening: { status: "available", jama: 0, principal: 0, interest: 0 },
        transactions: priorTxns,
        settlements: priorSettlements,
        accruals: priorAccruals,
      });

      if (priorRecon.closing.status === "available") {
        opening = {
          status: "available",
          jama: roundMoney(priorRecon.closing.jama),
          principal: roundMoney(priorRecon.closing.principal),
          interest: roundMoney(priorRecon.closing.interest),
        };
      } else {
        opening = {
          status: "unavailable",
          jama: null,
          principal: null,
          interest: null,
        };
      }
    }
  }

  let closing = {
    status: "unavailable",
    jama: null,
    principal: null,
    interest: null,
  };
  const reconciliation = reconcileStatementLedger({
    opening,
    transactions,
    settlements,
    accruals,
  });
  closing = reconciliation.closing;
  if (reconciliation.depositAllocations) {
    for (const transaction of normalizedTransactions) {
      if (transaction.type !== "deposit") continue;
      const allocation = reconciliation.depositAllocations[transaction.id];
      if (allocation) Object.assign(transaction, allocation);
    }
  }

  const totalNetDelivery = normalizedDeliveries.reduce((sum, item) => sum + toPaise(item.netAmount), 0);
  const totalGrossDelivery = normalizedDeliveries.reduce((sum, item) => sum + toPaise(item.grossAmount), 0);
  const deliveryStatuses = ["approved", "pending", "held"].reduce((result, status) => {
    const records = normalizedDeliveries.filter((item) => item.status === status);
    result[status] = {
      count: records.length,
      netValue: fromPaise(records.reduce((sum, item) => sum + toPaise(item.netAmount), 0)),
    };
    return result;
  }, {});
  const payments = normalizedTransactions.filter((item) => item.type === "payment");
  const totalPayments = payments.reduce((sum, item) => sum + toPaise(item.amount), 0);
  const totalAdvances = normalizedTransactions.filter((item) => item.type === "advance").reduce((sum, item) => sum + toPaise(item.amount), 0);
  const totalDeposits = normalizedTransactions.filter((item) => item.type === "deposit").reduce((sum, item) => sum + toPaise(item.amount), 0);
  const totalPettyCash = normalizedTransactions.filter((item) => item.type === "petty_cash").reduce((sum, item) => sum + toPaise(item.amount), 0);
  const completedSettlements = normalizedSettlements.filter((item) => item.status === "completed");
  const jamaSettlements = completedSettlements.filter((item) => String(item.paymentMethod).toLowerCase() === "jama");
  const payoutSettlements = completedSettlements.filter((item) => String(item.paymentMethod).toLowerCase() !== "jama");
  const totalSettlementPayouts = payoutSettlements.reduce((sum, item) => sum + toPaise(item.finalAmount), 0);
  const totalJamaSettlementCredits = jamaSettlements.reduce((sum, item) => sum + toPaise(item.finalAmount), 0);
  const totalSettlementCropValue = completedSettlements.reduce((sum, item) => sum + toPaise(item.cropAmount), 0);
  const totalJamaRecovered = completedSettlements.reduce((sum, item) => sum + toPaise(item.jamaRecovered), 0);
  const totalPrincipalRecovered = completedSettlements.reduce((sum, item) => sum + toPaise(item.principalRecovered), 0);
  const totalInterestRecovered = completedSettlements.reduce((sum, item) => sum + toPaise(item.interestRecovered), 0);
  const totalInterestGenerated = normalizedAccruals.reduce((sum, item) => sum + toPaise(item.interestAmount), 0);

  const reconciliationWarnings = [];
  if (opening.status === "unavailable") {
    reconciliationWarnings.push("Opening Jama, principal and interest balances are unavailable because no reliable pre-period running snapshot could be found.");
  }
  if (closing.status === "unavailable") {
    reconciliationWarnings.push("Closing balances are unavailable until opening balances can be established reliably.");
  }
  if (reconciliation.snapshotMismatches > 0) {
    reconciliationWarnings.push(`${reconciliation.snapshotMismatches} stored running-balance snapshot(s) did not match the ordered ledger reconstruction. Review the source ledger before relying on closing balances.`);
  }

  const balance = closing.status === "available" ? closing.jama : null;
  let balancePosition = "unavailable";
  if (balance !== null) {
    if (balance > 0) balancePosition = "seth_owes_farmer";
    else if (balance < 0) balancePosition = "farmer_owes_seth";
    else balancePosition = "no_net_jama_due";
  }

  const depositInterestRecovered = reconciliation.depositInterestRecovered != null
    ? reconciliation.depositInterestRecovered
    : roundMoney(fromPaise(normalizedTransactions.filter((item) => item.type === "deposit").reduce((sum, item) => sum + toPaise(item.interestRecovered || 0), 0)));
  const depositPrincipalRecovered = reconciliation.depositPrincipalRecovered != null
    ? reconciliation.depositPrincipalRecovered
    : roundMoney(fromPaise(normalizedTransactions.filter((item) => item.type === "deposit").reduce((sum, item) => sum + toPaise(item.principalRecovered || 0), 0)));
  const depositJamaAdded = reconciliation.depositJamaAdded != null
    ? reconciliation.depositJamaAdded
    : roundMoney(fromPaise(normalizedTransactions.filter((item) => item.type === "deposit").reduce((sum, item) => sum + toPaise(item.jamaAdded || 0), 0)));

  return {
    status: 200,
    body: {
      farmer: {
        id: String(farmer._id),
        name: farmer.name,
        fatherName: farmer.fatherName || "",
        phone: farmer.phone || "",
        village: farmer.village || "",
        address: farmer.fullAddress || "",
      },
      period: { from, to, inclusive: true },
      generatedAt: new Date().toISOString(),
      openingBalance: opening,
      closingBalance: closing,
      balancePosition,
      summary: {
        totalNetDeliveryValue: fromPaise(totalNetDelivery),
        totalGrossDeliveryValue: fromPaise(totalGrossDelivery),
        deliveryStatuses,
        totalPayments: fromPaise(totalPayments),
        totalAdvances: fromPaise(totalAdvances),
        totalDeposits: fromPaise(totalDeposits),
        totalPettyCash: fromPaise(totalPettyCash),
        totalInterestGenerated: fromPaise(totalInterestGenerated),
        totalInterestRecovered: roundMoney(fromPaise(totalInterestRecovered) + depositInterestRecovered),
        totalPrincipalRecovered: roundMoney(fromPaise(totalPrincipalRecovered) + depositPrincipalRecovered),
        totalJamaRecovered: fromPaise(totalJamaRecovered),
        totalSettlementPayouts: fromPaise(totalSettlementPayouts),
        totalJamaSettlementCredits: fromPaise(totalJamaSettlementCredits),
        totalSettlementOutcome: fromPaise(totalSettlementPayouts + totalJamaSettlementCredits),
        totalSettlementCropValue: fromPaise(totalSettlementCropValue),
        completedSettlements: completedSettlements.length,
        depositInterestRecovered,
        depositPrincipalRecovered,
        depositJamaAdded,
      },
      deliveries: normalizedDeliveries,
      payments,
      transactions: normalizedTransactions.filter((item) => item.type !== "payment"),
      interest: normalizedAccruals,
      settlements: normalizedSettlements,
      counts: {
        deliveries: normalizedDeliveries.length,
        payments: payments.length,
        transactions: normalizedTransactions.filter((item) => item.type !== "payment").length,
        interest: normalizedAccruals.length,
        settlements: normalizedSettlements.length,
      },
      reconciliationWarnings,
      metadata: {
        deliveryValueField: "netAmount with fallback to totalAmount",
        dateTimeZone: "Asia/Kolkata",
        jamaConvention: "Positive Jama balance means Seth owes the farmer. Negative Jama balance means the farmer owes the Seth.",
        readOnly: true,
      },
    },
  };
}
