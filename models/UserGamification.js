const mongoose = require('mongoose');

// User Gamification Profile Schema
const userGamificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Points system
  points: {
    total: {
      type: Number,
      default: 0
    },
    currentMonth: {
      type: Number,
      default: 0
    },
    lastMonthReset: {
      type: Date,
      default: Date.now
    }
  },
  // Level system
  level: {
    current: {
      type: Number,
      default: 1
    },
    experience: {
      type: Number,
      default: 0
    },
    experienceToNext: {
      type: Number,
      default: 100
    }
  },
  // Streaks
  streaks: {
    // Budget streak (days under budget)
    budget: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastUpdated: Date
    },
    // Savings streak (days with savings)
    savings: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastUpdated: Date
    },
    // Dashboard login streak
    login: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastUpdated: Date
    },
    // Expense logging streak
    logging: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastUpdated: Date
    }
  },
  // Statistics
  stats: {
    challengesJoined: { type: Number, default: 0 },
    challengesCompleted: { type: Number, default: 0 },
    challengesWon: { type: Number, default: 0 },
    achievementsEarned: { type: Number, default: 0 },
    goalsCompleted: { type: Number, default: 0 },
    totalSaved: { type: Number, default: 0 },
    monthsUnderBudget: { type: Number, default: 0 }
  },
  // Leaderboard settings
  leaderboard: {
    showOnPublic: {
      type: Boolean,
      default: true
    },
    showProgress: {
      type: Boolean,
      default: true
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 50
    }
  },
  // Badges earned (achievement IDs for quick display)
  badges: [{
    achievement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    earnedAt: Date
  }],
  // Featured badges (up to 5 to show on profile)
  featuredBadges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }],
  // Last activity
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index
userGamificationSchema.index({ user: 1 });
userGamificationSchema.index({ 'points.total': -1 });
userGamificationSchema.index({ 'points.currentMonth': -1 });
userGamificationSchema.index({ 'level.current': -1 });

// Calculate level from experience
userGamificationSchema.methods.calculateLevel = function() {
  // Level formula: each level requires (level * 100) XP
  let totalXpNeeded = 0;
  let level = 1;
  
  while (totalXpNeeded + (level * 100) <= this.level.experience) {
    totalXpNeeded += level * 100;
    level++;
  }
  
  this.level.current = level;
  this.level.experienceToNext = (level * 100) - (this.level.experience - totalXpNeeded);
  
  return this.level;
};

// Add points
userGamificationSchema.methods.addPoints = function(points, reason) {
  this.points.total += points;
  this.points.currentMonth += points;
  this.level.experience += points;
  this.calculateLevel();
};

// Update streak
userGamificationSchema.methods.updateStreak = function(streakType, achieved) {
  if (!this.streaks[streakType]) return;
  
  const streak = this.streaks[streakType];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastUpdate = streak.lastUpdated ? new Date(streak.lastUpdated) : null;
  if (lastUpdate) {
    lastUpdate.setHours(0, 0, 0, 0);
  }

  // Check if this is a new day
  if (!lastUpdate || today > lastUpdate) {
    if (achieved) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (!lastUpdate || lastUpdate.getTime() === yesterday.getTime()) {
        streak.current++;
      } else {
        streak.current = 1;
      }
      
      if (streak.current > streak.longest) {
        streak.longest = streak.current;
      }
    } else {
      streak.current = 0;
    }
    
    streak.lastUpdated = today;
  }

  return streak;
};

// Reset monthly points (called by cron)
userGamificationSchema.methods.resetMonthlyPoints = function() {
  const now = new Date();
  const lastReset = this.points.lastMonthReset;
  
  if (!lastReset || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    this.points.currentMonth = 0;
    this.points.lastMonthReset = now;
  }
};

// Get rank title based on level
userGamificationSchema.virtual('rankTitle').get(function() {
  const level = this.level.current;
  if (level >= 50) return 'Finance Legend';
  if (level >= 40) return 'Money Master';
  if (level >= 30) return 'Budget Expert';
  if (level >= 20) return 'Savings Pro';
  if (level >= 15) return 'Expense Tracker';
  if (level >= 10) return 'Budget Warrior';
  if (level >= 5) return 'Money Rookie';
  return 'Finance Beginner';
});

module.exports = mongoose.model('UserGamification', userGamificationSchema);
