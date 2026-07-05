import User from "../models/User.js";
import Settings from "../models/Settings.js";
import Session from "../models/Session.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../Config/Congig.js";
import otpModel from "../models/otpModel.js";
import { getOtpHtml } from "../utils/emailotp.js";
import { sendEmail } from "../Service/email.service.js";
import { sendPhoneSms } from "../Service/sms.service.js";
import { getOtpBody } from "../utils/phoneOtp.js";
const JWT_SECRET = config.JWT_SECRET;

// ============================================================================
// REGISTRATION OTP FUNCTIONS
// ============================================================================

/**
 * Send OTP to phone for registration
 * POST /api/auth/register/phone-otp
 */
export const sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Validate phone number format (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number format. Must be 10 digits" });
    }

    // Check if phone already registered
    const existingUser = await User.findOne({ mobile: phone });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number is already registered" });
    }

    // Delete existing OTPs for this phone and purpose
    await otpModel.deleteMany({ 
      mobile: phone, 
      type: "mobile", 
      purpose: "register" 
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    const otpHash = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    await otpModel.create({
      otpHash,
      type: "mobile",
      mobile: phone,
      purpose: "register",
      createdAt: new Date(Date.now()),
    });

 
const otpBody = getOtpBody(otp, "verification OTP", "Use this OTP to complete your registration.");
await sendPhoneSms(phone, "Your OTP verification", otpBody);
    res.json({ 
      message: "OTP sent to your phone for registration",
      demoOtp: otp // Remove this in production
    });
  } catch (error) {
    console.error("Phone OTP Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

/**
 * Send OTP to email for registration
 * POST /api/auth/register/email-otp
 */
export const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Delete existing OTPs for this email and purpose
    await otpModel.deleteMany({ 
      email: email.toLowerCase(), 
      type: "email", 
      purpose: "register" 
    });

    // Generate OTP (in production, use random 6-digit and send via email)
    const otp = Math.floor(100000 + Math.random() * 900000);
     const otpHtml=getOtpHtml(otp);
    const otpHash = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    await otpModel.create({
      otpHash,
      type: "email",
      email: email.toLowerCase(),
      purpose: "register",
      createdAt: new Date(Date.now()),
    });

 
   await sendEmail(email, "Registration OTP", `Your Rular Ledger registration OTP is: ${otp}`,otpHtml);
    res.json({ 
      message: "OTP sent to your email for registration",

    });
  } catch (error) {
    console.error("Email OTP Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// ============================================================================
// REGISTRATION FUNCTION
// ============================================================================

/**
 * Register Seth (Admin) with phone and email OTP verification
 * POST /api/auth/register
 */
export const registerSeth = async (req, res) => {
  try {
    const {
      ownerName,
      phone,
      phoneotp,
      email,
      emailotp,
      businessName,
      gstNumber,
      address,
      village,
      password,
    } = req.body;

    // Validate required fields
    if (!ownerName || !phone || !businessName || !password || !phoneotp || !emailotp) {
      return res.status(400).json({
        error: "Owner Name, Phone, Phone OTP, Email OTP, Business Name, and Password are required",
      });
    }

    // Additional validations
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ mobile: phone }, { email: email?.toLowerCase() }],
    });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number or email is already registered" });
    }

    // Verify phone OTP
    const phoneotpHash = crypto
      .createHash("sha256")
      .update(String(phoneotp))
      .digest("hex");

    const phoneotpData = await otpModel.findOne({
      mobile: phone,
      otpHash: phoneotpHash,
      purpose: "register",
      type: "mobile",
    });

    if (!phoneotpData) {
      return res.status(400).json({ error: "Invalid phone OTP" });
    }

    // Verify email OTP
    const emailotpHash = crypto
      .createHash("sha256")
      .update(String(emailotp))
      .digest("hex");

    const emailotpData = await otpModel.findOne({
      email: email?.toLowerCase(),
      otpHash: emailotpHash,
      purpose: "register",
      type: "email",
    });

    if (!emailotpData) {
      return res.status(400).json({ error: "Invalid email OTP" });
    }

    // Check OTP expiry (10 minutes)
    const phoneExpiryTime = phoneotpData.createdAt.getTime() + 10 * 60 * 1000;
    if (phoneExpiryTime < Date.now()) {
      return res.status(400).json({ error: "Phone OTP has expired" });
    }

    const emailExpiryTime = emailotpData.createdAt.getTime() + 10 * 60 * 1000;
    if (emailExpiryTime < Date.now()) {
      return res.status(400).json({ error: "Email OTP has expired" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Seth user
    const seth = await User.create({
      name: ownerName,
      mobile: phone,
      email: email?.toLowerCase() || null,
      password: hashedPassword,
      role: "seth",
      status: "active",
    });

    // Create Settings
    await Settings.create({
      sethId: seth._id.toString(),
      ownerName,
      email: email || "",
      phone,
      businessName,
      gstNumber: gstNumber || "",
      address: address || "",
      village: village || "",
    });

    // Create GodownStock
    const GodownStock = (await import("../models/GodownStock.js")).default;
    await GodownStock.create({
      sethId: seth._id.toString(),
    });

    // Generate tokens
    const refreshToken = jwt.sign({ id: seth._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const session = await Session.create({ 
      userId: seth._id.toString(), 
      refreshTokenHash: refreshTokenHash 
    });

    const accessToken = jwt.sign(
      {
        id: seth._id,
        role: "seth", // ✅ Added role to JWT payload
        sessionId: session._id,
      },
      JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Clean up OTPs
    await otpModel.deleteMany({ $or: [{ mobile: phone }, { email }] });

    res.status(201).json({
      status: "success",
      message: "Mandi registered successfully!",
      user: { id: seth._id, name: seth.name, role: seth.role },
      accessToken,
    });
  } catch (error) {
    console.error("Seth Registration Error:", error);
    res.status(500).json({ error: error.message || "Failed to register Mandi" });
  }
};

// ============================================================================
// LOGIN FUNCTION
// ============================================================================

/**
 * Login user (Seth/Munsi/Labour)
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { employeeId, pin , role} = req.body;

    if ( !employeeId  ) {
      return res.status(400).json({ error: role==="seth" ? "Email/Mobile is required" : "Employee ID or Mobile is required" });
    }

    const identifier = employeeId.trim();
    let query = {};

    if (identifier.includes("@")) {
      query = { email: identifier.toLowerCase() };
    } else if (/^\d{10}$/.test(identifier)) {
      query = { mobile: identifier };
    } else {
      query = { employeeId: identifier.toUpperCase() };
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({
        error: "User not found. Check your credentials or contact Seth.",
      });
    }

    // Check if first-time user (Munsis/Labours only)
    if (user.role !== "seth" && !user.password) {
      return res.json({
        status: "requires_pin",
        message: "You need to set your PIN first",
        setPin: true,
      });
    }

    if (!pin) {
      return res.json({
        status: "requires_login",
        role: user.role,
        message: user.role === "seth" ? "Password is required" : "PIN is required",
      });
    }

    const isMatch = await bcrypt.compare(pin, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: user.role === "seth" ? "Incorrect password" : "Incorrect PIN",
      });
    }

    // Generate tokens
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const session = await Session.create({
      userId: user._id.toString(),
      refreshTokenHash: refreshTokenHash,
    });

    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role, // ✅ Added role to JWT payload
        sessionId: session._id,
      },
      JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      user: { id: user._id, role: user.role, name: user.name },
      accessToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

// ============================================================================
// TOKEN REFRESH FUNCTION
// ============================================================================

/**
 * Refresh access token using refresh token from cookie
 * POST /api/auth/refresh-token
 */
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const session = await Session.findOne({
      refreshTokenHash,
      userId: user._id.toString(),
    });

    if (!session) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (session.revoked) {
      return res.status(401).json({ message: "Refresh token has been revoked" });
    }

    // Generate new tokens
    const newRefreshToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const newRefreshTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        role: user.role, // ✅ Include role in refreshed token
        sessionId: session._id,
      },
      JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );

    // Set new refresh token cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Access token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    res.status(500).json({ error: "Failed to refresh token" });
  }
};

// ============================================================================
// FORGOT PASSWORD FUNCTIONS
// ============================================================================

/**
 * Send OTP to phone for password reset
 * POST /api/auth/forgot-password/phone
 */
export const forgotPasswordSendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const user = await User.findOne({ mobile: phone });
    if (!user) {
      return res.status(404).json({ error: "User not found with this phone number" });
    }

    // Delete existing OTPs for this phone and purpose
    await otpModel.deleteMany({ 
      mobile: phone, 
      type: "mobile", 
      purpose: "forgot_password" 
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    const otpHash = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    await otpModel.create({
      otpHash,
      type: "mobile",
      mobile: phone,
      purpose: "forgot_password",
      createdAt: new Date(Date.now()),
    });
const otpBody = getOtpBody(otp, "Password reset", "Use this OTP to complete your password reset.");
const response=await sendPhoneSms(phone, otpBody);

   if (!response || !response.success) {
  return res.status(400).json({ 
    error: "Failed to send OTP", 
    details: response?.error || "Gateway connection error" 
  });
}

res.json({ 
      message: "OTP sent to your phone for password reset",
      demoOtp: otp // Remove this in production
    });
  } catch (error) {
    console.error("Forgot Password Phone OTP Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

/**
 * Send OTP to email for password reset
 * POST /api/auth/forgot-password/email
 */
export const forgotPasswordSendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found with this email" });
    }

    // Delete existing OTPs for this email and purpose
    await otpModel.deleteMany({ 
      email: email.toLowerCase(), 
      type: "email", 
      purpose: "forgot_password" 
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const OtpHtml=getOtpHtml(otp);
    const otpHash = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    await otpModel.create({
      otpHash,
      type: "email",
      email: email.toLowerCase(),
      purpose: "forgot_password",
      createdAt: new Date(Date.now()),
    });


    // TODO: Send OTP via email service

  await sendEmail(email, "Password Reset OTP", `Your Rular Ledger password reset OTP is: ${otp}`,OtpHtml);
    res.json({ 
      message: "OTP sent to your email for password reset",
    });
  } catch (error) {
    console.error("Forgot Password Email OTP Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

/**
 * Verify OTP for password reset (optional step)
 * POST /api/auth/forgot-password/verify-otp
 */
export const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { method, identifier, otp } = req.body;

    if (!method || !identifier || !otp) {
      return res.status(400).json({ 
        error: "Method, identifier, and OTP are required" 
      });
    }

    if (!['phone', 'email'].includes(method)) {
      return res.status(400).json({ 
        error: "Invalid method. Use 'phone' or 'email'" 
      });
    }

    // Verify OTP
    const otpHash = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    let otpQuery = {
      otpHash,
      purpose: "forgot_password",
    };

    if (method === 'phone') {
      otpQuery.type = "mobile";
      otpQuery.mobile = identifier;
    } else {
      otpQuery.type = "email";
      otpQuery.email = identifier.toLowerCase();
    }

    const otpData = await otpModel.findOne(otpQuery);

    if (!otpData) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Check OTP expiry (10 minutes)
    const expiryTime = otpData.createdAt.getTime() + 10 * 60 * 1000;
    if (expiryTime < Date.now()) {
      await otpModel.deleteOne({ _id: otpData._id });
      return res.status(400).json({ error: "OTP has expired" });
    }

    res.json({ 
      message: "OTP verified successfully",
      verified: true
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
};

/**
 * Reset password with OTP verification
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { method, identifier, otp, newPassword } = req.body;

    // Validate required fields
    if (!method || !identifier || !otp || !newPassword) {
      return res.status(400).json({ 
        error: "Method (phone/email), identifier, OTP, and new password are required" 
      });
    }

    // Validate method
    if (!['phone', 'email'].includes(method)) {
      return res.status(400).json({ 
        error: "Invalid method. Use 'phone' or 'email'" 
      });
    }

    // Password strength validation
  
    // Find user based on method
    let user;
    let query = {};
    
    if (method === 'phone') {
      if (!/^\d{10}$/.test(identifier)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
      query = { mobile: identifier };
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      query = { email: identifier.toLowerCase() };
    }

    user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify OTP
    const otpHash = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    let otpQuery = {
      otpHash,
      purpose: "forgot_password",
    };

    if (method === 'phone') {
      otpQuery.type = "mobile";
      otpQuery.mobile = identifier;
    } else {
      otpQuery.type = "email";
      otpQuery.email = identifier.toLowerCase();
    }

    const otpData = await otpModel.findOne(otpQuery);

    if (!otpData) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Check OTP expiry (10 minutes)
    const expiryTime = otpData.createdAt.getTime() + 10 * 60 * 1000;
    if (expiryTime < Date.now()) {
      await otpModel.deleteOne({ _id: otpData._id });
      return res.status(400).json({ error: "OTP has expired. Please request a new OTP." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Revoke all existing sessions for security
    await Session.deleteMany({ userId: user._id.toString() });

    // Delete used OTP
    await otpModel.deleteMany({ 
      purpose: "forgot_password",
      [method === 'phone' ? 'mobile' : 'email']: identifier 
    });

    res.json({ 
      message: "Password reset successfully. Please login with your new password.",
      note: "You have been logged out from all devices for security"
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};

// ============================================================================
// LOGOUT FUNCTIONS
// ============================================================================

/**
 * Logout from current device
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token found" });
    }

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const result = await Session.deleteOne({ refreshTokenHash });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
export const logoutAll = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const result = await Session.deleteMany({ userId: decoded.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No active sessions found" });
    }

    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logged out from all devices successfully" });
  } catch (error) {
    console.error("Logout All Error:", error);
    res.status(500).json({ error: "Logout from all devices failed" });
  }
};

// ============================================================================
// PROFILE FUNCTIONS
// ============================================================================

/**
 * Get user profile
 * GET /api/auth/profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "seth") {
      const settings = await Settings.findOne({ sethId: req.user.id }) || 
                        await Settings.create({ sethId: req.user.id });
      
      return res.json({
        ownerName: settings.ownerName || user.name,
        email: settings.email || user.email || "",
        phone: settings.phone || user.mobile || "",
        businessName: settings.businessName,
        gstNumber: settings.gstNumber,
        address: settings.address,
        village: settings.village,
        kardaPerBagKg: settings.kardaPerBagKg,
        labourPerBagCash: settings.labourPerBagCash,
        shrinkagePercent: settings.shrinkagePercent,
        role: "seth",
        employeeId: "SETH"
      });
    }

    res.json({
      ownerName: user.name,
      email: user.email || "",
      phone: user.mobile || "",
      village: "",
      role: user.role,
      employeeId: user.employeeId
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};

/**
 * Update user profile
 * PATCH /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "seth") {
      const settings = await Settings.findOne({ sethId: req.user.id }) || 
                        await Settings.create({ sethId: req.user.id });
      
      const fields = [
        "ownerName", "email", "phone", "businessName", "gstNumber", 
        "address", "village", "kardaPerBagKg", "labourPerBagCash", "shrinkagePercent"
      ];
      
      fields.forEach(f => {
        if (req.body[f] !== undefined) {
          settings[f] = req.body[f];
        }
      });
      
      await settings.save();

      // Sync Seth's user document
      if (req.body.ownerName !== undefined) user.name = req.body.ownerName.trim();
      if (req.body.email !== undefined) user.email = req.body.email.trim() || null;
      if (req.body.phone !== undefined && req.body.phone.trim()) user.mobile = req.body.phone.trim();
      await user.save();

      return res.json(settings);
    }

    // For Munsi/Labour
    if (req.body.ownerName !== undefined) user.name = req.body.ownerName.trim();
    if (req.body.email !== undefined) user.email = req.body.email.trim() || null;
    if (req.body.phone !== undefined) {
      if (!req.body.phone.trim()) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      user.mobile = req.body.phone.trim();
    }
    
    await user.save();
    
    res.json({
      ownerName: user.name,
      email: user.email || "",
      phone: user.mobile || "",
      village: "",
      role: user.role,
      employeeId: user.employeeId
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(400).json({ error: error.message || "Failed to update profile" });
  }
};

/**
 * Change password
 * POST /api/auth/change-password
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    
    if (!oldPin || !newPin ) {
      return res.status(400).json({ error: "Old password and new password are required" });
    }

    if (newPin.length < 4) {
      return res.status(400).json({ error: "New Pin must be at least 6 characters long" });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPin, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPin, salt);
    await user.save();

    // Revoke all other active sessions for this user except the current session
    if (req.sessionId) {
      await Session.deleteMany({ 
        userId: user._id.toString(), 
        _id: { $ne: req.sessionId } 
      });
    } else {
      // If session ID not available, revoke all sessions
      await Session.deleteMany({ userId: user._id.toString() });
    }

    res.json({ success: true, message: "PIN changed successfully!" });
  } catch (error) {
    console.error("Change PIN Error:", error);
    res.status(500).json({ error: "Failed to change PIN" });
  }
};


/**
 * set-pin
 * POST /api/auth/set-pin
 */
export const setPin = async (req, res) => {
  try {
     const { employeeId, pin } = req.body;
      
     let quary={}
     if (employeeId.includes("@")) {
       quary = { email: employeeId.toLowerCase() };
     } else if (/^\d{10}$/.test(employeeId)) {
       quary = { mobile: employeeId };
     } else {
       quary = { employeeId: employeeId.toUpperCase() };
     }
     
     const user = await User.findOne(quary);
     if (!user) {
       return res.status(404).json({ error: "User not found" });
     }
     
     if (user.password) {
       return res.status(400).json({ error: "PIN is already set. Please login instead." });
     }
     
     const salt = await bcrypt.genSalt(10);
     user.password = await bcrypt.hash(pin, salt);
     await user.save();
     
     res.json({ success: true, message: "PIN set successfully!" });
  } catch (error) {
    console.error("Set Pin Error:", error);
    res.status(500).json({ error: "Failed to set pin for user" });
  }
};
