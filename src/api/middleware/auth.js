const jwt = require("jsonwebtoken");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const authController = require("../controllers/authController");
require("dotenv").config({ quiet: true });
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Access token is required",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session exists
    let session = await authController.getSession(decoded.sessionId);

    if (!session) {
      // Recreate session from stored session string
      const stringSession = new StringSession(decoded.sessionString);
      const client = new TelegramClient(
        stringSession,
        parseInt(process.env.API_ID),
        process.env.API_HASH,
        { connectionRetries: 5 }
      );

      await client.connect();

      session = {
        client,
        phoneNumber: decoded.phoneNumber,
        sessionString: decoded.sessionString,
        timestamp: Date.now(),
      };
    }

    // Add session info to request
    req.telegramSession = {
      ...session,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    console.log("🚀 ~ authMiddleware ~ error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
      });
    }

    res.status(500).json({
      error: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;
