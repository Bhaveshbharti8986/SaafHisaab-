import { Router } from "express";
import {
  getGodownStock,
  adjustStock,
  directPurchase
} from "../controllers/godownController.js";

const router = Router();

router.get("/godown", getGodownStock);
router.post("/godown/adjust", adjustStock);
router.post("/godown/direct-purchase", directPurchase);

export default router;
