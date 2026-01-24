const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  icon: {
    type: String,
    required: true,
    default: '🏆'
  },
  category: {
    type: String,
    required: true,
    enum: ['savings', 'budgeting', 'tracking', 'social', 'challenges', 'streaks', 'milestones', 'special']
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  points: {
    type: Number,
    default: 10,
    min: 0
  },
  requirement: {
    type: {
      type: String,
      required: true,
      enum: [
        'budget_streak',      // Stay under budget for X days/months
        'savings_amount',     // Save total X amount
        'expense_tracking',   // Track X expenses
        'goal_completion',    // Complete X goals
        'challenge_wins',     // Win X challenges
        'login_streak',       // Login X days in a row
        'category_master',    // Track X expenses in one category
        'analytics_usage',    // View analytics X times
        'first_action',       // First time doing something
        'social_engagement',  // Invite/compete with friends
        'no_spend_days',      // Have X no-spend days
        'receipt_uploads',    // Upload X receipts
        'custom'
      ]
    },
    value: {
      type: Number,
      required: true
    },
    category: String,      // For category-specific achievements
    timeframe: String      // 'daily', 'weekly', 'monthly', 'yearly', 'all_time'
  },
  isSecret: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  }
}, {
  timestamps: true
});

// Indexes
achievementSchema.index({ code: 1 });
achievementSchema.index({ category: 1, isActive: 1 });
achievementSchema.index({ tier: 1 });

module.exports = mongoose.model('Achievement', achievementSchema);
