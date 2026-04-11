const express = require("express");
const router = express.Router();

const Expense = require("./Expense");
const { auth } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload");

// 📤 Create Expense (with bill upload)
router.post("/", auth, upload.single("billImage"), async (req, res) => {
  try {
    const { amount, category, description } = req.body;

    const expense = new Expense({
      user: req.user.id,
      amount,
      category,
      description,
      billImage: req.file ? req.file.filename : null,
    });

    await expense.save();

    res.status(201).json({
      message: "Expense submitted",
      expense,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📥 Get Logged-in User Expenses
router.get("/me", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;