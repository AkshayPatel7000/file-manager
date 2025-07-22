const express = require("express");
const messageController = require("../controllers/messageController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get messages
router.get("/", messageController.getMessages.bind(messageController));

// Get specific message
router.get(
  "/message/:messageId",
  messageController.getMessage.bind(messageController)
);

// Send message
router.post("/", messageController.sendMessage.bind(messageController));

// Delete message
router.delete(
  "/message/:messageId",
  messageController.deleteMessage.bind(messageController)
);

module.exports = router;
