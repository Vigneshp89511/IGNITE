const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { findMatchingRule, buildApprovalSteps, evaluateConditional } = require('../utils/approvalHelper');

// Multer setup
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Currency conversion helper
async function convertCurrency(amount, from, to) {
  if (from === to) return amount;
  try {
    const res = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const rate = res.data.rates[to];
    if (!rate) return null;
    return +(amount * rate).toFixed(2);
  } catch {
    return null;
  }
}

// POST /api/expenses - submit expense
router.post('/', auth, requireRole('employee', 'admin'), upload.single('receipt'), async (req, res) => {
  try {
    const { description, category, date, amount, currency } = req.body;
    if (!description || !category || !date || !amount || !currency) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const companyCurrency = req.user.company.currency.code;
    const amountInCompanyCurrency = await convertCurrency(parseFloat(amount), currency, companyCurrency);

    // Find matching approval rule
    const rule = await findMatchingRule(req.user.company._id, category, parseFloat(amount));

    // Build approval steps
    let approvalSteps = [];
    if (rule) {
      const employee = await User.findById(req.user._id).populate('manager');
      approvalSteps = buildApprovalSteps(rule, employee.manager);
    }

    const expense = await Expense.create({
      employee: req.user._id,
      company: req.user.company._id,
      description,
      category,
      date: new Date(date),
      amount: parseFloat(amount),
      currency,
      amountInCompanyCurrency,
      companyCurrency,
      receiptUrl: req.file ? `/uploads/${req.file.filename}` : null,
      approvalRule: rule ? rule._id : null,
      approvalSteps,
      currentStep: 0,
      status: approvalSteps.length === 0 ? 'approved' : 'pending',
    });

    await expense.populate([
      { path: 'employee', select: 'name email' },
      { path: 'approvalSteps.approver', select: 'name email role' },
    ]);

    res.status(201).json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/expenses - list expenses (role-aware)
router.get('/', auth, async (req, res) => {
  try {
    let query = { company: req.user.company._id };

    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (req.user.role === 'manager') {
      // Show expenses where this manager is a pending approver at current step
      // OR expenses from their team
      const teamMembers = await User.find({ manager: req.user._id, company: req.user.company._id }).select('_id');
      const teamIds = teamMembers.map(u => u._id);
      query = {
        company: req.user.company._id,
        $or: [
          { employee: { $in: teamIds } },
          { 'approvalSteps.approver': req.user._id },
        ],
      };
    }
    // admin: no extra filter

    const expenses = await Expense.find(query)
      .populate('employee', 'name email')
      .populate('approvalSteps.approver', 'name email role')
      .populate('approvalRule', 'name')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/expenses/pending-approval - expenses waiting for current user's approval
router.get('/pending-approval', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const expenses = await Expense.find({
      company: req.user.company._id,
      status: 'pending',
      approvalSteps: {
        $elemMatch: {
          approver: req.user._id,
          status: 'pending',
        },
      },
    })
      .populate('employee', 'name email')
      .populate('approvalSteps.approver', 'name email role')
      .populate('approvalRule', 'name')
      .sort({ createdAt: -1 });

    // Filter to only those where it's THIS approver's turn (currentStep matches)
    const actionable = expenses.filter(exp => {
      const currentStepData = exp.approvalSteps[exp.currentStep];
      return currentStepData && currentStepData.approver._id.toString() === req.user._id.toString();
    });

    res.json(actionable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/expenses/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('employee', 'name email')
      .populate('approvalSteps.approver', 'name email role')
      .populate('approvalRule', 'name conditionalApproval')
      .populate('company', 'currency name');

    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    // Access check
    if (req.user.role === 'employee' && expense.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/expenses/:id/approve
router.post('/:id/approve', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { comment } = req.body;
    const expense = await Expense.findOne({ _id: req.params.id, company: req.user.company._id })
      .populate('approvalRule');

    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.status !== 'pending') return res.status(400).json({ message: 'Expense not pending' });

    const stepIdx = expense.currentStep;
    const step = expense.approvalSteps[stepIdx];

    if (!step) return res.status(400).json({ message: 'No current step' });
    if (step.approver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your turn to approve' });
    }

    // Mark step approved
    expense.approvalSteps[stepIdx].status = 'approved';
    expense.approvalSteps[stepIdx].comment = comment || '';
    expense.approvalSteps[stepIdx].actionAt = new Date();

    // Check conditional approval
    let autoApproved = false;
    if (expense.approvalRule) {
      const result = evaluateConditional(expense, expense.approvalRule);
      if (result === 'approved') autoApproved = true;
    }

    if (autoApproved || stepIdx >= expense.approvalSteps.length - 1) {
      // All steps done or conditionally approved
      expense.status = 'approved';
    } else {
      // Move to next step
      expense.currentStep = stepIdx + 1;
    }

    await expense.save();
    await expense.populate([
      { path: 'employee', select: 'name email' },
      { path: 'approvalSteps.approver', select: 'name email role' },
    ]);

    res.json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/expenses/:id/reject
router.post('/:id/reject', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { comment } = req.body;
    const expense = await Expense.findOne({ _id: req.params.id, company: req.user.company._id });

    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.status !== 'pending') return res.status(400).json({ message: 'Expense not pending' });

    const stepIdx = expense.currentStep;
    const step = expense.approvalSteps[stepIdx];

    if (!step) return res.status(400).json({ message: 'No current step' });
    if (step.approver.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your turn' });
    }

    expense.approvalSteps[stepIdx].status = 'rejected';
    expense.approvalSteps[stepIdx].comment = comment || '';
    expense.approvalSteps[stepIdx].actionAt = new Date();
    expense.status = 'rejected';
    expense.rejectionReason = comment || '';

    await expense.save();
    await expense.populate([
      { path: 'employee', select: 'name email' },
      { path: 'approvalSteps.approver', select: 'name email role' },
    ]);

    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/expenses/ocr - extract data from receipt image
router.post('/ocr/extract', auth, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const Tesseract = require('tesseract.js');
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');

    // Simple extraction heuristics
    const amountMatch = text.match(/(?:total|amount|sum|grand total)[:\s]*[$€£₹]?\s*([\d,]+\.?\d*)/i);
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

    const extracted = {
      amount: amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null,
      date: dateMatch ? dateMatch[1] : null,
      rawText: text.substring(0, 500),
    };

    res.json({
      receiptUrl: `/uploads/${req.file.filename}`,
      extracted,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
