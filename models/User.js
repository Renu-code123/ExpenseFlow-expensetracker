const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Enhanced User Model with 2FA Support
 * Issue #338: Audit Trail & TOTP Security Suite
 */

/**
 * Badge Schema - Earned achievements/badges
 */
const earnedBadgeSchema = new mongoose.Schema({
  badgeId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏆'
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  earnedAt: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    enum: ['savings', 'budget', 'investment', 'streak', 'health', 'special']
  }
}, { _id: false });

/**
 * Financial Health History Schema
 */
const healthHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  components: {
    savingsRate: Number,
    budgetDiscipline: Number,
    debtToIncome: Number,
    emergencyFund: Number,
    investmentConsistency: Number
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 12
  },
  preferredCurrency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  locale: {
    type: String,
    default: 'en-US'
  },
  monthlyBudgetLimit: {
    type: Number,
    default: 0,
    min: 0
  },

  // ========================
  // Gamification & Health Score Fields (Issue #421)
  // ========================
  
  // XP and Level System
  gamification: {
    totalPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    levelName: {
      type: String,
      default: 'Financial Newbie'
    },
    xpToNextLevel: {
      type: Number,
      default: 100
    },
    currentLevelXp: {
      type: Number,
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    },
    lastActivityDate: {
      type: Date,
      default: Date.now
    }
  },

  // Badges/Achievements
  badges: [earnedBadgeSchema],

  // Financial Health Score
  healthScore: {
    currentScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
      default: 'C'
    },
    components: {
      savingsRate: { type: Number, default: 50, min: 0, max: 100 },
      budgetDiscipline: { type: Number, default: 50, min: 0, max: 100 },
      debtToIncome: { type: Number, default: 50, min: 0, max: 100 },
      emergencyFund: { type: Number, default: 50, min: 0, max: 100 },
      investmentConsistency: { type: Number, default: 50, min: 0, max: 100 }
    },
    history: [healthHistorySchema],
    communityPercentile: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    }
  },

  // Financial Profile for calculations
  financialProfile: {
    monthlyIncome: {
      type: Number,
      default: 0,
      min: 0
    },
    monthlyDebtPayment: {
      type: Number,
      default: 0,
      min: 0
    },
    emergencyFundTarget: {
      type: Number,
      default: 0,
      min: 0
    },
    emergencyFundCurrent: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.security.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// ========================
// Gamification Methods (Issue #421)
// ========================

/**
 * Level thresholds and names
 */
const LEVEL_CONFIG = {
  1: { name: 'Financial Newbie', xpRequired: 0 },
  2: { name: 'Budget Apprentice', xpRequired: 100 },
  3: { name: 'Savings Starter', xpRequired: 250 },
  4: { name: 'Money Manager', xpRequired: 500 },
  5: { name: 'Budget Boss', xpRequired: 1000 },
  6: { name: 'Savings Samurai', xpRequired: 2000 },
  7: { name: 'Wealth Warrior', xpRequired: 3500 },
  8: { name: 'Finance Guru', xpRequired: 5500 },
  9: { name: 'Money Master', xpRequired: 8000 },
  10: { name: 'Financial Legend', xpRequired: 12000 }
};

/**
 * Add XP points and check for level up
 */
userSchema.methods.addPoints = async function(points, reason = '') {
  this.gamification.totalPoints += points;
  this.gamification.currentLevelXp += points;
  this.gamification.lastActivityDate = new Date();

  // Check for level up
  const nextLevel = this.gamification.level + 1;
  if (LEVEL_CONFIG[nextLevel] && this.gamification.totalPoints >= LEVEL_CONFIG[nextLevel].xpRequired) {
    this.gamification.level = nextLevel;
    this.gamification.levelName = LEVEL_CONFIG[nextLevel].name;
    this.gamification.currentLevelXp = this.gamification.totalPoints - LEVEL_CONFIG[nextLevel].xpRequired;
    
    // Calculate XP needed for next level
    const levelAfterNext = nextLevel + 1;
    if (LEVEL_CONFIG[levelAfterNext]) {
      this.gamification.xpToNextLevel = LEVEL_CONFIG[levelAfterNext].xpRequired - LEVEL_CONFIG[nextLevel].xpRequired;
    }
    
    await this.save();
    return { leveledUp: true, newLevel: nextLevel, levelName: LEVEL_CONFIG[nextLevel].name };
  }

  await this.save();
  return { leveledUp: false, totalPoints: this.gamification.totalPoints };
};

/**
 * Award a badge to user
 */
userSchema.methods.awardBadge = async function(badge) {
  // Check if already has badge
  const existingBadge = this.badges.find(b => b.badgeId === badge.badgeId);
  if (existingBadge) return { awarded: false, reason: 'Already earned' };

  this.badges.push({
    badgeId: badge.badgeId,
    name: badge.name,
    icon: badge.icon,
    tier: badge.tier,
    category: badge.category,
    earnedAt: new Date()
  });

  // Award bonus XP for badge
  const tierBonus = { bronze: 25, silver: 50, gold: 100, platinum: 200, diamond: 500 };
  await this.addPoints(tierBonus[badge.tier] || 25, `Badge earned: ${badge.name}`);

  await this.save();
  return { awarded: true, badge: badge };
};

/**
 * Update streak
 */
userSchema.methods.updateStreak = async function() {
  const now = new Date();
  const lastActivity = this.gamification.lastActivityDate;
  
  if (!lastActivity) {
    this.gamification.streakDays = 1;
  } else {
    const diffDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Same day, no change
    } else if (diffDays === 1) {
      // Next day, increment streak
      this.gamification.streakDays += 1;
      
      // Bonus XP for streaks
      if (this.gamification.streakDays % 7 === 0) {
        await this.addPoints(50, '7-day streak bonus');
      }
    } else {
      // Streak broken
      this.gamification.streakDays = 1;
    }
  }

  this.gamification.lastActivityDate = now;
  await this.save();
  return this.gamification.streakDays;
};

/**
 * Get health score grade from numeric score
 */
userSchema.methods.getHealthGrade = function(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  if (score >= 30) return 'D';
  return 'F';
};

/**
 * Update health score
 */
userSchema.methods.updateHealthScore = async function(scoreData) {
  const { score, components } = scoreData;
  
  // Add to history (keep last 12 months)
  this.healthScore.history.push({
    date: new Date(),
    score: score,
    components: components
  });
  
  if (this.healthScore.history.length > 12) {
    this.healthScore.history = this.healthScore.history.slice(-12);
  }

  // Update current score
  this.healthScore.currentScore = score;
  this.healthScore.grade = this.getHealthGrade(score);
  this.healthScore.components = components;
  this.healthScore.lastCalculated = new Date();

  await this.save();
  return this.healthScore;
};

// Indexes
userSchema.index({ 'gamification.totalPoints': -1 });
userSchema.index({ 'healthScore.currentScore': -1 });
userSchema.index({ 'gamification.level': -1 });

module.exports = mongoose.model('User', userSchema);