import express from "express";
import * as authController from "../controllers/authController2.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================================================
// REGISTRATION ROUTES
// ============================================================================

// Send OTP for registration
router.post("/register/phone-otp", authController.sendPhoneOtp);
router.post("/register/email-otp", authController.sendEmailOtp);

// Register Seth (Admin)
router.post("/register", authController.registerSeth);

// ============================================================================
// LOGIN ROUTES
// ============================================================================

// Login (Seth/Munsi/Labour)
router.post("/login", authController.login);
router.post("/set-pin", authController.setPin);
// ============================================================================
// TOKEN MANAGEMENT ROUTES
// ============================================================================

// Refresh access token
router.post("/refresh-token", authController.refreshToken);

// ============================================================================
// FORGOT PASSWORD ROUTES
// ============================================================================

// Send OTP for password reset
router.post("/forgot-password/phone", authController.forgotPasswordSendPhoneOtp);
router.post("/forgot-password/email", authController.forgotPasswordSendEmailOtp);

// Verify OTP for password reset (optional step)
router.post("/forgot-password/verify-otp", authController.verifyForgotPasswordOtp);

// Reset password with OTP
router.post("/reset-password", authController.resetPassword);

// ============================================================================
// PROFILE ROUTES (Protected)
// ============================================================================

// Get user profile
router.get("/profile", protect, authController.getProfile);

// Update user profile
router.patch("/profile", protect, authController.updateProfile);

// Change password
router.post("/change-Pin", protect, authController.changePassword);

// ============================================================================
// LOGOUT ROUTES (Protected)
// ============================================================================

// Logout from current device
router.post("/logout", protect, authController.logout);

// Logout from all devices
router.post("/logout-all", protect, authController.logoutAll);

export default router;