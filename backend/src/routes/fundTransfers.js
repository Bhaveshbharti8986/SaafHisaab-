import { Router } from "express";
import {
  getFundTransfers,
  createFundTransfer
} from "../controllers/fundTransfersController.js";

const router = Router();

router.get("/fund-transfers", getFundTransfers);
router.post("/fund-transfers", createFundTransfer);

export default router;
