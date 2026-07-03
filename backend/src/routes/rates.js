import { Router } from "express";
import { authorize } from "../middleware/authMiddleware.js";
import {
  getRates,
  updateRate,
  broadcastRates
} from "../controllers/ratesController.js";

const router = Router();

router.get("/rates", getRates);
router.post("/rates", authorize("seth", "munsi"), updateRate);
router.post("/rates/broadcast", authorize("seth", "munsi"), broadcastRates);

export default router;
