const mongoose = require('mongoose');

// Achievement Definition Schema
const achievementSchema = new mongoose.Schema({
  // Unique identifier code
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  // Display name
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  // Description
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  // Category of achievement
  category: {
    type: String,
    required: true,
    enum: [
      'budgeting',      // Budget-related achievements
      'savings',        // Savings achievements
      'streaks',        // Streak-based achievements
      'goals',          // Goal achievements
      'analytics',      // Dashboard/analytics usage
      'social',         // Social/sharing achievements
      'challenges',     // Challenge completions
      'milestones',     // General milestones
      'special'         // Special/limited achievements
    ]
  },
  // Achievement criteria
  criteria: {
    type: {
      type: String,
      required: true,
      enum: [
        'budget_streak',        // Stay under budget for X months
        'savings_streak',       // Save consistently for X days
        'dashboard_streak',     // Check dashboard for X days
        'goals_completed',      // Complete X goals
        'challenges_won',       // Win X challenges
        'total_saved',          // Save total of X amount
        'expense_logged',       // Log X expenses
        'category_mastered',    // Keep category under budget X times
        'first_action',         // First time doing something
        'social_action',        // Social activity (share, invite, etc.)
        'custom'                // Custom criteria
      ]
    },
    // Target value for the criteria
    targetValue: {
      type: Number,
      required: true,
      min: 1
    },
    // Category if specific to a category
    category: String,
    // Time period in days (if applicable)
    periodDays: Number
  },
  // Badge icon/emoji
  badge: {
    type: String,
    required: true
  },
  // Badge color
  color: {
    type: String,
    default: '#FFD700'
  },
  // Points awarded
  points: {
    type: Number,
    default: 50,
    min: 0
  },
  // Rarity
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  // Order for display
  displayOrder: {
    type: Number,
    default: 0
  },
  // Is achievement active
  isActive: {
    type: Boolean,
    default: true
  },
  // Is hidden until earned
  isSecret: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
achievementSchema.index({ code: 1 });
achievementSchema.index({ category: 1, isActive: 1 });
achievementSchema.index({ rarity: 1 });

module.exports = mongoose.model('Achievement', achievementSchema);
