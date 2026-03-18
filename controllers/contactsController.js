const mongoose = require("mongoose");
const User = require("../models/User");
const Message = require("../models/Message");

const searchContacts = async (req, res) => {
  try {
    const { searchTerm } = req.body;

    if (!searchTerm || searchTerm.trim() === "") {
      return res.status(400).json({ message: "searchTerm is required" });
    }

    const escaped = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const contacts = await User.find({
      _id: { $ne: req.userId },
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
    }).select("_id firstName lastName email");

    return res.status(200).json({ contacts });
  } catch (err) {
    console.error("Search contacts error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllContacts = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select("_id firstName lastName");

    const contacts = users.map((u) => ({
      label: `${u.firstName} ${u.lastName}`.trim(),
      value: u._id,
    }));

    return res.status(200).json({ contacts });
  } catch (err) {
    console.error("Get all contacts error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getContactsForList = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(400).json({ message: "User ID not found in token" });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);

    const contacts = await Message.aggregate([
      {
        $match: { $or: [{ sender: userId }, { recipient: userId }] },
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", userId] },
              then: "$recipient",
              else: "$sender",
            },
          },
          lastMessageTime: { $first: "$timestamp" },
        },
      },
      { $sort: { lastMessageTime: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "contactInfo",
        },
      },
      { $unwind: "$contactInfo" },
      {
        $project: {
          _id: "$contactInfo._id",
          firstName: "$contactInfo.firstName",
          lastName: "$contactInfo.lastName",
          email: "$contactInfo.email",
          image: "$contactInfo.image",
          color: "$contactInfo.color",
          lastMessageTime: 1,
        },
      },
    ]);

    return res.status(200).json({ contacts });
  } catch (err) {
    console.error("Get contacts for list error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteDM = async (req, res) => {
  try {
    const { dmId } = req.params;

    if (!dmId || !mongoose.Types.ObjectId.isValid(dmId)) {
      return res.status(400).json({ message: "Valid dmId is required" });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const otherId = new mongoose.Types.ObjectId(dmId);

    await Message.deleteMany({
      $or: [
        { sender: userId, recipient: otherId },
        { sender: otherId, recipient: userId },
      ],
    });

    return res.status(200).json({ message: "DM deleted successfully" });
  } catch (err) {
    console.error("Delete DM error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { searchContacts, getAllContacts, getContactsForList, deleteDM };
