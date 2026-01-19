const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other', 'all'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  period: {
    type: String,
    enum: ['monthly', 'weekly', 'yearly'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  alertThreshold: {
    type: Number,
    default: 80, // Alert at 80% of budget
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  spent: {
    type: Number,
    default: 0
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
budgetSchema.index({ user: 1, category: 1, period: 1 });

module.exports = mongoose.model('Budget', budgetSchema);