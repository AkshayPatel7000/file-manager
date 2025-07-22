const express = require("express");
const fileController = require("../controllers/fileController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Upload and send file
router.post(
  "/upload",
  fileController.upload.single("file"),
  fileController.uploadAndSend.bind(fileController)
);

// Send existing file
router.post("/send", fileController.sendFile.bind(fileController));

// Download file from message
router.post("/download", fileController.downloadFile.bind(fileController));

// List files
router.get("/uploads", fileController.listUploadedFiles.bind(fileController));
router.get(
  "/downloads",
  fileController.listDownloadedFiles.bind(fileController)
);

// Delete file
router.delete(
  "/:type/:fileName",
  fileController.deleteFile.bind(fileController)
);

module.exports = router;
