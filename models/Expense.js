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
  merchant: {
    type: String,
    trim: true,
    maxlength: 50,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);