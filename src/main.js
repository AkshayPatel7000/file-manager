const { authenticateUser } = require("./auth");
const FileManager = require("./fileManager");
const input = require("input");
const path = require("path");

class TelegramFileApp {
  constructor() {
    this.client = null;
    this.fileManager = null;
  }

  async initialize() {
    console.log("=== Telegram File Manager ===");
    this.client = await authenticateUser();
    this.fileManager = new FileManager(this.client);
    console.log("Application initialized successfully!");
  }

  async showMenu() {
    console.log("\n=== MENU ===");
    console.log("1. Send file to Saved Messages");
    console.log("2. View files in Saved Messages");
    console.log("3. Download file from Saved Messages");
    console.log("4. List available upload files");
    console.log("5. Exit");

    const choice = await input.text("Enter your choice (1-5): ");
    return choice.trim();
  }

  async sendFile() {
    try {
      const filePath = await input.text("Enter file path: ");
      const caption = await input.text("Enter caption (optional): ");

      // Check if file exists
      const fs = require("fs");
      if (!fs.existsSync(filePath)) {
        console.log("File not found!");
        return;
      }

      await this.fileManager.sendFileToSavedMessages(filePath, caption);
    } catch (error) {
      console.error("Failed to send file:", error.message);
    }
  }

  async viewFiles() {
    try {
      const limit = await input.text(
        "How many recent messages to check (default 10): "
      );
      const messageLimit = parseInt(limit) || 10;

      const messages = await this.fileManager.getFilesFromSavedMessages(
        messageLimit
      );

      if (messages.length === 0) {
        console.log("No media files found in Saved Messages");
        return;
      }

      messages.forEach((message, index) => {
        this.fileManager.displayMessageInfo(message, index);
      });
    } catch (error) {
      console.error("Failed to view files:", error.message);
    }
  }

  async downloadFile() {
    try {
      const messages = await this.fileManager.getFilesFromSavedMessages(20);

      if (messages.length === 0) {
        console.log("No media files found");
        return;
      }

      console.log("\nAvailable files:");
      messages.forEach((message, index) => {
        console.log(
          `${index + 1}. ${message.text || "Media file"} (${message.date})`
        );
      });

      const choice = await input.text("Enter file number to download: ");
      const fileIndex = parseInt(choice) - 1;

      if (fileIndex < 0 || fileIndex >= messages.length) {
        console.log("Invalid selection");
        return;
      }

      const fileName = await input.text(
        "Enter filename (press Enter for auto-generated): "
      );
      const customName = fileName.trim() || null;

      await this.fileManager.downloadMediaFromMessage(
        messages[fileIndex],
        customName
      );
    } catch (error) {
      console.error("Failed to download file:", error.message);
    }
  }

  async listUploadFiles() {
    try {
      const files = await this.fileManager.listUploadFiles();

      if (files.length === 0) {
        console.log("No files found in uploads directory");
        return;
      }

      console.log("\nFiles in uploads directory:");
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${path.basename(file)}`);
      });
    } catch (error) {
      console.error("Failed to list files:", error.message);
    }
  }

  async run() {
    await this.initialize();

    while (true) {
      try {
        const choice = await this.showMenu();

        switch (choice) {
          case "1":
            await this.sendFile();
            break;
          case "2":
            await this.viewFiles();
            break;
          case "3":
            await this.downloadFile();
            break;
          case "4":
            await this.listUploadFiles();
            break;
          case "5":
            console.log("Goodbye!");
            process.exit(0);
            break;
          default:
            console.log("Invalid choice. Please try again.");
        }
      } catch (error) {
        console.error("An error occurred:", error.message);
      }
    }
  }
}

// Run the application
if (require.main === module) {
  const app = new TelegramFileApp();
  app.run().catch(console.error);
}

module.exports = TelegramFileApp;
