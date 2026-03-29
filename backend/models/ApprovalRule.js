const mongoose = require('mongoose');

// Each approver in the sequential chain
const approverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: Number, required: true }, // sequence order
  isManagerApprover: { type: Boolean, default: false }, // auto-assign employee's manager
}, { _id: false });

const approvalRuleSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { type: String, default: null }, // null = applies to all categories
  amountThreshold: { type: Number, default: null }, // null = applies to all amounts; else applies when amount > threshold

  // Sequential approvers list
  approvers: [approverSchema],

  // Is manager (of expense submitter) first approver?
  isManagerApprover: { type: Boolean, default: false },

  // Conditional approval logic
  conditionalApproval: {
    enabled: { type: Boolean, default: false },
    // percentage: if X% of approvers approve -> auto approved
    percentageThreshold: { type: Number, default: null }, // 0-100
    // specific approver: if this user approves -> auto approved regardless
    specificApprover: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // hybrid: percentage OR specific approver
    hybridMode: { type: Boolean, default: false },
  },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);
