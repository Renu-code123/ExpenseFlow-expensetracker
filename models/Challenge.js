const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
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
  completedDays: [{
    date: Date,
    value: Number
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'withdrawn'],
    default: 'active'
  },
  completedAt: Date,
  savedAmount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const challengeSchema = new mongoose.Schema({
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
  type: {
    type: String,
    required: true,
    enum: [
      'no_spend',           // No spending days challenge
      'category_reduction', // Reduce spending in a category
      'savings_target',     // Save a specific amount
      'streak',             // Maintain a behavior streak
      'budget_adherence',   // Stay under budget
      'custom'              // User-defined challenge
    ]
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'coffee', 'dining', 'other', 'all'],
    default: 'all'
  },
  targetValue: {
    type: Number,
    required: true,
    min: 0
  },
  targetUnit: {
    type: String,
    enum: ['days', 'amount', 'percentage', 'count'],
    default: 'days'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
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
  isSystemChallenge: {
    type: Boolean,
    default: false
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'extreme'],
    default: 'medium'
  },
  rewardPoints: {
    type: Number,
    default: 100
  },
  rewardBadge: {
    type: String,
    default: null
  },
  participants: [participantSchema],
  maxParticipants: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  invitedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  rules: {
    type: String,
    maxlength: 1000
  },
  icon: {
    type: String,
    default: '🎯'
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  }
}, {
  timestamps: true
});

// Indexes
challengeSchema.index({ creator: 1, status: 1 });
challengeSchema.index({ isPublic: 1, status: 1, startDate: 1 });
challengeSchema.index({ 'participants.user': 1, status: 1 });
challengeSchema.index({ endDate: 1, status: 1 });

// Virtual for participant count
challengeSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Check if user is participant
challengeSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

// Get participant data
challengeSchema.methods.getParticipant = function(userId) {
  return this.participants.find(p => p.user.toString() === userId.toString());
};

// Calculate days remaining
challengeSchema.methods.getDaysRemaining = function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diffTime = end - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

module.exports = mongoose.model('Challenge', challengeSchema);
