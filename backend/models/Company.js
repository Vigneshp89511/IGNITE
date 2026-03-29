const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  country: { type: String, required: true },
  currency: {
    code: { type: String, required: true },
    name: { type: String },
    symbol: { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
