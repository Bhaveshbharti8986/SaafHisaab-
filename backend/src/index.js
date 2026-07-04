import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import farmersRouter from "./routes/farmers.js";
import weightEntriesRouter from "./routes/weightEntries.js";
import transactionsRouter from "./routes/transactions.js";
import settlementsRouter from "./routes/settlements.js";
import b2bRouter from "./routes/b2b.js";
import godownRouter from "./routes/godown.js";
import ratesRouter from "./routes/rates.js";
import expensesRouter from "./routes/expenses.js";
import dashboardRouter from "./routes/dashboard.js";
import settingsRouter from "./routes/settings.js";
import fundTransfersRouter from "./routes/fundTransfers.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes2.js";
import { protect, authorize } from "./middleware/authMiddleware.js";
import morgan from "morgan";
import config from "./Config/Congig.js";
import connectMongo from "./Config/databasse.js";
import cookieParser from "cookie-parser";
const app = express();
const PORT = config.PORT || 8080;

app.use(cors(
  {
    origin: config.FRONTEND_URL,
    credentials: true
  }
)
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());
app.get("/api/healthz", (_req, res) => {
  const state = mongoose.connection.readyState;
  res.json({ ok: state === 1, mongoState: state });
});

app.use("/api/auth", authRoutes);

// Protect all following /api routes

// Global path-based role firewall
app.use("/api/users", protect, authorize("seth"));
app.use("/api/b2b", protect, authorize("seth"));
app.use("/api/transactions", protect, authorize("seth", "munsi"));
app.use("/api/settlements", protect, authorize("seth", "munsi"));
app.use("/api/expenses", protect, authorize("seth", "munsi"));
app.use("/api/fund-transfers", protect, authorize("seth", "munsi"));
app.use("/api/settings", protect, authorize("seth", "munsi"));
app.use("/api/godown", protect, authorize("seth", "munsi"));

app.use("/api", protect, farmersRouter);
app.use("/api", weightEntriesRouter);
app.use("/api", protect, transactionsRouter);
app.use("/api", protect, settlementsRouter);
app.use("/api", protect, b2bRouter);
app.use("/api", protect, godownRouter);
app.use("/api", protect, ratesRouter);
app.use("/api", protect, expensesRouter);
app.use("/api", protect, dashboardRouter);
app.use("/api", protect, settingsRouter);
app.use("/api", protect, fundTransfersRouter);
app.use("/api/users", protect, userRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === "VersionError") {
    return res
      .status(409)
      .json({
        error:
          "Conflict: This record was modified by another transaction. Please try again.",
      });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format or data type" });
  }
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`AgriSeth API running on port ${PORT}`);
  connectMongo();
});
