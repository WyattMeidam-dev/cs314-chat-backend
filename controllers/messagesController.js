const mongoose = require("mongoose");
const Message = require("../models/Message");

const getMessages = async (req, res) => {
  try {
    const { id: contactorId } = req.body;

    if (!contactorId) {
      return res.status(400).json({ message: "Contact user ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(contactorId)) {
      return res.status(400).json({ message: "Invalid contact user ID" });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const otherId = new mongoose.Types.ObjectId(contactorId);

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherId },
        { sender: otherId, recipient: userId },
      ],
    }).sort({ timestamp: 1 });

    return res.status(200).json({ messages });
  } catch (err) {
    console.error("Get messages error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getMessages };
