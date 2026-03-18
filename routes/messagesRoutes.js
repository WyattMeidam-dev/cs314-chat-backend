const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { getMessages } = require("../controllers/messagesController");

router.post("/get-messages", verifyToken, getMessages);

module.exports = router;
