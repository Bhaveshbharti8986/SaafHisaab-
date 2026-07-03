import InterestAccrual from "../models/InterestAccrual.js";

export async function accrueInterestForFarmer(farmer) {
  const now = new Date();
  const lastDate = farmer.lastInterestCalculatedDate 
    ? new Date(farmer.lastInterestCalculatedDate) 
    : new Date(farmer.createdAt || now);
  
  const timeDiff = now.getTime() - lastDate.getTime();
  const days = Math.floor(timeDiff / (1000 * 3600 * 24));

  if (days >= 1) {
    if (farmer.chargeInterest && farmer.advanceAmount > 0 && farmer.interestRate > 0) {
      const principal = Number(farmer.advanceAmount);
      const monthlyRate = Number(farmer.interestRate);
      const annualRate = monthlyRate * 12; // convert month rate to year per annum
      
      // Calculate interest on days / 365
      const interest = Math.round(principal * (annualRate / 100) * (days / 365) * 100) / 100;
      
      if (interest > 0) {
        await InterestAccrual.create({
          farmerId: farmer._id,
          sethId: farmer.sethId,
          principalAmount: principal,
          ratePerMonth: monthlyRate,
          days: days,
          amount: interest,
          fromDate: lastDate,
          toDate: now
        });
        
        farmer.accruedInterest = (farmer.accruedInterest || 0) + interest;
      }
    }
    
    // Advance the calculated date by exactly 'days' to preserve leftover hours/minutes
    farmer.lastInterestCalculatedDate = new Date(lastDate.getTime() + days * 24 * 3600 * 1000);
  }
}
