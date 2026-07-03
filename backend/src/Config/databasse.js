import mongoose from "mongoose";
import config from "./Congig.js";

async function connectMongo() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.log("Retrying in 10 seconds…");
    setTimeout(connectMongo, 10000);
  }
}

export default connectMongo;
