import mongoose from "mongoose";

async function run() {
  await mongoose.connect('mongodb+srv://jwtauth:VsPTU6TvUqqre-9@jwt-auth.pshjgfq.mongodb.net/rular-legder');
  
  // load models manually or via app
  const db = mongoose.connection.db;
  
  const expenses = await db.collection('expenses').aggregate([
    { $group: { 
        _id: null, 
        totalExpenses: { $sum: { $cond: [{ $ne: ["$type", "direct_purchase"] }, "$amount", 0] } },
        directBuySpend: { $sum: { $cond: [{ $eq: ["$type", "direct_purchase"] }, "$amount", 0] } },
        directBuyVolume: { $sum: { $cond: [{ $eq: ["$type", "direct_purchase"] }, "$weight", 0] } }
      }
    }
  ]).toArray();

  const weights = await db.collection('weightentries').aggregate([
    { $group: { _id: null, volumeTraded: { $sum: "$totalWeight" }, totalSpend: { $sum: "$netAmount" } } }
  ]).toArray();

  const weightTotalsAgg = await db.collection('weightentries').aggregate([
    { $group: { _id: "$cropType", bought: { $sum: "$totalWeight" } } }
  ]).toArray();

  const expenseCropAgg = await db.collection('expenses').aggregate([
    { $match: { type: "direct_purchase" } },
    { $group: { _id: "$cropType", bought: { $sum: "$weight" } } }
  ]).toArray();

  const dispatchCropAgg = await db.collection('b2bdispatches').aggregate([
    { $unwind: "$items" },
    { $group: { _id: "$items.cropType", sold: { $sum: "$items.weightKg" } } }
  ]).toArray();

  console.log("Expense Agg:", expenses);
  console.log("Weight Agg:", weights);
  console.log("Weight Totals:", weightTotalsAgg);
  console.log("Expense Crop Agg (Direct Purchase Volume):", expenseCropAgg);
  console.log("Dispatch Agg (Sold):", dispatchCropAgg);

  let inventoryValue = 0;
  ['wheat', 'maize', 'rice', 'soybean'].forEach(crop => {
    const b = weightTotalsAgg.find(w => w._id === crop)?.bought || 0;
    const dbVal = expenseCropAgg.find(e => e._id === crop)?.bought || 0;
    const s = dispatchCropAgg.find(d => d._id === crop)?.sold || 0;
    const totalBought = b + dbVal;
    
    // Assume flat rate of 30 for this test log
    inventoryValue += (totalBought - s) * 30;
  });

  console.log("Calculated Inventory Value (at flat 30 Rs/kg):", inventoryValue);
  
  process.exit(0);
}

run();
