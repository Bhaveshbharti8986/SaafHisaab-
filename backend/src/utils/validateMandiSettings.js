const numericSettings = {
  kardaPerBagKg: { label: "Karda deduction" },
  labourPerBagCash: { label: "Labour deduction" },
  shrinkagePercent: { label: "Shrinkage loss", max: 100 },
};

export function validateMandiSettings(values) {
  for (const [field, { label, max }] of Object.entries(numericSettings)) {
    if (values[field] === undefined) continue;

    const rawValue = values[field];
    const value = typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string" && rawValue.trim() !== ""
        ? Number(rawValue)
        : Number.NaN;

    if (!Number.isFinite(value) || value < 0) {
      return `${label} must be a valid non-negative number`;
    }

    if (max !== undefined && value > max) {
      return `${label} cannot exceed ${max}%`;
    }
  }

  return null;
}
