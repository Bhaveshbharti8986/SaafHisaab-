import { Router } from "express";
import { authorize } from "../middleware/authMiddleware.js";
import {
  getSummary,
  getPassbook,
  getAnalytics,
  getPLReport,
  getInterest,
  getInterestDebtors,
  getGodownAnalysis
} from "../controllers/dashboardController.js";

const router = Router();

router.get("/dashboard/summary", authorize("seth", "munsi"), getSummary);
router.get("/dashboard/passbook", authorize("seth", "munsi"), getPassbook);
router.get("/dashboard/analytics", authorize("seth"), getAnalytics);
router.get("/dashboard/pl-report", authorize("seth"), getPLReport);
router.get("/dashboard/interest", authorize("seth"), getInterest);
router.get("/dashboard/interest/debtors", authorize("seth"), getInterestDebtors);
router.get("/dashboard/godown-analysis", authorize("seth", "munsi"), getGodownAnalysis);

export default router;
