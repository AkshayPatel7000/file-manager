const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  sessionString: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // For pending authentication sessions
  isPending: {
    type: Boolean,
    default: false,
  },
  phoneCodeHash: String,
});

// Add indexes
sessionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 24 * 60 * 60 }); // Expire after 24 hours

module.exports = mongoose.model("Session", sessionSchema);
