const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  originalAmount: {
    type: Number,
    required: true,
    min: 0.01
  },
  originalCurrency: {
    type: String,
    required: true,
    default: 'INR',
    uppercase: true
  },
  convertedAmount: {
    type: Number,
    min: 0.01
  },
  convertedCurrency: {
    type: String,
    uppercase: true
  },
  exchangeRate: {
    type: Number,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other']
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);