import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Session from "../models/Session.js";
import config from "../Config/Congig.js";

const JWT_SECRET = config.JWT_SECRET;

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // Decode token first
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if User (Seth/Munsi/Labour) still exists in DB
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ error: "Not authorized. Account has been deleted or revoked." });
      }

      // Verify session exists and is valid
      const session = await Session.findOne({ 
        userId: user._id.toString(),
        revoked: false
      });
      
      if (!session) {
        return res.status(401).json({ error: "Session expired or logged out. Please login again." });
      }

      req.user = user;
      req.token = token;
      req.sessionId = decoded.sessionId;
      req.sethId = user.role === "seth" ? user._id.toString() : user.addedBy;
      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      res.status(401).json({ error: "Not authorized, token failed." });
    }
  } else {
    res.status(401).json({ error: "Not authorized, no token provided." });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authorized. Please log in." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Only ${roles.join(" or ")} are allowed to access this resource.` });
    }
    next();
  };
};
