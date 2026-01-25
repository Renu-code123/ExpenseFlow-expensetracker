const mongoose = require('mongoose');

const challengeParticipantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0,
    min: 0
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  bestStreak: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  dailyProgress: [{
    date: Date,
    value: Number,
    met: Boolean
  }]
}, { _id: false });

const challengeSchema = new mongoose.Schema({
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
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: [
      'no_spend_days',
      'category_savings',
      'budget_streak',
      'savings_goal',
      'expense_reduction',
      'custom'
    ]
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other', 'all'],
    default: 'all'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: '🎯'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  target: {
    value: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ['days', 'amount', 'percentage', 'count'],
      default: 'days'
    }
  },
  rules: {
    maxDailySpend: {
      type: Number,
      default: null
    },
    targetCategory: {
      type: String,
      default: null
    },
    comparisonPeriod: {
      type: String,
      enum: ['previous_week', 'previous_month', 'custom'],
      default: 'previous_month'
    },
    allowedExceptions: {
      type: Number,
      default: 0
    }
  },
  rewards: {
    points: {
      type: Number,
      default: 100
    },
    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    bonusForEarlyCompletion: {
      type: Number,
      default: 0
    }
  },
  participants: [challengeParticipantSchema],
  maxParticipants: {
    type: Number,
    default: null
  },
  invitedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private', 'invite_only'],
    default: 'public'
  },
  statistics: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageProgress: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
challengeSchema.index({ creator: 1, status: 1 });
challengeSchema.index({ status: 1, startDate: 1, endDate: 1 });
challengeSchema.index({ 'participants.user': 1 });
challengeSchema.index({ isPublic: 1, status: 1 });
challengeSchema.index({ type: 1, status: 1 });

// Check if challenge is active
challengeSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && now >= this.startDate && now <= this.endDate;
};

// Get participant information
challengeSchema.methods.getParticipant = function(userId) {
  return this.participants.find(p => p.user.toString() === userId.toString());
};

// Add participant
challengeSchema.methods.addParticipant = async function(userId) {
  if (this.getParticipant(userId)) {
    throw new Error('User already participating in this challenge');
  }
  
  if (this.maxParticipants && this.participants.length >= this.maxParticipants) {
    throw new Error('Challenge has reached maximum participants');
  }

  this.participants.push({
    user: userId,
    joinedAt: new Date(),
    progress: 0
  });
  
  this.statistics.totalParticipants = this.participants.length;
  await this.save();
  return this;
};

// Update participant progress
challengeSchema.methods.updateProgress = async function(userId, progress, dailyData = null) {
  const participant = this.getParticipant(userId);
  if (!participant) {
    throw new Error('User is not participating in this challenge');
  }

  participant.progress = Math.max(participant.progress, progress);
  
  if (dailyData) {
    participant.dailyProgress.push(dailyData);
    if (dailyData.met) {
      participant.currentStreak++;
      participant.bestStreak = Math.max(participant.bestStreak, participant.currentStreak);
    } else {
      participant.currentStreak = 0;
    }
  }

  // Check if completed
  if (participant.progress >= this.target.value && !participant.completed) {
    participant.completed = true;
    participant.completedAt = new Date();
  }

  // Update statistics
  this.updateStatistics();
  await this.save();
  return participant;
};

// Update challenge statistics
challengeSchema.methods.updateStatistics = function() {
  const activeParticipants = this.participants.filter(p => p.progress > 0);
  const completedCount = this.participants.filter(p => p.completed).length;
  
  this.statistics.totalParticipants = this.participants.length;
  this.statistics.completionRate = this.participants.length > 0 
    ? (completedCount / this.participants.length) * 100 
    : 0;
  this.statistics.averageProgress = activeParticipants.length > 0
    ? activeParticipants.reduce((sum, p) => sum + p.progress, 0) / activeParticipants.length
    : 0;
};

// Get leaderboard
challengeSchema.methods.getLeaderboard = function(limit = 10) {
  return this.participants
    .sort((a, b) => {
      if (b.completed !== a.completed) return b.completed ? 1 : -1;
      if (b.progress !== a.progress) return b.progress - a.progress;
      return a.completedAt - b.completedAt;
    })
    .slice(0, limit);
};

// Static method to get active challenges for user
challengeSchema.statics.getActiveForUser = async function(userId) {
  const now = new Date();
  return await this.find({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
    'participants.user': userId
  }).populate('creator', 'name email');
};

// Static method to get public challenges
challengeSchema.statics.getPublicChallenges = async function(options = {}) {
  const { page = 1, limit = 20, type, status = 'active' } = options;
  const query = { isPublic: true, status };
  
  if (type) query.type = type;

  return await this.find(query)
    .populate('creator', 'name')
    .sort({ 'statistics.totalParticipants': -1, createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Pre-defined challenge templates
challengeSchema.statics.getTemplates = function() {
  return [
    {
      name: 'No Spend Days Challenge',
      description: 'Complete days with zero discretionary spending. Build discipline and awareness of your spending habits.',
      type: 'no_spend_days',
      icon: '🚫',
      target: { value: 7, unit: 'days' },
      rules: { maxDailySpend: 0, allowedExceptions: 1 },
      rewards: { points: 150 }
    },
    {
      name: 'Coffee Shop Savings',
      description: 'Reduce your coffee shop expenses by making coffee at home. Track your daily savings!',
      type: 'category_savings',
      icon: '☕',
      category: 'food',
      target: { value: 50, unit: 'percentage' },
      rules: { targetCategory: 'food', comparisonPeriod: 'previous_month' },
      rewards: { points: 200 }
    },
    {
      name: 'Meal Prep Month',
      description: 'Cut food delivery costs by planning and preparing meals. Save money and eat healthier!',
      type: 'expense_reduction',
      icon: '🍳',
      category: 'food',
      target: { value: 30, unit: 'percentage' },
      rules: { targetCategory: 'food', comparisonPeriod: 'previous_month' },
      rewards: { points: 250 }
    },
    {
      name: 'Budget Streak Master',
      description: 'Stay under your daily budget for consecutive days. Build a lasting habit!',
      type: 'budget_streak',
      icon: '🔥',
      target: { value: 30, unit: 'days' },
      rewards: { points: 300 }
    },
    {
      name: 'Entertainment Diet',
      description: 'Reduce entertainment spending by finding free alternatives and being mindful.',
      type: 'category_savings',
      icon: '🎬',
      category: 'entertainment',
      target: { value: 40, unit: 'percentage' },
      rules: { targetCategory: 'entertainment', comparisonPeriod: 'previous_month' },
      rewards: { points: 175 }
    }
  ];
};

module.exports = mongoose.model('Challenge', challengeSchema);
