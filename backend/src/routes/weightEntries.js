import { Router } from "express";
import { authorize } from "../middleware/authMiddleware.js";
import {
  getWeightEntries,
  createWeightEntry,
  getWeightEntryById,
  updateWeightEntry,
  approveWeightEntry,
  holdWeightEntry
} from "../controllers/weightEntriesController.js";

const router = Router();

router.get("/weight-entries", getWeightEntries);
router.post("/weight-entries", createWeightEntry);
router.get("/weight-entries/:id", getWeightEntryById);
router.patch("/weight-entries/:id", authorize("seth", "munsi"), updateWeightEntry);
router.post("/weight-entries/:id/approve", authorize("seth", "munsi"), approveWeightEntry);
router.post("/weight-entries/:id/hold", authorize("seth", "munsi"), holdWeightEntry);

export default router;
