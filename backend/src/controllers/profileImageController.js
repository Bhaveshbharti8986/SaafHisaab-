import { createHash } from "crypto";
import config from "../Config/Congig.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";

const PROFILE_IMAGE_FOLDER = "saafhisaab/profiles";

function matchesImageSignature(buffer, mimetype) {
  if (mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimetype === "image/webp") {
    return buffer.length >= 12
      && buffer.toString("ascii", 0, 4) === "RIFF"
      && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export const uploadProfileImage = async (req, res) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = config;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(503).json({ error: "Profile image uploads are not configured on the server" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Choose a JPG, PNG, or WebP image to upload" });
  }
  if (!matchesImageSignature(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({ error: "The uploaded file content does not match a supported image format" });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = req.user._id.toString();
  const signatureParams = {
    folder: PROFILE_IMAGE_FOLDER,
    overwrite: "true",
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const signatureString = Object.keys(signatureParams)
    .sort()
    .map((key) => `${key}=${signatureParams[key]}`)
    .join("&");
  const signature = createHash("sha1")
    .update(`${signatureString}${CLOUDINARY_API_SECRET}`)
    .digest("hex");

  const formData = new FormData();
  formData.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", PROFILE_IMAGE_FOLDER);
  formData.append("overwrite", "true");
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  try {
    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`,
      { method: "POST", body: formData, signal: AbortSignal.timeout(30_000) },
    );
    const cloudinaryData = await cloudinaryResponse.json();
    if (!cloudinaryResponse.ok || !cloudinaryData.secure_url) {
      console.error("Cloudinary profile image upload failed:", cloudinaryData.error?.message || cloudinaryResponse.statusText);
      return res.status(502).json({ error: "Profile image upload failed" });
    }

    if (req.user.role === "seth") {
      await Settings.findOneAndUpdate(
        { sethId: req.user._id.toString() },
        { $set: { profileImageUrl: cloudinaryData.secure_url } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } else {
      await User.findByIdAndUpdate(req.user._id, { $set: { profileImageUrl: cloudinaryData.secure_url } });
    }

    return res.json({ profileImageUrl: cloudinaryData.secure_url });
  } catch (error) {
    console.error("Profile image upload error:", error);
    return res.status(502).json({ error: "Could not save the profile image. Please try again." });
  }
};
