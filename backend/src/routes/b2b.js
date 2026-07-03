import { Router } from "express";
import {
  getDispatches,
  createDispatch,
  updateDispatch,
  deleteDispatch
} from "../controllers/b2bController.js";

const router = Router();

router.get("/b2b-dispatches", getDispatches);
router.post("/b2b-dispatches", createDispatch);
router.patch("/b2b-dispatches/:id", updateDispatch);
router.delete("/b2b-dispatches/:id", deleteDispatch);

export default router;
