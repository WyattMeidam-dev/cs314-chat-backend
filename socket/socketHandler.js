const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const Message = require("../models/Message");

const userSocketMap = {};

const setupSocket = (server) => {
  const { Server } = require("socket.io");

  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie || "";
      const cookies = cookie.parse(rawCookie);
      const token = cookies.jwt;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    userSocketMap[userId] = socket.id;

    socket.on("sendMessage", async (data) => {
      try {
        const { sender, recipient, content, messageType } = data;

        if (!sender || !recipient || !content) {
          socket.emit("error", { message: "sender, recipient, and content are required" });
          return;
        }

        const newMessage = await Message.create({
          sender,
          recipient,
          content,
          messageType: messageType || "text",
          timestamp: new Date(),
        });

        const msg = await Message.findById(newMessage._id)
          .populate("sender", "_id email firstName lastName image color")
          .populate("recipient", "_id email firstName lastName image color");

        const payload = {
          id: msg._id,
          sender: msg.sender,
          recipient: msg.recipient,
          content: msg.content,
          messageType: msg.messageType,
          timestamp: msg.timestamp,
        };

        const recipientSocketId = userSocketMap[recipient];
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("receiveMessage", payload);
        }

        const senderSocketId = userSocketMap[sender];
        if (senderSocketId) {
          io.to(senderSocketId).emit("receiveMessage", payload);
        }
      } catch (err) {
        console.error("sendMessage error:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      if (userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];
      }
    });
  });

  return io;
};

module.exports = setupSocket;
