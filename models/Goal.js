const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  goalType: {
    type: String,
    enum: ['savings', 'expense_reduction', 'income_increase', 'debt_payoff'],
    required: true
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other', 'general'],
    default: 'general'
  },
  targetDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  milestones: [{
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    achieved: {
      type: Boolean,
      default: false
    },
    achievedDate: Date
  }],
  reminderFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'none'],
    default: 'weekly'
  }
}, {
  timestamps: true
});

// Calculate progress percentage
goalSchema.virtual('progressPercentage').get(function() {
  return Math.min((this.currentAmount / this.targetAmount) * 100, 100);
});

// Check if goal is overdue
goalSchema.virtual('isOverdue').get(function() {
  return new Date() > this.targetDate && this.status === 'active';
});

goalSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Goal', goalSchema);