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
import { validateMandiSettings } from "../utils/validateMandiSettings.js";
const JWT_SECRET = config.JWT_SECRET;

function clearRefreshTokenCookie(res) {
  const options = { httpOnly: true, secure: true, sameSite: "none" };
  res.clearCookie("refreshToken", { ...options, path: "/" });
  res.clearCookie("refreshToken", { ...options, path: "/api/auth" });
}

function getUserIdentifierQuery(identifier) {
  if (identifier.includes("@")) {
    return { email: identifier.toLowerCase() };
  }
  if (/^\d{10}$/.test(identifier)) {
    return { mobile: identifier };
  }
  return { employeeId: identifier.toUpperCase() };
}

function getNormalizedContact(type, value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (type === "mobile") return /^\d{10}$/.test(normalized) ? normalized : null;
  if (type === "email") {
    const email = normalized.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  }
  return null;
}

async function recordLoginFailure(userId) {
  const now = new Date();
  const failureWindowMs = 15 * 60 * 1000;
  const resetWindow = {
    $or: [
      { $eq: [{ $ifNull: ["$loginFailureWindowStartedAt", null] }, null] },
      { $lte: ["$loginFailureWindowStartedAt", new Date(now.getTime() - failureWindowMs)] },
    ],
  };
  const failedAttempts = {
    $cond: [
      resetWindow,
      1,
      { $add: [{ $ifNull: ["$loginFailedAttempts", 0] }, 1] },
    ],
  };
  const lockDurationMs = {
    $min: [
      failureWindowMs,
      {
        $multiply: [
          30_000,
          {
            $pow: [
              2,
              { $min: [5, { $max: [0, { $subtract: [failedAttempts, 5] }] }] },
            ],
          },
        ],
      },
    ],
  };

  return User.findOneAndUpdate(
    { _id: userId },
    [{
      $set: {
        loginFailedAttempts: failedAttempts,
        loginFailureWindowStartedAt: {
          $cond: [resetWindow, now, "$loginFailureWindowStartedAt"],
        },
        loginLockedUntil: {
          $cond: [
            { $gte: [failedAttempts, 5] },
            { $add: [now, lockDurationMs] },
            { $cond: [resetWindow, null, "$loginLockedUntil"] },
          ],
        },
      },
    }],
    { new: true },
  );
}

async function verifyCurrentCredential(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }

  const credential = req.body.currentCredential;
  if (typeof credential !== "string" || !credential.trim()) {
    res.status(400).json({ error: "Enter your current password or PIN to verify this change" });
    return null;
  }
  if (user.role !== "seth" && !/^\d{4}$/.test(credential)) {
    res.status(400).json({ error: "Current PIN must be exactly 4 digits" });
    return null;
  }
  if (!user.password) {
    res.status(403).json({ error: "A password or PIN must be set before changing account contacts" });
    return null;
  }

  if (user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
    const retryAfterSeconds = Math.ceil((user.loginLockedUntil.getTime() - Date.now()) / 1000);
    res.set("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Too many failed credential attempts. Please try again later." });
    return null;
  }

  const isMatch = await bcrypt.compare(credential, user.password);
  if (!isMatch) {
    const updatedUser = await recordLoginFailure(user._id);
    if (updatedUser?.loginLockedUntil && updatedUser.loginLockedUntil.getTime() > Date.now()) {
      res.set("Retry-After", String(Math.ceil((updatedUser.loginLockedUntil.getTime() - Date.now()) / 1000)));
      res.status(429).json({ error: "Too many failed credential attempts. Please try again later." });
      return null;
    }
    res.status(401).json({ error: "Current password or PIN is incorrect" });
    return null;
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        loginFailedAttempts: 0,
        loginFailureWindowStartedAt: null,
        loginLockedUntil: null,
      },
    },
  );
  return user;
}

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
    const otp = crypto.randomInt(100000, 1000000);
    
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

    const otpBody = getOtpBody(
      otp,
      "verification OTP",
      "Use this OTP to complete your registration.",
    );
    const smsResult = await sendPhoneSms(phone, otpBody);
    if (!smsResult.success) {
      await otpModel.deleteOne({ otpHash, mobile: phone, purpose: "register" });
      return res.status(502).json({ error: "Could not send registration OTP. Please try again." });
    }

    return res.json({
      message: "OTP sent to your phone for registration",
      ...(config.NODE_ENV === "production" ? {} : { demoOtp: otp }),
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
      path: "/",
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
    const user = await User.findOne(getUserIdentifierQuery(identifier));
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

    if (user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
      const retryAfterSeconds = Math.ceil((user.loginLockedUntil.getTime() - Date.now()) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: "Too many failed login attempts. Please try again later.",
      });
    }

    const isMatch = await bcrypt.compare(pin, user.password);
    if (!isMatch) {
      const updatedUser = await recordLoginFailure(user._id);
      if (updatedUser?.loginLockedUntil && updatedUser.loginLockedUntil.getTime() > Date.now()) {
        res.set("Retry-After", String(Math.ceil((updatedUser.loginLockedUntil.getTime() - Date.now()) / 1000)));
        return res.status(429).json({
          error: "Too many failed login attempts. Please try again later.",
        });
      }
      return res.status(401).json({
        error: user.role === "seth" ? "Incorrect password" : "Incorrect PIN",
      });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          loginFailedAttempts: 0,
          loginFailureWindowStartedAt: null,
          loginLockedUntil: null,
        },
      },
    );

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
      path: "/",
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
      path: "/",
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
    const otp = crypto.randomInt(100000, 1000000);
    
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
    const otpBody = getOtpBody(
      otp,
      "Password reset",
      "Use this OTP to complete your password reset.",
    );
    const smsResult = await sendPhoneSms(phone, otpBody);
    if (!smsResult.success) {
      await otpModel.deleteOne({ otpHash, mobile: phone, purpose: "forgot_password" });
      return res.status(502).json({ error: "Could not send password reset OTP. Please try again." });
    }

    return res.json({
      message: "OTP sent to your phone for password reset",
      ...(config.NODE_ENV === "production" ? {} : { demoOtp: otp }),
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
    await Session.deleteOne({
      _id: req.sessionId,
      userId: req.user._id.toString(),
    });

    clearRefreshTokenCookie(res);
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
    await Session.deleteMany({ userId: req.user._id.toString() });

    clearRefreshTokenCookie(res);
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
        email: user.email || "",
        phone: user.mobile || "",
        businessName: settings.businessName,
        gstNumber: settings.gstNumber,
        address: settings.address,
        village: settings.village,
        profileImageUrl: settings.profileImageUrl || "",
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
      profileImageUrl: user.profileImageUrl || "",
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

    const submittedEmail = req.body.email === undefined
      ? user.email || ""
      : String(req.body.email).trim().toLowerCase();
    const submittedPhone = req.body.phone === undefined
      ? user.mobile
      : String(req.body.phone).trim();
    if (submittedEmail !== (user.email || "").toLowerCase() || submittedPhone !== user.mobile) {
      return res.status(400).json({
        error: "Verify a new email address or phone number before saving it.",
      });
    }

    if (user.role === "seth") {
      const validationError = validateMandiSettings(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

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
      profileImageUrl: user.profileImageUrl || "",
      village: "",
      role: user.role,
      employeeId: user.employeeId
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(400).json({ error: error.message || "Failed to update profile" });
  }
};

export const sendProfileContactOtp = async (req, res) => {
  try {
    const user = await verifyCurrentCredential(req, res);
    if (!user) return;

    const { type, value } = req.body;
    const contact = getNormalizedContact(type, value);
    if (!contact) {
      return res.status(400).json({
        error: type === "mobile" ? "Enter a valid 10-digit phone number" : "Enter a valid email address",
      });
    }

    const userId = user._id.toString();
    const field = type === "mobile" ? "mobile" : "email";
    const existing = await User.findOne({ [field]: contact }).select("_id");
    if (existing && existing._id.toString() !== userId) {
      return res.status(409).json({ error: "That phone number or email is already in use" });
    }

    const recentOtp = await otpModel.findOne({
      userId,
      purpose: "change_contact",
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });
    if (recentOtp) {
      return res.status(429).json({ error: "Please wait before requesting another verification code" });
    }

    await otpModel.deleteMany({ userId, purpose: "change_contact", type, [field]: contact });
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpRecord = await otpModel.create({
      otpHash,
      type,
      [field]: contact,
      purpose: "change_contact",
      userId,
    });

    try {
      if (type === "mobile") {
        const result = await sendPhoneSms(
          contact,
          getOtpBody(otp, "Contact verification", "Use this OTP to verify your new phone number."),
        );
        if (!result.success) throw new Error("SMS delivery failed");
      } else {
        const result = await sendEmail(
          contact,
          "Verify your SaafHisaab email",
          `Your email verification OTP is: ${otp}`,
          getOtpHtml(otp),
        );
        if (result?.success === false) throw new Error("Email delivery failed");
      }
    } catch (error) {
      await otpModel.deleteOne({ _id: otpRecord._id });
      throw error;
    }

    return res.json({ message: `Verification code sent to your ${type === "mobile" ? "phone" : "email"}` });
  } catch (error) {
    console.error("Profile contact OTP Error:", error);
    return res.status(502).json({ error: "Could not send verification code. Please try again." });
  }
};

export const verifyProfileContactOtp = async (req, res) => {
  try {
    const user = await verifyCurrentCredential(req, res);
    if (!user) return;

    const { type, value, otp } = req.body;
    const contact = getNormalizedContact(type, value);
    if (!contact || !/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({ error: "Enter a valid contact and 6-digit verification code" });
    }

    const userId = user._id.toString();
    const field = type === "mobile" ? "mobile" : "email";
    const otpQuery = { userId, purpose: "change_contact", type, [field]: contact };
    const otpRecord = await otpModel.findOne(otpQuery);
    if (!otpRecord || otpRecord.attempts >= 5) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }
    if (!otpRecord.createdAt || Date.now() - new Date(otpRecord.createdAt).getTime() > 5 * 60 * 1000) {
      await otpModel.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    if (otpRecord.otpHash !== otpHash) {
      const failedAttempt = await otpModel.findOneAndUpdate(
        { _id: otpRecord._id, attempts: { $lt: 5 } },
        { $inc: { attempts: 1 } },
        { new: true },
      );
      if (failedAttempt?.attempts >= 5) {
        await otpModel.deleteOne({ _id: otpRecord._id });
      }
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const consumedOtp = await otpModel.findOneAndDelete({ ...otpQuery, otpHash });
    if (!consumedOtp) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const duplicate = await User.findOne({ [field]: contact, _id: { $ne: userId } }).select("_id");
    if (duplicate) {
      return res.status(409).json({ error: "That phone number or email is already in use" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { [field]: contact } },
      { new: true, runValidators: true },
    );
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (updatedUser.role === "seth") {
      const settingsField = type === "mobile" ? "phone" : "email";
      await Settings.findOneAndUpdate(
        { sethId: userId },
        { $set: { [settingsField]: contact } },
        { upsert: true, new: true },
      );
    }

    return res.json({
      message: `${type === "mobile" ? "Phone number" : "Email"} verified and updated`,
      [type === "mobile" ? "phone" : "email"]: contact,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "That phone number or email is already in use" });
    }
    console.error("Profile contact verification Error:", error);
    return res.status(500).json({ error: "Could not verify contact. Please try again." });
  }
};

/**
 * Change staff PIN
 * POST /api/auth/change-pin
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    
    if (!oldPin || !newPin ) {
      return res.status(400).json({ error: "Current PIN and new PIN are required" });
    }

    if (!/^\d{4}$/.test(oldPin) || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ error: "Current PIN and new PIN must each be exactly 4 digits" });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!["munsi", "labour"].includes(user.role)) {
      return res.status(403).json({ error: "PIN changes are only available to staff accounts" });
    }

    if (user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
      const retryAfterSeconds = Math.ceil((user.loginLockedUntil.getTime() - Date.now()) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: "Too many failed PIN attempts. Please try again later." });
    }

    const isMatch = await bcrypt.compare(oldPin, user.password);
    if (!isMatch) {
      const updatedUser = await recordLoginFailure(user._id);
      if (updatedUser?.loginLockedUntil && updatedUser.loginLockedUntil.getTime() > Date.now()) {
        res.set("Retry-After", String(Math.ceil((updatedUser.loginLockedUntil.getTime() - Date.now()) / 1000)));
        return res.status(429).json({ error: "Too many failed PIN attempts. Please try again later." });
      }
      return res.status(401).json({ error: "Incorrect current PIN" });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          loginFailedAttempts: 0,
          loginFailureWindowStartedAt: null,
          loginLockedUntil: null,
        },
      },
    );

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
 * Send a one-time code to the registered phone for first-time PIN setup.
 * POST /api/auth/first-login/pin-otp
 */
export const sendFirstLoginPinOtp = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (typeof employeeId !== "string" || !employeeId.trim()) {
      return res.status(400).json({ error: "Employee ID, phone, or email is required" });
    }

    const user = await User.findOne(getUserIdentifierQuery(employeeId.trim()));
    if (!user || !["munsi", "labour"].includes(user.role)) {
      return res.status(404).json({ error: "First-time PIN setup is only available to staff accounts" });
    }
    if (user.password) {
      return res.status(409).json({ error: "PIN is already set. Use Forgot PIN to reset it." });
    }
    if (!/^\d{10}$/.test(user.mobile || "")) {
      return res.status(400).json({ error: "A valid registered phone number is required to set up your PIN" });
    }

    const recentOtp = await otpModel.findOne({
      mobile: user.mobile,
      type: "mobile",
      purpose: "first_login_pin",
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });
    if (recentOtp) {
      const retryAfterSeconds = Math.ceil(
        (recentOtp.createdAt.getTime() + 60 * 1000 - Date.now()) / 1000,
      );
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: "Please wait before requesting another verification code" });
    }

    await otpModel.deleteMany({
      mobile: user.mobile,
      type: "mobile",
      purpose: "first_login_pin",
    });

    const otp = crypto.randomInt(100000, 1000000);
    const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    const otpRecord = await otpModel.create({
      otpHash,
      type: "mobile",
      mobile: user.mobile,
      purpose: "first_login_pin",
      createdAt: new Date(),
    });

    const response = await sendPhoneSms(
      user.mobile,
      getOtpBody(otp, "first-time PIN setup", "Use this OTP to set your staff PIN."),
    );
    if (!response?.success) {
      await otpModel.deleteOne({ _id: otpRecord._id });
      return res.status(502).json({ error: "Could not send the verification code. Please try again." });
    }

    const maskedPhone = `******${user.mobile.slice(-4)}`;
    return res.json({
      message: `Verification code sent to ${maskedPhone}`,
      maskedPhone,
      ...(config.NODE_ENV === "production" ? {} : { demoOtp: otp }),
    });
  } catch (error) {
    console.error("First-time PIN OTP Error:", error);
    return res.status(500).json({ error: "Failed to send verification code" });
  }
};

/**
 * Set a first-time staff PIN after verifying an OTP sent to the registered phone.
 * POST /api/auth/set-pin
 */
export const setPin = async (req, res) => {
  try {
    const { employeeId, otp, pin } = req.body;
    if (typeof employeeId !== "string" || !employeeId.trim()) {
      return res.status(400).json({ error: "Employee ID, phone, or email is required" });
    }
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "A valid 6-digit verification code is required" });
    }
    if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: "PIN must be exactly 4 digits" });
    }

    const user = await User.findOne(getUserIdentifierQuery(employeeId.trim()));
    if (!user || !["munsi", "labour"].includes(user.role)) {
      return res.status(404).json({ error: "First-time PIN setup is only available to staff accounts" });
    }
    if (user.password) {
      return res.status(409).json({ error: "PIN is already set. Use Forgot PIN to reset it." });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpQuery = {
      mobile: user.mobile,
      type: "mobile",
      purpose: "first_login_pin",
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    };
    const otpRecord = await otpModel.findOne(otpQuery);
    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }
    if (otpRecord.attempts >= 5) {
      return res.status(429).json({ error: "Too many invalid codes. Request a new verification code." });
    }
    if (otpRecord.otpHash !== otpHash) {
      const failedAttempt = await otpModel.findOneAndUpdate(
        { _id: otpRecord._id, attempts: { $lt: 5 } },
        { $inc: { attempts: 1 } },
        { new: true },
      );
      if (!failedAttempt || failedAttempt.attempts >= 5) {
        await otpModel.deleteOne({ _id: otpRecord._id });
        return res.status(429).json({ error: "Too many invalid codes. Request a new verification code." });
      }
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const consumedOtp = await otpModel.findOneAndDelete({
      _id: otpRecord._id,
      otpHash,
      attempts: { $lt: 5 },
    });
    if (!consumedOtp) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);
    const result = await User.updateOne(
      {
        _id: user._id,
        role: { $in: ["munsi", "labour"] },
        $or: [{ password: null }, { password: { $exists: false } }, { password: "" }],
      },
      { $set: { password: hashedPin } },
    );
    if (result.modifiedCount !== 1) {
      return res.status(409).json({ error: "PIN is already set. Please log in instead." });
    }

    return res.json({ success: true, message: "PIN set successfully!" });
  } catch (error) {
    console.error("Set Pin Error:", error);
    res.status(500).json({ error: "Failed to set pin for user" });
  }
};
