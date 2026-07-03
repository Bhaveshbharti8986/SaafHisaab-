import Settlement from "../models/Settlement.js";

export const updateLatestSettlement = async (farmerId, sethId, interestAmount) => {
  // 1. Sabse recent settlement dhundho
  const settlement = await Settlement.findOne({ farmerId, sethId })
    .sort({ createdAt: -1 });

  if (settlement) {
    // 2. Sirf interestRecovered field ko increment kar do
    settlement.interestRecovered += interestAmount;
    // Running interest bhi update kar do taaki consistency bane rahe
    settlement.runningInterest -= interestAmount; 
    await settlement.save();
  } else {
    console.log("Koi purana settlement nahi mila, skip update.");
  }
};