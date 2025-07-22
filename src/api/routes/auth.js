const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Start authentication
router.post("/start", authController.startAuth.bind(authController));

// Verify code
router.post("/verify", authController.verifyCode.bind(authController));

// Get current user (protected)
router.get("/me", authMiddleware, authController.getMe.bind(authController));

// Logout (protected)
router.post(
  "/logout",
  authMiddleware,
  authController.logout.bind(authController)
);

module.exports = router;
