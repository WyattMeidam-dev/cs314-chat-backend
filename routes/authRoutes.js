const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const {
  signup,
  login,
  logout,
  getUserInfo,
  updateProfile,
} = require("../controllers/authController");

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/userinfo", verifyToken, getUserInfo);
router.post("/update-profile", verifyToken, updateProfile);

module.exports = router;
