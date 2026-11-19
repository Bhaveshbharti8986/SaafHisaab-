import { Router } from "express";
import {
  getSettings,
  updateSettings
} from "../controllers/settingsController.js";
import { authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/settings", getSettings);
router.patch("/settings", authorize("seth"), updateSettings);

export default router;
