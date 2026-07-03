import { Router } from "express";
import {
  getTransactions,
  createTransaction
} from "../controllers/transactionsController.js";

const router = Router();

router.get("/transactions", getTransactions);
router.post("/transactions", createTransaction);

export default router;
