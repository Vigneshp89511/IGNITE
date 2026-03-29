const express = require('express');
const router = express.Router();
const ApprovalRule = require('../models/ApprovalRule');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/approval-rules
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const rules = await ApprovalRule.find({ company: req.user.company._id })
      .populate('approvers.user', 'name email role')
      .populate('conditionalApproval.specificApprover', 'name email');
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/approval-rules
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const {
      name, description, category, amountThreshold,
      approvers, isManagerApprover,
      conditionalApproval,
    } = req.body;

    if (!name || !approvers || approvers.length === 0) {
      return res.status(400).json({ message: 'name and approvers required' });
    }

    const rule = await ApprovalRule.create({
      company: req.user.company._id,
      name, description, category, amountThreshold,
      approvers,
      isManagerApprover: isManagerApprover || false,
      conditionalApproval: conditionalApproval || { enabled: false },
    });

    await rule.populate('approvers.user', 'name email role');
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/approval-rules/:id
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const rule = await ApprovalRule.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    const fields = ['name', 'description', 'category', 'amountThreshold', 'approvers', 'isManagerApprover', 'conditionalApproval', 'isActive'];
    fields.forEach(f => { if (req.body[f] !== undefined) rule[f] = req.body[f]; });
    await rule.save();
    await rule.populate('approvers.user', 'name email role');
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/approval-rules/:id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await ApprovalRule.findOneAndDelete({ _id: req.params.id, company: req.user.company._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
