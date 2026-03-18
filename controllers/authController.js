const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const issueToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const formatUser = (user) => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  image: user.image,
  profileSetup: user.profileSetup,
  color: user.color,
});

const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email is already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
    });

    issueToken(newUser._id, res);
    return res.status(201).json({ user: formatUser(newUser) });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "No account found with that email" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    issueToken(user._id, res);
    return res.status(200).json({ user: formatUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(formatUser(user));
  } catch (err) {
    console.error("Get user info error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, color } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First name and last name are required" });
    }

    const updated = await User.findByIdAndUpdate(
      req.userId,
      { firstName: firstName.trim(), lastName: lastName.trim(), color: color || "", profileSetup: true },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(400).json({ message: "User not found" });
    }

    return res.status(200).json(formatUser(updated));
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { signup, login, logout, getUserInfo, updateProfile };
