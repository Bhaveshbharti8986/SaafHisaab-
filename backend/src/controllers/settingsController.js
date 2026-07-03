import Settings from "../models/Settings.js";

async function getSettingsDoc(sethId) {
  let settings = await Settings.findOne({ sethId });
  if (!settings) {
    settings = await Settings.create({ sethId });
  }
  return settings;
}

export const getSettings = async (req, res) => {
  const settings = await getSettingsDoc(req.sethId);
  res.json(settings);
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await getSettingsDoc(req.sethId);
    
    const fields = [
      "kardaPerBagKg", "labourPerBagCash", "shrinkagePercent",
      "ownerName", "email", "phone", "businessName", "gstNumber",
      "address", "village"
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if ((field === "kardaPerBagKg" || field === "labourPerBagCash" || field === "shrinkagePercent") && req.body[field] < 0) {
          throw new Error(`${field} cannot be negative`);
        }
        settings[field] = req.body[field];
      }
    });
    
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
