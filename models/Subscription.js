const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'streaming', 'music', 'gaming', 'software', 'productivity',
      'fitness', 'news', 'education', 'cloud_storage', 'food_delivery',
      'transportation', 'insurance', 'utilities', 'membership', 'other'
    ],
    default: 'other'
  },
  billingCycle: {
    type: String,
    required: true,
    enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'yearly'],
    default: 'monthly'
  },
  nextPaymentDate: {
    type: Date,
    required: true
  },
  lastPaymentDate: {
    type: Date
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  // Trial period tracking
  trialEndDate: {
    type: Date
  },
  isInTrial: {
    type: Boolean,
    default: false
  },
  trialReminderSent: {
    type: Boolean,
    default: false
  },
  // Service details
  provider: {
    type: String,
    trim: true,
    maxlength: 100
  },
  website: {
    type: String,
    trim: true,
    maxlength: 200
  },
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'trial', 'expired'],
    default: 'active'
  },
  // Auto-detection
  isAutoDetected: {
    type: Boolean,
    default: false
  },
  detectionConfidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  linkedExpenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  }],
  // Payment tracking
  paymentMethod: {
    type: String,
    trim: true,
    maxlength: 50
  },
  // Reminders
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  reminderDaysBefore: {
    type: Number,
    default: 3,
    min: 1,
    max: 30
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  // Usage tracking
  lastUsedDate: {
    type: Date
  },
  usageFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'rarely', 'never', 'unknown'],
    default: 'unknown'
  },
  // Statistics
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Notes and tags
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  // Color for UI
  color: {
    type: String,
    default: '#667eea'
  },
  // Logo/icon
  logo: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for monthly cost
subscriptionSchema.virtual('monthlyAmount').get(function() {
  switch (this.billingCycle) {
    case 'weekly': return this.amount * 4.33;
    case 'biweekly': return this.amount * 2.17;
    case 'monthly': return this.amount;
    case 'quarterly': return this.amount / 3;
    case 'semi_annual': return this.amount / 6;
    case 'yearly': return this.amount / 12;
    default: return this.amount;
  }
});

// Virtual for yearly cost
subscriptionSchema.virtual('yearlyAmount').get(function() {
  switch (this.billingCycle) {
    case 'weekly': return this.amount * 52;
    case 'biweekly': return this.amount * 26;
    case 'monthly': return this.amount * 12;
    case 'quarterly': return this.amount * 4;
    case 'semi_annual': return this.amount * 2;
    case 'yearly': return this.amount;
    default: return this.amount * 12;
  }
});

// Virtual for days until next payment
subscriptionSchema.virtual('daysUntilPayment').get(function() {
  if (!this.nextPaymentDate) return null;
  const diff = new Date(this.nextPaymentDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for days until trial ends
subscriptionSchema.virtual('daysUntilTrialEnds').get(function() {
  if (!this.trialEndDate) return null;
  const diff = new Date(this.trialEndDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Check if subscription is unused (no usage in 30+ days)
subscriptionSchema.virtual('isUnused').get(function() {
  if (!this.lastUsedDate) return this.usageFrequency === 'never' || this.usageFrequency === 'rarely';
  const daysSinceUsed = Math.floor((new Date() - this.lastUsedDate) / (1000 * 60 * 60 * 24));
  return daysSinceUsed > 30;
});

// Calculate next payment date based on billing cycle
subscriptionSchema.methods.calculateNextPaymentDate = function() {
  const currentDate = this.nextPaymentDate || new Date();
  const nextDate = new Date(currentDate);

  switch (this.billingCycle) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semi_annual':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
};

// Check if reminder should be sent
subscriptionSchema.methods.shouldSendReminder = function() {
  if (!this.reminderEnabled || this.reminderSent) return false;
  if (this.status !== 'active' && this.status !== 'trial') return false;
  
  const today = new Date();
  const paymentDate = new Date(this.nextPaymentDate);
  const reminderDate = new Date(paymentDate);
  reminderDate.setDate(reminderDate.getDate() - this.reminderDaysBefore);
  
  return today >= reminderDate && today < paymentDate;
};

// Check if trial reminder should be sent
subscriptionSchema.methods.shouldSendTrialReminder = function() {
  if (!this.isInTrial || !this.trialEndDate || this.trialReminderSent) return false;
  
  const today = new Date();
  const trialEnd = new Date(this.trialEndDate);
  const reminderDate = new Date(trialEnd);
  reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before trial ends
  
  return today >= reminderDate && today < trialEnd;
};

// Indexes
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ user: 1, nextPaymentDate: 1 });
subscriptionSchema.index({ user: 1, category: 1 });
subscriptionSchema.index({ nextPaymentDate: 1, reminderEnabled: 1 });
subscriptionSchema.index({ trialEndDate: 1, isInTrial: 1 });

// Static method to get total monthly cost for a user
subscriptionSchema.statics.getMonthlyTotal = async function(userId) {
  const subscriptions = await this.find({ 
    user: userId, 
    status: { $in: ['active', 'trial'] } 
  });
  return subscriptions.reduce((total, sub) => total + sub.monthlyAmount, 0);
};

// Static method to get upcoming payments
subscriptionSchema.statics.getUpcoming = async function(userId, days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return await this.find({
    user: userId,
    status: { $in: ['active', 'trial'] },
    nextPaymentDate: { 
      $gte: new Date(),
      $lte: futureDate 
    }
  }).sort({ nextPaymentDate: 1 });
};

// Static method to find potentially unused subscriptions
subscriptionSchema.statics.findUnused = async function(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return await this.find({
    user: userId,
    status: { $in: ['active', 'trial'] },
    $or: [
      { usageFrequency: { $in: ['never', 'rarely'] } },
      { lastUsedDate: { $lt: thirtyDaysAgo } },
      { lastUsedDate: null, usageFrequency: 'unknown' }
    ]
  });
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
