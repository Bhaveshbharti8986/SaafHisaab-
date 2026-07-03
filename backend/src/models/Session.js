import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    revoked: { type: Boolean, default: false },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: "30d" }, // Auto deletes sessions older than 30 days
    },
  },
  { timestamps: true },
);

export default mongoose.model("Session", sessionSchema);
