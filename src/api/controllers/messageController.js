const FileManager = require("../../fileManager");

class MessageController {
  // Get messages from Saved Messages
  async getMessages(req, res, next) {
    try {
      const { client } = req.telegramSession;
      const fileManager = new FileManager(client);
      const { limit = 10, offset = 0, mediaOnly = false } = req.query;

      const messages = await client.getMessages("me", {
        limit: parseInt(limit),
        offsetId: parseInt(offset) || 0,
      });

      let filteredMessages = messages;
      if (mediaOnly === "true") {
        filteredMessages = messages.filter((msg) => msg.media);
      }

      const formattedMessages = filteredMessages.map((msg) => ({
        id: msg.id,
        date: msg.date,
        text: msg.text || "",
        hasMedia: !!msg.media,
        mediaType: msg.media ? this.getMediaType(msg.media) : null,
        mediaInfo: msg.media ? this.getMediaInfo(msg.media) : null,
      }));

      res.json({
        messages: formattedMessages,
        count: formattedMessages.length,
        hasMore: messages.length === parseInt(limit),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get specific message
  async getMessage(req, res, next) {
    try {
      const { client } = req.telegramSession;
      const { messageId } = req.params;

      const messages = await client.getMessages("me", {
        ids: [parseInt(messageId)],
      });

      if (!messages.length) {
        return res.status(404).json({
          error: "Message not found",
        });
      }

      const msg = messages[0];

      res.json({
        message: {
          id: msg.id,
          date: msg.date,
          text: msg.text || "",
          hasMedia: !!msg.media,
          mediaType: msg.media ? this.getMediaType(msg.media) : null,
          mediaInfo: msg.media ? this.getMediaInfo(msg.media) : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Send text message to Saved Messages
  async sendMessage(req, res, next) {
    try {
      const { client } = req.telegramSession;
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          error: "Message text is required",
        });
      }

      const result = await client.sendMessage("me", {
        message: text,
      });

      res.json({
        message: "Message sent successfully",
        result: {
          id: result.id,
          date: result.date,
          text: text,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete message
  async deleteMessage(req, res, next) {
    try {
      const { client } = req.telegramSession;
      const { messageId } = req.params;

      await client.deleteMessages("me", [parseInt(messageId)], {
        revoke: true,
      });

      res.json({
        message: "Message deleted successfully",
        messageId: parseInt(messageId),
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  getMediaType(media) {
    if (media.photo) return "photo";
    if (media.document) {
      const mimeType = media.document.mimeType;
      if (mimeType.startsWith("video/")) return "video";
      if (mimeType.startsWith("audio/")) return "audio";
      if (mimeType.startsWith("image/")) return "image";
      return "document";
    }
    return "unknown";
  }

  getMediaInfo(media) {
    if (media.photo) {
      return {
        type: "photo",
        sizes: media.photo.sizes?.length || 0,
      };
    }

    if (media.document) {
      return {
        type: "document",
        mimeType: media.document.mimeType,
        size: media.document.size,
        fileName: media.document.attributes?.find((attr) => attr.fileName)
          ?.fileName,
      };
    }

    return null;
  }
}

module.exports = new MessageController();
