import { Router } from "express";
import {
  getSettlements,
  createSettlement,
  getSettlementById
} from "../controllers/settlementsController.js";

const router = Router();

router.get("/settlements", getSettlements);
router.post("/settlements", createSettlement);
router.get("/settlements/:id", getSettlementById);

export default router;
