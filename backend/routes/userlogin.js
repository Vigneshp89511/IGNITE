const express = require('express');
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// 🔐 LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Using email as username
    const user = await User.findOne({ email: username });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "User is inactive" });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      username: user.name,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;