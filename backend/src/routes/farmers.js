import { Router } from "express";
import { authorize } from "../middleware/authMiddleware.js";
import {
  getFarmers,
  createFarmer,
  getFarmerById,
  updateFarmer,
  deleteFarmer,
  getFarmerSummary,
  getFarmerTimeline
} from "../controllers/farmersController.js";

const router = Router();

router.get("/farmers", getFarmers);
router.post("/farmers", authorize("seth", "munsi"), createFarmer);
router.get("/farmers/:id", getFarmerById);
router.patch("/farmers/:id", authorize("seth", "munsi"), updateFarmer);
router.delete("/farmers/:id", authorize("seth", "munsi"), deleteFarmer);
router.get("/farmers/:id/summary", authorize("seth", "munsi"), getFarmerSummary);
router.get("/farmers/:id/timeline", authorize("seth", "munsi"), getFarmerTimeline);

export default router;
