import { Router } from "express";
import {
  getSettings,
  updateSettings
} from "../controllers/settingsController.js";

const router = Router();

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);

export default router;
