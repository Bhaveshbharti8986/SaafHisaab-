export function formatINR(amount) {
  if (amount == null) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatWeight(kg) {
  if (kg == null) return "0 kg";
  if (kg >= 100) return `${(kg / 100).toFixed(2)} Qtl`;
  return `${Number(kg.toFixed(2))} kg`;
}

export function today() {
  return new Date().toISOString().split("T")[0];
}
