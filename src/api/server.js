const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config({ quiet: true });
const connectDB = require("../config/db");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const messageRoutes = require("./routes/messages");
const errorHandler = require("./middleware/errorHandler");

class TelegramAPIServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Enable trust proxy
    this.app.set("trust proxy", 1);

    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(",") || [
          "http://localhost:3000",
          "*",
        ],
        credentials: true,
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
      max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
      message: {
        error: "Too many requests from this IP, please try again later.",
      },
    });
    this.app.use("/api/", limiter);

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Static file serving
    this.app.use(
      "/uploads",
      express.static(path.join(__dirname, "../uploads"))
    );
    this.app.use(
      "/downloads",
      express.static(path.join(__dirname, "../downloads"))
    );
  }

  setupRoutes() {
    // API routes
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/files", fileRoutes);
    this.app.use("/api/messages", messageRoutes);

    // Health check
    this.app.get("/api/health", (req, res) => {
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API documentation
    this.app.get("/api", (req, res) => {
      res.json({
        name: "Telegram File Manager API",
        version: "1.0.0",
        endpoints: {
          auth: "/api/auth",
          files: "/api/files",
          messages: "/api/messages",
          health: "/api/health",
        },
      });
    });

    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        error: "Route not found",
        path: req.originalUrl,
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Connect to MongoDB
      await connectDB();

      this.app.listen(this.port, () => {
        console.log(`🚀 Telegram API Server running on port ${this.port}`);
        console.log(
          `📊 Health check: http://localhost:${this.port}/api/health`
        );
        console.log(`📚 API docs: http://localhost:${this.port}/api`);
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

// Start server
if (require.main === module) {
  const server = new TelegramAPIServer();
  server.start();
}

module.exports = TelegramAPIServer;
