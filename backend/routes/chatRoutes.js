const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { handleChatMessage } = require("../controllers/chatController");

// Protect route with JWT authentication
router.post("/", authMiddleware, handleChatMessage);

module.exports = router;
