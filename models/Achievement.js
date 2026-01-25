const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  icon: {
    type: String,
    required: true,
    default: '🏆'
  },
  category: {
    type: String,
    required: true,
    enum: ['budget', 'savings', 'streak', 'social', 'goals', 'analytics', 'milestones', 'special']
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  points: {
    type: Number,
    required: true,
    default: 100,
    min: 0
  },
  criteria: {
    type: {
      type: String,
      required: true,
      enum: [
        'budget_under_streak',
        'savings_amount',
        'savings_streak',
        'expense_count',
        'category_tracking',
        'goal_achieved',
        'goals_count',
        'challenge_completed',
        'challenges_count',
        'login_streak',
        'dashboard_visits',
        'friend_invites',
        'first_action',
        'custom'
      ]
    },
    threshold: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['days', 'count', 'amount', 'percentage'],
      default: 'count'
    },
    category: {
      type: String,
      default: null
    },
    timeframe: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'all_time'],
      default: 'all_time'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSecret: {
    type: Boolean,
    default: false
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }],
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  earnedCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
achievementSchema.index({ category: 1, isActive: 1 });
achievementSchema.index({ tier: 1 });
achievementSchema.index({ 'criteria.type': 1 });

// Get tier color
achievementSchema.methods.getTierColor = function() {
  const colors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF'
  };
  return colors[this.tier] || colors.bronze;
};

// Static method to get default achievements
achievementSchema.statics.getDefaultAchievements = function() {
  return [
    // Budget achievements
    {
      name: 'Budget Beginner',
      description: 'Stay under budget for 7 consecutive days',
      icon: '📊',
      category: 'budget',
      tier: 'bronze',
      points: 50,
      criteria: { type: 'budget_under_streak', threshold: 7, unit: 'days' },
      rarity: 'common'
    },
    {
      name: 'Budget Master',
      description: 'Stay under budget for 3 consecutive months',
      icon: '🏆',
      category: 'budget',
      tier: 'gold',
      points: 500,
      criteria: { type: 'budget_under_streak', threshold: 90, unit: 'days' },
      rarity: 'rare'
    },
    {
      name: 'Budget Legend',
      description: 'Stay under budget for a full year',
      icon: '👑',
      category: 'budget',
      tier: 'diamond',
      points: 2000,
      criteria: { type: 'budget_under_streak', threshold: 365, unit: 'days' },
      rarity: 'legendary'
    },

    // Savings achievements
    {
      name: 'First Savings',
      description: 'Save your first ₹1,000',
      icon: '💰',
      category: 'savings',
      tier: 'bronze',
      points: 25,
      criteria: { type: 'savings_amount', threshold: 1000, unit: 'amount' },
      rarity: 'common'
    },
    {
      name: 'Savings Streak',
      description: 'Save consistently for 30 consecutive days',
      icon: '💎',
      category: 'savings',
      tier: 'silver',
      points: 200,
      criteria: { type: 'savings_streak', threshold: 30, unit: 'days' },
      rarity: 'uncommon'
    },
    {
      name: 'Savings Champion',
      description: 'Save ₹50,000 total',
      icon: '🏅',
      category: 'savings',
      tier: 'gold',
      points: 400,
      criteria: { type: 'savings_amount', threshold: 50000, unit: 'amount' },
      rarity: 'rare'
    },
    {
      name: 'Savings Millionaire',
      description: 'Save ₹10,00,000 total',
      icon: '💵',
      category: 'savings',
      tier: 'diamond',
      points: 2500,
      criteria: { type: 'savings_amount', threshold: 1000000, unit: 'amount' },
      rarity: 'legendary'
    },

    // Goal achievements
    {
      name: 'Goal Setter',
      description: 'Create your first financial goal',
      icon: '🎯',
      category: 'goals',
      tier: 'bronze',
      points: 25,
      criteria: { type: 'first_action', threshold: 1, unit: 'count' },
      rarity: 'common'
    },
    {
      name: 'Goal Crusher',
      description: 'Achieve 5 financial goals',
      icon: '🎯',
      category: 'goals',
      tier: 'gold',
      points: 350,
      criteria: { type: 'goals_count', threshold: 5, unit: 'count' },
      rarity: 'rare'
    },
    {
      name: 'Dream Achiever',
      description: 'Complete 20 financial goals',
      icon: '🌟',
      category: 'goals',
      tier: 'platinum',
      points: 1000,
      criteria: { type: 'goals_count', threshold: 20, unit: 'count' },
      rarity: 'epic'
    },

    // Analytics achievements
    {
      name: 'Data Explorer',
      description: 'View your analytics dashboard',
      icon: '📈',
      category: 'analytics',
      tier: 'bronze',
      points: 15,
      criteria: { type: 'first_action', threshold: 1, unit: 'count' },
      rarity: 'common'
    },
    {
      name: 'Analytics Pro',
      description: 'Check your dashboard 7 days in a row',
      icon: '📊',
      category: 'analytics',
      tier: 'silver',
      points: 150,
      criteria: { type: 'dashboard_visits', threshold: 7, unit: 'days', timeframe: 'daily' },
      rarity: 'uncommon'
    },
    {
      name: 'Insights Master',
      description: 'Check your dashboard 30 days in a row',
      icon: '🔍',
      category: 'analytics',
      tier: 'gold',
      points: 400,
      criteria: { type: 'dashboard_visits', threshold: 30, unit: 'days' },
      rarity: 'rare'
    },

    // Streak achievements
    {
      name: 'Getting Started',
      description: 'Log expenses for 3 consecutive days',
      icon: '🔥',
      category: 'streak',
      tier: 'bronze',
      points: 20,
      criteria: { type: 'login_streak', threshold: 3, unit: 'days' },
      rarity: 'common'
    },
    {
      name: 'Week Warrior',
      description: 'Log expenses for 7 consecutive days',
      icon: '⚡',
      category: 'streak',
      tier: 'bronze',
      points: 50,
      criteria: { type: 'login_streak', threshold: 7, unit: 'days' },
      rarity: 'common'
    },
    {
      name: 'Month Master',
      description: 'Log expenses for 30 consecutive days',
      icon: '🌟',
      category: 'streak',
      tier: 'silver',
      points: 200,
      criteria: { type: 'login_streak', threshold: 30, unit: 'days' },
      rarity: 'uncommon'
    },
    {
      name: 'Dedication King',
      description: 'Maintain a 100-day logging streak',
      icon: '👑',
      category: 'streak',
      tier: 'gold',
      points: 500,
      criteria: { type: 'login_streak', threshold: 100, unit: 'days' },
      rarity: 'rare'
    },
    {
      name: 'Year Long Champion',
      description: 'Maintain a 365-day logging streak',
      icon: '🏆',
      category: 'streak',
      tier: 'diamond',
      points: 2000,
      criteria: { type: 'login_streak', threshold: 365, unit: 'days' },
      rarity: 'legendary'
    },

    // Social achievements
    {
      name: 'Social Butterfly',
      description: 'Invite your first friend',
      icon: '🦋',
      category: 'social',
      tier: 'bronze',
      points: 30,
      criteria: { type: 'friend_invites', threshold: 1, unit: 'count' },
      rarity: 'common'
    },
    {
      name: 'Team Player',
      description: 'Complete a challenge with friends',
      icon: '🤝',
      category: 'social',
      tier: 'silver',
      points: 150,
      criteria: { type: 'challenge_completed', threshold: 1, unit: 'count' },
      rarity: 'uncommon'
    },
    {
      name: 'Challenge Champion',
      description: 'Complete 10 challenges',
      icon: '🏅',
      category: 'social',
      tier: 'gold',
      points: 400,
      criteria: { type: 'challenges_count', threshold: 10, unit: 'count' },
      rarity: 'rare'
    },

    // Milestone achievements
    {
      name: 'First Expense',
      description: 'Log your first expense',
      icon: '✨',
      category: 'milestones',
      tier: 'bronze',
      points: 10,
      criteria: { type: 'expense_count', threshold: 1, unit: 'count' },
      rarity: 'common'
    },
    {
      name: 'Expense Tracker',
      description: 'Log 100 expenses',
      icon: '📝',
      category: 'milestones',
      tier: 'silver',
      points: 100,
      criteria: { type: 'expense_count', threshold: 100, unit: 'count' },
      rarity: 'uncommon'
    },
    {
      name: 'Expense Expert',
      description: 'Log 1,000 expenses',
      icon: '📚',
      category: 'milestones',
      tier: 'gold',
      points: 500,
      criteria: { type: 'expense_count', threshold: 1000, unit: 'count' },
      rarity: 'rare'
    },
    {
      name: 'Category Master',
      description: 'Track expenses in all categories',
      icon: '🎨',
      category: 'milestones',
      tier: 'silver',
      points: 150,
      criteria: { type: 'category_tracking', threshold: 7, unit: 'count' },
      rarity: 'uncommon'
    }
  ];
};

module.exports = mongoose.model('Achievement', achievementSchema);
