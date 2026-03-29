const mongoose = require('mongoose');

const approvalStepSchema = new mongoose.Schema({
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  comment: { type: String, default: '' },
  actionAt: { type: Date, default: null },
  isManagerStep: { type: Boolean, default: false },
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  description: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  date: { type: Date, required: true },

  // Amount in submitted currency
  amount: { type: Number, required: true },
  currency: { type: String, required: true }, // e.g. "USD"

  // Converted amount in company's currency
  amountInCompanyCurrency: { type: Number, default: null },
  companyCurrency: { type: String, default: null },

  receiptUrl: { type: String, default: null }, // uploaded file path

  // OCR extracted data
  ocrData: {
    raw: { type: String, default: null },
    extracted: { type: Object, default: null },
  },

  // Approval workflow
  approvalRule: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRule', default: null },
  approvalSteps: [approvalStepSchema],
  currentStep: { type: Number, default: 0 }, // index into approvalSteps

  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // Overall rejection reason (from any step)
  rejectionReason: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
