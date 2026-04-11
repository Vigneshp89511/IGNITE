const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");


const router = express.Router();
const JWT_SECRET = "your-secret-key-here"; // change this

// Register (optional, for testing)
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = new User({
      username,
      password: await bcrypt.hash(password, 10),
    });

    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;