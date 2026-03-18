const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    messageType: {
      type: String,
      default: "text",
      enum: ["text", "file"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);
messageSchema.index({ sender: 1, recipient: 1, timestamp: 1 });
module.exports = mongoose.model("Message", messageSchema);
