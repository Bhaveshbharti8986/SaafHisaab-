import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let server;
let buildFarmerStatementPdf;

before(async () => {
  server = await createServer({
    configFile: "./vite.config.js",
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  ({ buildFarmerStatementPdf } = await server.ssrLoadModule("/src/components/reports/FarmerReportPreview.jsx"));
});

after(async () => {
  await server?.close();
});

function fixture(deliveryCount = 0) {
  const deliveries = Array.from({ length: deliveryCount }, (_, index) => ({
    id: `delivery-${index}`,
    date: "2026-04-02T10:00:00.000Z",
    crop: "wheat",
    bags: 2,
    bagWeights: [48.5, 51.5],
    totalWeight: 100,
    kardaWeight: 1,
    netWeight: 99,
    ratePerKg: 20,
    grossAmount: 1980,
    palledariAmount: 10,
    netAmount: 1970,
    status: "approved",
  }));
  return {
    farmer: { name: "PDF Fixture Farmer", phone: "", fatherName: "", village: "", address: "" },
    period: { from: "2026-04-01", to: "2026-04-30" },
    generatedAt: "2026-05-01T10:00:00.000Z",
    openingBalance: { jama: 0, principal: 0, interest: 0 },
    closingBalance: { jama: 0, principal: 0, interest: 0 },
    balancePosition: "no_net_jama_due",
    summary: {
      totalNetDeliveryValue: deliveries.length * 1970,
      totalGrossDeliveryValue: deliveries.length * 1980,
      totalSettlementCropValue: 1970,
      completedSettlements: 1,
      totalPayments: 250,
      totalAdvances: 1000,
      totalDeposits: 500,
      totalInterestGenerated: 12,
      totalInterestRecovered: 20,
      totalPrincipalRecovered: 300,
      totalJamaRecovered: 50,
      totalSettlementPayouts: 1600,
      totalJamaSettlementCredits: 0,
      deliveryStatuses: {
        approved: { count: deliveries.length, netValue: deliveries.length * 1970 },
        pending: { count: 0, netValue: 0 },
        held: { count: 0, netValue: 0 },
      },
    },
    deliveries,
    payments: [{ id: "payment-1", date: "2026-04-03T10:00:00.000Z", amount: 250, paymentMode: "UPI", paidBy: "seth", notes: "Payment note" }],
    transactions: [{ id: "deposit-1", date: "2026-04-04T10:00:00.000Z", type: "deposit", amount: 500, bags: null, interestRecovered: 20, principalRecovered: 300, jamaAdded: 180, paymentMode: "Cash", paidBy: "munsi", notes: "Deposit note" }],
    interest: [{ id: "interest-1", fromDate: "2026-04-01T10:00:00.000Z", toDate: "2026-04-02T10:00:00.000Z", days: 1, principalAmount: 1000, monthlyRate: 2, interestAmount: 12 }],
    settlements: [{ id: "settlement-1", date: "2026-04-05T10:00:00.000Z", weightEntryId: "linked-delivery-1", cropAmount: 1970, jamaRecovered: 50, principalRecovered: 0, interestRecovered: 0, chhootAmount: 10, finalAmount: 1600, paymentMethod: "Cash", paidBy: "seth", status: "completed" }],
    reconciliationWarnings: [],
  };
}

test("builds an automatically paginated PDF for a large delivery ledger", async () => {
  const doc = await buildFarmerStatementPdf(fixture(160), {
    deliveryDetail: "all",
    payments: true,
    transactions: true,
    interest: true,
    settlements: true,
  });
  assert.ok(doc.getNumberOfPages() > 1);
  assert.ok(doc.output("arraybuffer").byteLength > 20_000);
  // Verify individual bori weights are included clearly inside the delivery records table
  assert.ok(doc.output().includes("48.5kg") || doc.output().includes("48.5"));
  assert.ok(doc.output().includes("Bori Weights"));
  for (const section of ["Activity in this period", "Delivery records", "Payments", "Other transactions", "Interest history", "Settlements"]) {
    assert.ok(doc.output().includes(section), `PDF should include ${section}`);
  }
});

test("keeps the summary in the PDF when every optional detail section is disabled", async () => {
  const doc = await buildFarmerStatementPdf(fixture(), {
    deliveryDetail: "hide",
    payments: false,
    transactions: false,
    interest: false,
    settlements: false,
  });
  assert.ok(doc.getNumberOfPages() >= 1);
  assert.ok(doc.output().includes("Farmer Account Statement"));
  assert.ok(doc.output().includes("Balances"));
  assert.ok(doc.output().includes("Activity in this period"));
  // Detail sections should not be present
  assert.ok(!doc.output().includes("Delivery records"));
  assert.ok(!doc.output().includes("Other transactions"));
});

test("supports deliveryDetail='summary' and deliveryDetail='recent5'", async () => {
  // Test summary option
  const docSummary = await buildFarmerStatementPdf(fixture(10), {
    deliveryDetail: "summary",
    payments: true,
    transactions: true,
    interest: true,
    settlements: true,
  });
  assert.ok(docSummary.output().includes("Delivery summary"));
  assert.ok(!docSummary.output().includes("Individual bag weights"));

  // Test recent5 option
  const docRecent = await buildFarmerStatementPdf(fixture(10), {
    deliveryDetail: "recent5",
    payments: true,
    transactions: true,
    interest: true,
    settlements: true,
  });
  assert.ok(docRecent.output().includes("Delivery records"));
});

test("renders plain-language balance position correctly in PDF", async () => {
  const f = fixture();
  
  // Test Seth owes farmer
  f.balancePosition = "seth_owes_farmer";
  const docSethOwes = await buildFarmerStatementPdf(f, { deliveryDetail: "hide" });
  assert.ok(docSethOwes.output().includes("Seth owes the farmer"));

  // Test Farmer owes Seth
  f.balancePosition = "farmer_owes_seth";
  const docFarmerOwes = await buildFarmerStatementPdf(f, { deliveryDetail: "hide" });
  assert.ok(docFarmerOwes.output().includes("Farmer owes the Seth"));

  // Test No net Jama due
  f.balancePosition = "no_net_jama_due";
  const docNoDue = await buildFarmerStatementPdf(f, { deliveryDetail: "hide" });
  assert.ok(docNoDue.output().includes("No net Jama due"));
});
