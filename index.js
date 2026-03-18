require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const contactsRoutes = require("./routes/contactsRoutes");
const messagesRoutes = require("./routes/messagesRoutes");
const setupSocket = require("./socket/socketHandler");

const app = express();
const PORT = process.env.PORT || 8747;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/messages", messagesRoutes);

app.get("/", (req, res) => {
  res.json({ message: "CS 314 Chat Backend is running" });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const server = http.createServer(app);
setupSocket(server);

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  });
};

if (require.main === module) {
  start();
}

module.exports = { app, server };
