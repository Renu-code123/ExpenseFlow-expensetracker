const mongoose = require('mongoose');

// Challenge Schema - For financial challenges users can participate in
const challengeSchema = new mongoose.Schema({
  // Challenge creator (null for system challenges)
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Challenge details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  // Challenge type
  type: {
    type: String,
    required: true,
    enum: [
      'no_spend',           // No spending for X days
      'savings_target',     // Save X amount
      'budget_under',       // Stay under budget
      'category_limit',     // Limit spending in category
      'streak',             // Maintain streak for X days
      'reduction',          // Reduce spending by X%
      'custom'              // Custom challenge
    ]
  },
  // Challenge scope
  scope: {
    type: String,
    enum: ['personal', 'friends', 'public', 'workspace'],
    default: 'personal'
  },
  // Challenge parameters
  config: {
    // Target amount (for savings, limits)
    targetAmount: {
      type: Number,
      min: 0
    },
    // Target percentage (for reduction challenges)
    targetPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    // Category to track (for category-specific challenges)
    category: {
      type: String,
      enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other', 'all']
    },
    // Comparison period for reduction (in days)
    comparisonPeriod: {
      type: Number,
      default: 30
    },
    // Streak requirement
    streakDays: {
      type: Number,
      min: 1
    }
  },
  // Challenge timing
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  // Challenge status
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  // System challenge flag
  isSystemChallenge: {
    type: Boolean,
    default: false
  },
  // Challenge rewards
  rewards: {
    points: {
      type: Number,
      default: 100
    },
    badge: {
      type: String
    },
    achievements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    }]
  },
  // Challenge icon/emoji
  icon: {
    type: String,
    default: '🎯'
  },
  // Difficulty
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'extreme'],
    default: 'medium'
  },
  // Tags
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  // Privacy for leaderboard
  showOnLeaderboard: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
challengeSchema.index({ status: 1, startDate: 1 });
challengeSchema.index({ creator: 1, status: 1 });
challengeSchema.index({ scope: 1, status: 1 });
challengeSchema.index({ type: 1, status: 1 });

// Virtual for duration in days
challengeSchema.virtual('durationDays').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for days remaining
challengeSchema.virtual('daysRemaining').get(function() {
  if (this.status !== 'active') return 0;
  const now = new Date();
  if (now > this.endDate) return 0;
  return Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24));
});

// Check if challenge is active
challengeSchema.methods.isActive = function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate && this.status === 'active';
};

module.exports = mongoose.model('Challenge', challengeSchema);
