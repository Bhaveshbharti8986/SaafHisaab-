import test from "node:test";
import assert from "node:assert/strict";
import Farmer from "../src/models/Farmer.js";
import WeightEntry from "../src/models/WeightEntry.js";
import Transaction from "../src/models/Transaction.js";
import Settlement from "../src/models/Settlement.js";
import InterestAccrual from "../src/models/InterestAccrual.js";
import {
  buildFarmerStatement,
  reconcileStatementLedger,
  validateStatementRange,
} from "../src/services/farmerStatementService.js";

test("validates inclusive local date range and creates next-day exclusive boundary", () => {
  const result = validateStatementRange("2026-04-01", "2026-04-30");
  assert.equal(result.error, undefined);
  assert.equal(result.start.toISOString(), "2026-03-31T18:30:00.000Z");
  assert.equal(result.exclusiveEnd.toISOString(), "2026-04-30T18:30:00.000Z");
});

test("rejects malformed, reversed, and excessive ranges", () => {
  assert.match(validateStatementRange("04-01-2026", "2026-04-30").error, /Invalid date/);
  assert.match(validateStatementRange("2026-05-01", "2026-04-30").error, /on or before/);
  assert.match(validateStatementRange("2000-01-01", "2026-11-20").error, /10 years/);
});

test("rejects impossible calendar dates", () => {
  assert.match(validateStatementRange("2026-02-30", "2026-03-01").error, /Invalid date/);
});

test("reconciles separate Jama, principal and interest buckets in deposit order", () => {
  const timestamp = (day) => new Date(`2026-04-${String(day).padStart(2, "0")}T00:00:00Z`);
  const opening = { status: "available", jama: 100, principal: 500, interest: 50 };
  const transactions = [
    { _id: "advance", createdAt: timestamp(2), type: "advance", amount: 40 },
    { _id: "deposit", createdAt: timestamp(4), type: "deposit", amount: 70 },
    { _id: "payment", createdAt: timestamp(5), type: "payment", amount: 20 },
    { _id: "petty", createdAt: timestamp(6), type: "petty_cash", amount: 5 },
  ];
  const accruals = [
    { _id: "interest", createdAt: timestamp(1), amount: 10, principalAmount: 500 },
  ];
  const settlements = [
    {
      _id: "completed",
      createdAt: timestamp(7),
      status: "completed",
      jamaRecovered: 15,
      advanceRecovered: 30,
      interestRecovered: 0,
      finalAmount: 999,
      paymentMethod: "Cash",
    },
    {
      _id: "pending",
      createdAt: timestamp(8),
      status: "pending",
      jamaRecovered: 900,
      advanceRecovered: 900,
      interestRecovered: 900,
      finalAmount: 900,
      paymentMethod: "Jama",
    },
    {
      _id: "jama-outcome",
      createdAt: timestamp(9),
      status: "completed",
      jamaRecovered: 0,
      advanceRecovered: 0,
      interestRecovered: 0,
      finalAmount: 20,
      paymentMethod: "Jama",
    },
  ];

  const result = reconcileStatementLedger({ opening, transactions, settlements, accruals });
  assert.deepEqual(result.closing, {
    status: "available",
    jama: 110,
    principal: 500,
    interest: 0,
  });
  assert.equal(result.depositInterestRecovered, 60);
  assert.equal(result.depositPrincipalRecovered, 10);
  assert.equal(result.depositJamaAdded, 0);
});

test("reconciles more than 100 records without truncation", () => {
  const transactions = Array.from({ length: 150 }, (_, index) => ({
    _id: `payment-${String(index).padStart(3, "0")}`,
    createdAt: new Date(Date.UTC(2026, 3, 1, 0, index)),
    type: "payment",
    amount: 1,
  }));
  const result = reconcileStatementLedger({
    opening: { status: "available", jama: 200, principal: 0, interest: 0 },
    transactions,
    settlements: [],
    accruals: [],
  });
  assert.equal(transactions.length, 150);
  assert.equal(result.closing.jama, 50);
});

test("statement lookup scopes every collection to the farmer and authenticated tenant and is read-only", async () => {
  const farmerId = "65a000000000000000000001";
  const sethId = "tenant-from-auth";
  const farmer = { _id: farmerId, sethId, name: "Fixture Farmer" };
  const original = {
    farmer: Farmer.findOne,
    weight: WeightEntry.find,
    transactionFind: Transaction.find,
    transactionFindOne: Transaction.findOne,
    settlementFind: Settlement.find,
    settlementFindOne: Settlement.findOne,
    interestFind: InterestAccrual.find,
    writes: [Farmer, WeightEntry, Transaction, Settlement, InterestAccrual].map((model) => model.create),
  };
  const filters = [];
  let writeCalls = 0;
  const findQuery = (modelName, result = []) => ({
    sort() { return this; },
    lean() {
      filters.push({ modelName, query: this.query });
      return Promise.resolve(result);
    },
    query: null,
  });
  try {
    Farmer.findOne = (query) => {
      filters.push({ modelName: "Farmer", query });
      return { lean: async () => query.sethId === sethId ? farmer : null };
    };
    for (const model of [Farmer, WeightEntry, Transaction, Settlement, InterestAccrual]) {
      model.create = () => {
        writeCalls += 1;
        throw new Error("Statement generation must not write records");
      };
    }
    for (const [model, modelName] of [
      [WeightEntry, "WeightEntry"],
      [Transaction, "Transaction"],
      [Settlement, "Settlement"],
      [InterestAccrual, "InterestAccrual"],
    ]) {
      model.find = (query) => {
        const q = findQuery(modelName);
        q.query = query;
        return q;
      };
    }
    for (const [model, modelName] of [[Transaction, "Transaction"], [Settlement, "Settlement"]]) {
      model.findOne = (query) => {
        const q = findQuery(`${modelName}.findOne`, null);
        q.query = query;
        return q;
      };
    }

    const result = await buildFarmerStatement({
      farmerId,
      sethId,
      from: "2026-04-01",
      to: "2026-04-30",
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.counts.deliveries, 0);
    assert.equal(result.body.openingBalance.status, "available");
    assert.equal(result.body.openingBalance.jama, 0);
    assert.equal(result.body.openingBalance.principal, 0);
    assert.equal(result.body.openingBalance.interest, 0);
    assert.equal(result.body.closingBalance.status, "available");
    assert.equal(result.body.closingBalance.jama, 0);
    assert.equal(result.body.reconciliationWarnings.length, 0);
    assert.ok(filters.length >= 7);
    const periodQueries = filters.filter(({ query }) => query.createdAt?.$gte);
    assert.equal(periodQueries.length, 4);
    for (const { query } of periodQueries) {
      assert.equal(query.createdAt.$gte.toISOString(), "2026-03-31T18:30:00.000Z");
      assert.equal(query.createdAt.$lt.toISOString(), "2026-04-30T18:30:00.000Z");
    }
    for (const { query } of filters) {
      assert.equal(String(query.farmerId ?? query._id), farmerId);
      assert.equal(query.sethId, sethId);
    }
    const repeated = await buildFarmerStatement({
      farmerId,
      sethId,
      from: "2026-04-01",
      to: "2026-04-30",
    });
    assert.equal(repeated.body.counts.deliveries, 0);
    assert.equal(writeCalls, 0);
    filters.length = 0;
    const foreignTenantResult = await buildFarmerStatement({
      farmerId,
      sethId: "another-tenant",
      from: "2026-04-01",
      to: "2026-04-30",
    });
    assert.equal(foreignTenantResult.status, 404);
    assert.equal(filters.length, 1);
    assert.equal(filters[0].query.sethId, "another-tenant");
    assert.equal(typeof Farmer.create, "function");
  } finally {
    Farmer.findOne = original.farmer;
    WeightEntry.find = original.weight;
    Transaction.find = original.transactionFind;
    Transaction.findOne = original.transactionFindOne;
    Settlement.find = original.settlementFind;
    Settlement.findOne = original.settlementFindOne;
    InterestAccrual.find = original.interestFind;
    [Farmer, WeightEntry, Transaction, Settlement, InterestAccrual].forEach((model, index) => {
      model.create = original.writes[index];
    });
  }
});

test("keeps delivery value and linked settlement crop value as separate metrics", async () => {
  const farmerId = "65a000000000000000000001";
  const sethId = "tenant-from-auth";
  const original = {
    farmer: Farmer.findOne,
    weight: WeightEntry.find,
    transactionFind: Transaction.find,
    transactionFindOne: Transaction.findOne,
    settlementFind: Settlement.find,
    settlementFindOne: Settlement.findOne,
    interestFind: InterestAccrual.find,
  };
  const farmer = { _id: farmerId, sethId, name: "Fixture Farmer" };
  const delivery = {
    _id: "delivery-1",
    createdAt: new Date("2026-04-05T05:00:00Z"),
    cropType: "wheat",
    totalBags: 5,
    totalWeight: 100,
    bagWeights: [48.5, 51.5],
    netWeight: 95,
    ratePerKg: 2,
    totalAmount: 200,
    netAmount: 180,
    status: "approved",
  };
  const settlement = {
    _id: "settlement-1",
    weightEntryId: delivery._id,
    farmerId,
    sethId,
    createdAt: new Date("2026-04-05T05:01:00Z"),
    cropAmount: 180,
    finalAmount: 150,
    jamaRecovered: 10,
    advanceRecovered: 10,
    interestRecovered: 10,
    chhootAmount: 0,
    paymentMethod: "Cash",
    paidBy: "seth",
    status: "completed",
  };
  try {
    Farmer.findOne = () => ({ lean: async () => farmer });
    WeightEntry.find = () => ({
      sort() { return this; },
      lean: async () => [delivery],
    });
    Transaction.find = () => ({
      sort() { return this; },
      lean: async () => [],
    });
    Settlement.find = () => ({
      sort() { return this; },
      lean: async () => [settlement],
    });
    InterestAccrual.find = () => ({
      sort() { return this; },
      lean: async () => [],
    });
    Transaction.findOne = () => ({
      sort() { return this; },
      lean: async () => null,
    });
    Settlement.findOne = () => ({
      sort() { return this; },
      lean: async () => null,
    });

    const result = await buildFarmerStatement({
      farmerId,
      sethId,
      from: "2026-04-01",
      to: "2026-04-30",
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.deliveries[0].id, delivery._id);
    assert.deepEqual(result.body.deliveries[0].bagWeights, [48.5, 51.5]);
    assert.equal(result.body.settlements[0].weightEntryId, delivery._id);
    assert.equal(result.body.summary.totalNetDeliveryValue, 180);
    assert.equal(result.body.summary.totalSettlementCropValue, 180);
    assert.equal(result.body.summary.totalSettlementPayouts, 150);
    assert.equal(result.body.summary.totalSettlementOutcome, 150);
  } finally {
    Farmer.findOne = original.farmer;
    WeightEntry.find = original.weight;
    Transaction.find = original.transactionFind;
    Transaction.findOne = original.transactionFindOne;
    Settlement.find = original.settlementFind;
    Settlement.findOne = original.settlementFindOne;
    InterestAccrual.find = original.interestFind;
  }
});

test("date boundaries correctly include exact start-of-day and end-of-day in IST and exclude outside records", () => {
  const range = validateStatementRange("2026-04-01", "2026-04-30");
  assert.equal(range.error, undefined);
  
  // In IST (UTC+5:30):
  // 2026-04-01 00:00:00.000 IST = 2026-03-31T18:30:00.000Z
  // 2026-04-30 23:59:59.999 IST = 2026-04-30T18:29:59.999Z
  // 2026-05-01 00:00:00.000 IST = 2026-04-30T18:30:00.000Z (exclusive end)
  const exactStart = new Date("2026-03-31T18:30:00.000Z");
  const exactEnd = new Date("2026-04-30T18:29:59.999Z");
  const justBeforeStart = new Date("2026-03-31T18:29:59.999Z");
  const justAfterEnd = new Date("2026-04-30T18:30:00.000Z");

  assert.ok(exactStart >= range.start && exactStart < range.exclusiveEnd, "Exact start of day must be included");
  assert.ok(exactEnd >= range.start && exactEnd < range.exclusiveEnd, "Exact end of day must be included");
  assert.ok(justBeforeStart < range.start, "Just before start must be excluded");
  assert.ok(justAfterEnd >= range.exclusiveEnd, "Just after end must be excluded");
});

test("payment and petty cash reduce Jama, while advance increases loan principal", () => {
  const timestamp = (day) => new Date(`2026-04-${String(day).padStart(2, "0")}T00:00:00Z`);
  const opening = { status: "available", jama: 1000, principal: 2000, interest: 100 };
  const transactions = [
    { _id: "pmt-1", createdAt: timestamp(1), type: "payment", amount: 300 },
    { _id: "petty-1", createdAt: timestamp(2), type: "petty_cash", amount: 150 },
    { _id: "adv-1", createdAt: timestamp(3), type: "advance", amount: 500 },
  ];

  const result = reconcileStatementLedger({
    opening,
    transactions,
    settlements: [],
    accruals: [],
  });

  // Jama: 1000 - 300 - 150 = 550
  // Principal: 2000 + 500 = 2500
  // Interest: 100
  assert.equal(result.closing.jama, 550);
  assert.equal(result.closing.principal, 2500);
  assert.equal(result.closing.interest, 100);
});

test("deposit follows strict recovery order: interest -> principal -> jama remainder", () => {
  const timestamp = (day) => new Date(`2026-04-${String(day).padStart(2, "0")}T00:00:00Z`);
  // Opening: 0 Jama, 300 Principal, 200 Interest
  const opening = { status: "available", jama: 0, principal: 300, interest: 200 };

  // Deposit 1: 100 (partially recovers interest, remaining interest = 100)
  // Deposit 2: 250 (recovers 100 interest + 150 principal, remaining principal = 150)
  // Deposit 3: 300 (recovers 150 principal + 150 added to Jama)
  const transactions = [
    { _id: "dep-1", createdAt: timestamp(1), type: "deposit", amount: 100 },
    { _id: "dep-2", createdAt: timestamp(2), type: "deposit", amount: 250 },
    { _id: "dep-3", createdAt: timestamp(3), type: "deposit", amount: 300 },
  ];

  const result = reconcileStatementLedger({
    opening,
    transactions,
    settlements: [],
    accruals: [],
  });

  assert.equal(result.closing.interest, 0);
  assert.equal(result.closing.principal, 0);
  assert.equal(result.closing.jama, 150);
  assert.equal(result.depositInterestRecovered, 200);
  assert.equal(result.depositPrincipalRecovered, 300);
  assert.equal(result.depositJamaAdded, 150);

  // Check individual deposit allocations
  assert.deepEqual(result.depositAllocations["dep-1"], {
    interestRecovered: 100,
    principalRecovered: 0,
    jamaAdded: 0,
  });
  assert.deepEqual(result.depositAllocations["dep-2"], {
    interestRecovered: 100,
    principalRecovered: 150,
    jamaAdded: 0,
  });
  assert.deepEqual(result.depositAllocations["dep-3"], {
    interestRecovered: 0,
    principalRecovered: 150,
    jamaAdded: 150,
  });
});

test("settlement with paymentMethod=Jama credits finalAmount to Jama; cash does not", () => {
  const timestamp = (day) => new Date(`2026-04-${String(day).padStart(2, "0")}T00:00:00Z`);
  const opening = { status: "available", jama: 50, principal: 500, interest: 100 };
  const settlements = [
    {
      _id: "settle-cash",
      createdAt: timestamp(1),
      status: "completed",
      jamaRecovered: 20,
      advanceRecovered: 100,
      interestRecovered: 50,
      finalAmount: 1000,
      paymentMethod: "Cash",
    },
    {
      _id: "settle-jama",
      createdAt: timestamp(2),
      status: "completed",
      jamaRecovered: 0,
      advanceRecovered: 0,
      interestRecovered: 0,
      finalAmount: 400,
      paymentMethod: "Jama",
    },
  ];

  const result = reconcileStatementLedger({
    opening,
    transactions: [],
    settlements,
    accruals: [],
  });

  // Jama: 50 + 20 (jamaRecovered) + 400 (finalAmount deposited to Jama) = 470
  // Principal: 500 - 100 = 400
  // Interest: 100 - 50 = 50
  assert.equal(result.closing.jama, 470);
  assert.equal(result.closing.principal, 400);
  assert.equal(result.closing.interest, 50);
});

test("bag_issue and bag_return are quantity movements and do not alter monetary totals", () => {
  const timestamp = (day) => new Date(`2026-04-${String(day).padStart(2, "0")}T00:00:00Z`);
  const opening = { status: "available", jama: 500, principal: 1000, interest: 50 };
  const transactions = [
    { _id: "bag-1", createdAt: timestamp(1), type: "bag_issue", amount: 0, bags: 50 },
    { _id: "bag-2", createdAt: timestamp(2), type: "bag_return", amount: 0, bags: 30 },
  ];

  const result = reconcileStatementLedger({
    opening,
    transactions,
    settlements: [],
    accruals: [],
  });

  assert.equal(result.closing.jama, 500);
  assert.equal(result.closing.principal, 1000);
  assert.equal(result.closing.interest, 50);
});

test("rejects invalid farmerId format with 400", async () => {
  const result = await buildFarmerStatement({
    farmerId: "not-a-valid-id",
    sethId: "any-seth",
    from: "2026-04-01",
    to: "2026-04-30",
  });
  assert.equal(result.status, 400);
  assert.match(result.body.error, /Invalid farmer ID/);
});

test("reconstructs opening balance from previous running snapshot and intervening accruals", async () => {
  const farmerId = "65a000000000000000000002";
  const sethId = "tenant-test";
  const farmer = { _id: farmerId, sethId, name: "Snapshot Farmer", balance: 100, advanceAmount: 200 };
  const original = {
    farmer: Farmer.findOne,
    weight: WeightEntry.find,
    transactionFind: Transaction.find,
    transactionFindOne: Transaction.findOne,
    settlementFind: Settlement.find,
    settlementFindOne: Settlement.findOne,
    interestFind: InterestAccrual.find,
  };

  const priorSnapshot = {
    _id: "prev-txn",
    createdAt: new Date("2026-03-25T10:00:00Z"),
    runningBalance: 300,
    runningAdvance: 700,
    runningInterest: 25,
  };
  const interveningAccrual = {
    _id: "intervening-accrual",
    createdAt: new Date("2026-03-28T10:00:00Z"),
    amount: 15,
  };

  try {
    Farmer.findOne = () => ({ lean: async () => farmer });
    WeightEntry.find = () => ({ sort() { return this; }, lean: async () => [] });
    Transaction.find = () => ({ sort() { return this; }, lean: async () => [] });
    Settlement.find = () => ({ sort() { return this; }, lean: async () => [] });
    Transaction.findOne = () => ({ sort() { return this; }, lean: async () => priorSnapshot });
    Settlement.findOne = () => ({ sort() { return this; }, lean: async () => null });
    InterestAccrual.find = (query) => ({
      sort() { return this; },
      lean: async () => {
        // If searching for intervening accruals between snapshot and start date
        if (query.createdAt?.$gt) {
          return [interveningAccrual];
        }
        return [];
      },
    });

    const result = await buildFarmerStatement({
      farmerId,
      sethId,
      from: "2026-04-01",
      to: "2026-04-30",
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.openingBalance.status, "available");
    assert.equal(result.body.openingBalance.jama, 300);
    assert.equal(result.body.openingBalance.principal, 700);
    // Interest = snapshot interest (25) + intervening accrual (15) = 40
    assert.equal(result.body.openingBalance.interest, 40);
    assert.equal(result.body.closingBalance.status, "available");
    assert.equal(result.body.closingBalance.jama, 300);
    assert.equal(result.body.balancePosition, "seth_owes_farmer");
  } finally {
    Farmer.findOne = original.farmer;
    WeightEntry.find = original.weight;
    Transaction.find = original.transactionFind;
    Transaction.findOne = original.transactionFindOne;
    Settlement.find = original.settlementFind;
    Settlement.findOne = original.settlementFindOne;
    InterestAccrual.find = original.interestFind;
  }
});

test("reconstructs opening balance from genesis when prior events exist without a snapshot", async () => {
  const farmerId = "65a000000000000000000001";
  const sethId = "tenant-from-auth";
  const farmer = { _id: farmerId, sethId, name: "Fixture Farmer" };

  const original = {
    farmer: Farmer.findOne,
    weight: WeightEntry.find,
    transactionFind: Transaction.find,
    transactionFindOne: Transaction.findOne,
    settlementFind: Settlement.find,
    settlementFindOne: Settlement.findOne,
    interestFind: InterestAccrual.find,
  };

  const priorAdvance = {
    _id: "prior-adv",
    farmerId,
    sethId,
    createdAt: new Date("2026-03-10T00:00:00Z"),
    type: "advance",
    amount: 1000,
  };

  const priorDeposit = {
    _id: "prior-dep",
    farmerId,
    sethId,
    createdAt: new Date("2026-03-15T00:00:00Z"),
    type: "deposit",
    amount: 200,
  };

  try {
    Farmer.findOne = () => ({ lean: async () => farmer });
    WeightEntry.find = () => ({ sort() { return this; }, lean: async () => [] });
    // No snapshot available:
    Transaction.findOne = () => ({ sort() { return this; }, lean: async () => null });
    Settlement.findOne = () => ({ sort() { return this; }, lean: async () => null });

    Transaction.find = (query) => ({
      sort() { return this; },
      lean: async () => {
        if (query.createdAt?.$lt && !query.createdAt?.$gte) {
          // Pre-period query only
          return [priorAdvance, priorDeposit];
        }
        return [];
      },
    });

    Settlement.find = () => ({ sort() { return this; }, lean: async () => [] });
    InterestAccrual.find = () => ({ sort() { return this; }, lean: async () => [] });

    const result = await buildFarmerStatement({
      farmerId,
      sethId,
      from: "2026-04-01",
      to: "2026-04-30",
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.openingBalance.status, "available");
    // Prior advance: 1000 principal. Prior deposit: 200 pays down principal to 800.
    assert.equal(result.body.openingBalance.principal, 800);
    assert.equal(result.body.openingBalance.jama, 0);
    assert.equal(result.body.openingBalance.interest, 0);
    assert.equal(result.body.closingBalance.status, "available");
    assert.equal(result.body.closingBalance.principal, 800);
    assert.equal(result.body.reconciliationWarnings.length, 0);
  } finally {
    Farmer.findOne = original.farmer;
    WeightEntry.find = original.weight;
    Transaction.find = original.transactionFind;
    Transaction.findOne = original.transactionFindOne;
    Settlement.find = original.settlementFind;
    Settlement.findOne = original.settlementFindOne;
    InterestAccrual.find = original.interestFind;
  }
});
