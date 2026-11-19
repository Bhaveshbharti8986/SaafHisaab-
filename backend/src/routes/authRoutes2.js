import express from "express";
import multer from "multer";
import * as authController from "../controllers/authController2.js";
import { uploadProfileImage } from "../controllers/profileImageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

function handleProfileImageUploadError(error, _req, res, next) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Profile images must be 5 MB or smaller" });
  }
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: "Invalid profile image upload" });
  }
  return next(error);
}

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
router.post("/first-login/pin-otp", authController.sendFirstLoginPinOtp);
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
router.post(
  "/profile/image",
  protect,
  profileImageUpload.single("image"),
  uploadProfileImage,
  handleProfileImageUploadError,
);

// Change password
router.post("/change-pin", protect, authController.changePassword);

// ============================================================================
// LOGOUT ROUTES (Protected)
// ============================================================================

// Logout from current device
router.post("/logout", protect, authController.logout);

// Logout from all devices
router.post("/logout-all", protect, authController.logoutAll);

export default router;