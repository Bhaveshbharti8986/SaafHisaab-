import { Router } from "express";
import {
  getExpenses,
  createExpense,
  deleteExpense
} from "../controllers/expensesController.js";

const router = Router();

router.get("/expenses", getExpenses);
router.post("/expenses", createExpense);
router.delete("/expenses/:id", deleteExpense);

export default router;
