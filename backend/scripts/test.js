

const API = "http://localhost:8080/api";

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
  console.log("Starting exhaustive tests...");
  let passed = 0;
  let failed = 0;

  for (let iter = 1; iter <= 10; iter++) {
    console.log(`\n--- Test Iteration ${iter} ---`);
    try {
      // 1. Create Farmer
      const fRes = await fetch(`${API}/farmers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Test Farmer ${iter}`, phone: "1234567890", village: "Test Village" })
      });
      const farmer = await fRes.json();
      if (!farmer._id) throw new Error("Failed to create farmer");

      // 2. Add an Advance
      const advRes = await fetch(`${API}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: farmer._id,
          type: "advance",
          amount: 5000,
          paymentMode: "Cash",
          chargeInterest: true,
          interestRate: 2
        })
      });
      if (!advRes.ok) throw new Error("Failed to add advance");

      // 3. Add a Delivery
      const delRes = await fetch(`${API}/weight-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: farmer._id,
          cropType: "wheat",
          bagWeights: [50, 50, 50],
          ratePerKg: 20
        })
      });
      const entry = await delRes.json();
      if (!entry._id) throw new Error("Failed to add delivery");
      if (entry.totalAmount !== 3000) throw new Error(`Wrong total amount: ${entry.totalAmount}`);

      // 4. Test Auto-Approve (deposits to Jama)
      const appRes = await fetch(`${API}/weight-entries/${entry._id}/approve`, {
        method: "POST"
      });
      if (!appRes.ok) throw new Error("Auto-Approve failed");

      // Verify farmer balance
      let fData = await (await fetch(`${API}/farmers/${farmer._id}`)).json();
      if (fData.balance !== 3000) throw new Error(`Jama balance should be 3000, got ${fData.balance}`);

      // 5. Add another delivery and test Partial Recovery (Udhar)
      const del2Res = await fetch(`${API}/weight-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: farmer._id,
          cropType: "soybean",
          bagWeights: [100],
          ratePerKg: 40 // total 4000
        })
      });
      const entry2 = await del2Res.json();

      // Labour is 20/qtl. 100kg = 1qtl = 20rs. Net crop = 4000 - 20 = 3980.
      const setRes = await fetch(`${API}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: farmer._id,
          weightEntryId: entry2._id,
          cropAmount: 3980,
          advanceRecovered: 2000, // Recover 2000 from the 5000 loan
          interestRecovered: 0,
          jamaRecovered: 0,
          chhootAmount: 20, // Add 20 extra to make payout round
          recoveryMode: "udhar",
          finalAmount: 3980 - 2000 + 20, // 2000 payout
          paymentMethod: "Cash"
        })
      });
      if (!setRes.ok) throw new Error("Manual Settlement failed");

      // Verify balances
      fData = await (await fetch(`${API}/farmers/${farmer._id}`)).json();
      if (fData.advanceAmount !== 3000) throw new Error(`Advance should be 3000, got ${fData.advanceAmount}`);
      
      // We paid them Cash, so Jama shouldn't increase. Jama was 3000, should still be 3000.
      // Wait, in my route: farmer.balance += (finalAmount + jamaRecovered)
      // So Jama becomes 3000 + 2000 = 5000! Wait, if paymentMethod is Cash, it SHOULD NOT add finalAmount to Jama!
      // This is a bug!
      if (fData.balance !== 3000) {
          throw new Error(`Jama should be 3000, but it became ${fData.balance}. We found a BUG! Cash settlements are increasing Jama!`);
      }

      console.log(`Iteration ${iter} passed.`);
      passed++;
    } catch (e) {
      console.error(`Iteration ${iter} failed:`, e.message);
      failed++;
    }
  }
  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
}

runTests();
