const FileManager = require("../../fileManager");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
require("dotenv").config({ quiet: true });
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || "./uploads");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true);
  },
});

class FileController {
  constructor() {
    this.upload = upload;
  }

  // Upload and send file to Saved Messages
  async uploadAndSend(req, res, next) {
    try {
      const { client } = req.telegramSession;
      const fileManager = new FileManager(client);

      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
        });
      }

      const { caption } = req.body;
      const filePath = req.file.path;

      // Send to Telegram
      const result = await fileManager.sendFileToSavedMessages(
        filePath,
        caption || ""
      );

      res.json({
        message: "File uploaded and sent successfully",
        file: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          caption: caption || "",
        },
        telegramResult: {
          messageId: result.id,
          date: result.date,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Send existing file to Saved Messages
  async sendFile(req, res, next) {
    try {
      const { client } = req.telegramSession;
      const fileManager = new FileManager(client);
      const { filePath, caption } = req.body;

      if (!filePath) {
        return res.status(400).json({
          error: "File path is required",
        });
      }

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          error: "File not found",
        });
      }

      const result = await fileManager.sendFileToSavedMessages(
        filePath,
        caption || ""
      );

      res.json({
        message: "File sent successfully",
        telegramResult: {
          messageId: result.id,
          date: result.date,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Download file from Telegram message
  async downloadFile(req, res, next) {
    try {
      const { client } = req.telegramSession;
      const fileManager = new FileManager(client);
      const { messageId, fileName } = req.body;

      if (!messageId) {
        return res.status(400).json({
          error: "Message ID is required",
        });
      }

      // Get the message
      const messages = await client.getMessages("me", {
        ids: [parseInt(messageId)],
      });

      if (!messages.length || !messages[0].media) {
        return res.status(404).json({
          error: "Message or media not found",
        });
      }

      const filePath = await fileManager.downloadMediaFromMessage(
        messages[0],
        fileName
      );

      if (!filePath) {
        return res.status(500).json({
          error: "Failed to download file",
        });
      }

      res.json({
        message: "File downloaded successfully",
        filePath: filePath,
        fileName: path.basename(filePath),
        downloadUrl: `/downloads/${path.basename(filePath)}`,
      });
    } catch (error) {
      next(error);
    }
  }

  // List uploaded files
  async listUploadedFiles(req, res, next) {
    try {
      const uploadDir = process.env.UPLOAD_PATH || "./uploads";
      const files = await fs.readdir(uploadDir);

      const fileList = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(uploadDir, file);
          const stats = await fs.stat(filePath);

          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            url: `/uploads/${file}`,
          };
        })
      );

      res.json({
        files: fileList,
        count: fileList.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // List downloaded files
  async listDownloadedFiles(req, res, next) {
    try {
      const downloadDir = process.env.DOWNLOAD_PATH || "./downloads";
      const files = await fs.readdir(downloadDir);

      const fileList = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(downloadDir, file);
          const stats = await fs.stat(filePath);

          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            url: `/downloads/${file}`,
          };
        })
      );

      res.json({
        files: fileList,
        count: fileList.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete file
  async deleteFile(req, res, next) {
    try {
      const { fileName, type } = req.params;
      const baseDir =
        type === "uploads"
          ? process.env.UPLOAD_PATH || "./uploads"
          : process.env.DOWNLOAD_PATH || "./downloads";

      const filePath = path.join(baseDir, fileName);

      // Security check - ensure file is within the allowed directory
      if (!filePath.startsWith(path.resolve(baseDir))) {
        return res.status(403).json({
          error: "Access denied",
        });
      }

      await fs.unlink(filePath);

      res.json({
        message: "File deleted successfully",
        fileName: fileName,
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({
          error: "File not found",
        });
      }
      next(error);
    }
  }
}

module.exports = new FileController();
