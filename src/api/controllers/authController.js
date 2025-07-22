require("dotenv").config({ quiet: true });
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Session = require("../../models/Session");

class AuthController {
  // Start authentication process
  async startAuth(req, res, next) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          error: "Phone number is required",
        });
      }

      const sessionId = uuidv4();
      const stringSession = new StringSession("");

      const client = new TelegramClient(
        stringSession,
        parseInt(process.env.API_ID),
        process.env.API_HASH,
        { connectionRetries: 5 }
      );
      // Start authentication
      await client.connect(); // First connect to Telegram
      // Request the verification code
      // Remove any non-numeric characters from phone number
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");

      const result = await client.sendCode(
        {
          apiId: parseInt(process.env.API_ID),
          apiHash: process.env.API_HASH,
        },
        cleanPhoneNumber
      );

      // Store the phone code hash for verification in MongoDB
      await Session.create({
        sessionId,
        phoneNumber,
        sessionString: stringSession.save(),
        phoneCodeHash: result.phoneCodeHash,
        isPending: true,
      });

      // Return immediately after sending code
      return res.json({
        sessionId,
        message: "SMS code sent to your phone",
        nextStep: "verify",
      });
    } catch (error) {
      console.error("Start auth error:", error);
      next(error);
    }
  }

  // Verify SMS code
  async verifyCode(req, res, next) {
    try {
      const { sessionId, code, password } = req.body;

      if (!sessionId || !code) {
        return res.status(400).json({
          error: "Session ID and code are required",
        });
      }

      const session = await Session.findOne({ sessionId, isPending: true });

      if (!session) {
        return res.status(404).json({
          error: "Invalid or expired session",
        });
      }

      const stringSession = new StringSession(session.sessionString);
      const client = new TelegramClient(
        stringSession,
        parseInt(process.env.API_ID),
        process.env.API_HASH,
        { connectionRetries: 5 }
      );

      const { phoneNumber, phoneCodeHash } = session;

      // Complete authentication
      await client.connect(); // Ensure we're connected
      console.log(
        {
          apiId: parseInt(process.env.API_ID),
          apiHash: process.env.API_HASH,
        },
        {
          phoneNumber,
          password: password || "",
          phoneCode: code,
        }
      );
      const result = await client.signInUser(
        {
          apiId: parseInt(process.env.API_ID),
          apiHash: process.env.API_HASH,
        },
        {
          phoneNumber,
          password: () => password || "",
          phoneCode: () => code,
          onError: (err) =>
            res.json({
              sessionId,
              message: err,
              user: {
                phoneNumber: phoneNumber,
              },
            }),
        }
      );

      // Get session string
      const sessionString = client.session.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          sessionString,
          phoneNumber,
          sessionId,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      // Update session in MongoDB
      await Session.findOneAndUpdate(
        { sessionId },
        {
          sessionString,
          isPending: false,
        },
        { new: true }
      );

      res.json({
        token,
        sessionId,
        message: "Authentication successful",
        user: {
          phoneNumber: phoneNumber,
          sessionString: sessionString,
        },
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user info
  async getMe(req, res, next) {
    try {
      const { client } = req.telegramSession;
      const me = await client.getMe();

      res.json({
        user: {
          id: me.id.toString(),
          firstName: me.firstName,
          lastName: me.lastName,
          username: me.username,
          phone: me.phone,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout
  async logout(req, res, next) {
    try {
      const { sessionId } = req.telegramSession;

      // Remove from active sessions
      if (this.activeSessions.has(sessionId)) {
        const { client } = this.activeSessions.get(sessionId);
        await client.disconnect();
        this.activeSessions.delete(sessionId);
      }

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }

  // Get session by ID (for middleware)
  async getSession(sessionId) {
    return await Session.findOne({ sessionId, isPending: true });
  }
}

module.exports = new AuthController();
