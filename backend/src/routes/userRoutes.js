import express from "express";
import { registerUser, getUsers, deleteUser } from "../controllers/userController.js";

const router = express.Router();

router.get("/", getUsers);
router.post("/", registerUser);
router.delete("/:id", deleteUser);

export default router;
