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
    enum: ['food', 'transport', 'shopping', 'entertainment', 'bills', 'healthcare', 'education', 'travel', 'salary', 'freelance', 'investment', 'other']
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  // Multi-currency support
  currency: {
    type: String,
    default: 'INR',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'AED', 'SGD', 'HKD', 'KRW', 'MXN', 'BRL']
  },
  exchangeRate: {
    type: Number,
    default: 1.0  // Rate to base currency at time of transaction
  },
  baseAmount: {
    type: Number,
    default: null  // Amount converted to user's base currency
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save hook to calculate baseAmount if not provided
expenseSchema.pre('save', function (next) {
  if (this.baseAmount === null || this.baseAmount === undefined) {
    this.baseAmount = this.amount * this.exchangeRate;
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);