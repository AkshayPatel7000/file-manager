const { Api } = require("telegram/tl");
const fs = require("fs").promises;
const path = require("path");

class FileManager {
  constructor(client) {
    this.client = client;
    this.uploadsDir = path.join(__dirname, "uploads");
    this.downloadsDir = path.join(__dirname, "downloads");
    this.initializeDirs();
  }

  async initializeDirs() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.downloadsDir, { recursive: true });
    } catch (error) {
      console.log("Directory initialization error:", error);
    }
  }

  // Send file to Saved Messages
  async sendFileToSavedMessages(filePath, caption = "") {
    try {
      console.log(`Sending file: ${filePath}`);

      const result = await this.client.sendFile("me", {
        file: filePath,
        caption: caption,
      });

      console.log("File sent successfully to Saved Messages!");
      return result;
    } catch (error) {
      console.error("Error sending file:", error);
      throw error;
    }
  }

  // Get messages from Saved Messages with media
  async getFilesFromSavedMessages(limit = 10) {
    try {
      console.log("Fetching files from Saved Messages...");

      const messages = await this.client.getMessages("me", {
        limit: limit,
      });

      const mediaMessages = messages.filter((msg) => msg.media);

      console.log(`Found ${mediaMessages.length} media messages`);
      return mediaMessages;
    } catch (error) {
      console.error("Error getting files:", error);
      throw error;
    }
  }

  // Download media from a message
  async downloadMediaFromMessage(message, customFileName = null) {
    try {
      if (!message.media) {
        console.log("No media in this message");
        return null;
      }

      console.log("Downloading media...");

      const buffer = await this.client.downloadMedia(message, {
        workers: 1,
      });

      if (!buffer || buffer.length === 0) {
        console.log("No media data received");
        return null;
      }

      // Generate filename
      let fileName = customFileName;
      if (!fileName) {
        const timestamp = Date.now();
        const extension = this.getFileExtension(message);
        fileName = `downloaded_${timestamp}${extension}`;
      }

      const filePath = path.join(this.downloadsDir, fileName);
      await fs.writeFile(filePath, buffer);

      console.log(`Media downloaded successfully: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error("Error downloading media:", error);
      throw error;
    }
  }

  // Get file extension from message media
  getFileExtension(message) {
    try {
      if (message.media.document) {
        const mimeType = message.media.document.mimeType;
        const mimeToExt = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/gif": ".gif",
          "video/mp4": ".mp4",
          "application/pdf": ".pdf",
          "text/plain": ".txt",
          "audio/mpeg": ".mp3",
        };
        return mimeToExt[mimeType] || ".bin";
      } else if (message.media.photo) {
        return ".jpg";
      }
    } catch (error) {
      console.log("Could not determine file extension");
    }
    return ".bin";
  }

  // List files in uploads directory
  async listUploadFiles() {
    try {
      const files = await fs.readdir(this.uploadsDir);
      return files.map((file) => path.join(this.uploadsDir, file));
    } catch (error) {
      console.error("Error listing upload files:", error);
      return [];
    }
  }

  // Display file information
  displayMessageInfo(message, index) {
    console.log(`\n--- Message ${index + 1} ---`);
    console.log(`Date: ${message.date}`);
    console.log(`Text: ${message.text || "No text"}`);

    if (message.media) {
      if (message.media.document) {
        console.log(`Type: Document`);
        console.log(`MIME: ${message.media.document.mimeType}`);
        console.log(`Size: ${message.media.document.size} bytes`);
      } else if (message.media.photo) {
        console.log(`Type: Photo`);
      }
    }
  }
}

module.exports = FileManager;
