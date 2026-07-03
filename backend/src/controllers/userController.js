import User from "../models/User.js";
import Session from "../models/Session.js";
import crypto from "crypto";

export const registerUser = async (req, res) => {
  try {
    const { name, mobile, email, role } = req.body;

    if (!name || !mobile || !role) {
      return res.status(400).json({ error: "Name, mobile, and role are required." });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ error: "Mobile number already registered." });
    }

    // Generate complex Employee ID (e.g., EMP-M-2026-A8B9C2D4)
    const year = new Date().getFullYear();
    const rolePrefix = role.charAt(0).toUpperCase(); // M for Munsi, L for Labour
    const randomChars = crypto.randomBytes(4).toString("hex").toUpperCase();
    const employeeId = `EMP-${rolePrefix}-${year}-${randomChars}`;

    const newUser = new User({
      employeeId,
      name,
      mobile,
      email: email || null,
      role,
      addedBy: req.user._id.toString()
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user." });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ addedBy: req.user._id.toString() }).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ _id: id, addedBy: req.user._id.toString() });
    if (!user) {
      return res.status(404).json({ error: "User not found or unauthorized." });
    }

    await User.findOneAndDelete({ _id: id, addedBy: req.user._id.toString() });
    
    await Session.deleteMany({ userId: id });

    res.json({ message: "User permanently deleted and logged out from all devices." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user." });
  }
};
