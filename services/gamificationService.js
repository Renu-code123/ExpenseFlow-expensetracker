const Challenge = require('../models/Challenge');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const ChallengeParticipant = require('../models/ChallengeParticipant');
const UserGamification = require('../models/UserGamification');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const notificationService = require('./notificationService');

// Default achievements to seed
const DEFAULT_ACHIEVEMENTS = [
  {
    code: 'BUDGET_MASTER',
    name: 'Budget Master',
    description: 'Stay under budget for 3 consecutive months',
    category: 'budgeting',
    criteria: { type: 'budget_streak', targetValue: 90 }, // 90 days
    badge: '🏆',
    color: '#FFD700',
    points: 500,
    rarity: 'epic'
  },
  {
    code: 'SAVINGS_STREAK',
    name: 'Savings Streak',
    description: 'Save consistently for 30 days in a row',
    category: 'savings',
    criteria: { type: 'savings_streak', targetValue: 30 },
    badge: '💎',
    color: '#00D4FF',
    points: 300,
    rarity: 'rare'
  },
  {
    code: 'ANALYTICS_PRO',
    name: 'Analytics Pro',
    description: 'Check your dashboard 7 days in a row',
    category: 'analytics',
    criteria: { type: 'dashboard_streak', targetValue: 7 },
    badge: '📊',
    color: '#9B59B6',
    points: 100,
    rarity: 'common'
  },
  {
    code: 'GOAL_CRUSHER',
    name: 'Goal Crusher',
    description: 'Achieve 5 financial goals',
    category: 'goals',
    criteria: { type: 'goals_completed', targetValue: 5 },
    badge: '🎯',
    color: '#E74C3C',
    points: 400,
    rarity: 'rare'
  },
  {
    code: 'FIRST_EXPENSE',
    name: 'First Steps',
    description: 'Log your first expense',
    category: 'milestones',
    criteria: { type: 'expense_logged', targetValue: 1 },
    badge: '🚀',
    color: '#3498DB',
    points: 10,
    rarity: 'common'
  },
  {
    code: 'EXPENSE_CENTURION',
    name: 'Expense Centurion',
    description: 'Log 100 expenses',
    category: 'milestones',
    criteria: { type: 'expense_logged', targetValue: 100 },
    badge: '💯',
    color: '#2ECC71',
    points: 200,
    rarity: 'uncommon'
  },
  {
    code: 'CHALLENGE_CHAMPION',
    name: 'Challenge Champion',
    description: 'Win 3 challenges',
    category: 'challenges',
    criteria: { type: 'challenges_won', targetValue: 3 },
    badge: '🏅',
    color: '#F39C12',
    points: 350,
    rarity: 'rare'
  },
  {
    code: 'FIRST_GOAL',
    name: 'Goal Setter',
    description: 'Complete your first financial goal',
    category: 'goals',
    criteria: { type: 'goals_completed', targetValue: 1 },
    badge: '🎖️',
    color: '#1ABC9C',
    points: 50,
    rarity: 'common'
  },
  {
    code: 'WEEKLY_WARRIOR',
    name: 'Weekly Warrior',
    description: 'Log expenses every day for a week',
    category: 'streaks',
    criteria: { type: 'dashboard_streak', targetValue: 7 },
    badge: '⚔️',
    color: '#8E44AD',
    points: 75,
    rarity: 'common'
  },
  {
    code: 'MONTHLY_MASTER',
    name: 'Monthly Master',
    description: 'Track expenses every day for a month',
    category: 'streaks',
    criteria: { type: 'dashboard_streak', targetValue: 30 },
    badge: '👑',
    color: '#E67E22',
    points: 250,
    rarity: 'uncommon'
  },
  {
    code: 'SAVER_SUPREME',
    name: 'Saver Supreme',
    description: 'Save a total of ₹50,000',
    category: 'savings',
    criteria: { type: 'total_saved', targetValue: 50000 },
    badge: '💰',
    color: '#27AE60',
    points: 600,
    rarity: 'epic'
  },
  {
    code: 'FOOD_FRUGAL',
    name: 'Food Frugal',
    description: 'Stay under food budget for 3 months',
    category: 'budgeting',
    criteria: { type: 'category_mastered', targetValue: 90, category: 'food' },
    badge: '🍽️',
    color: '#D35400',
    points: 200,
    rarity: 'uncommon'
  }
];

// Default system challenges
const DEFAULT_CHALLENGES = [
  {
    title: 'No Spend Weekend',
    description: 'Avoid all non-essential spending for an entire weekend',
    type: 'no_spend',
    config: { targetAmount: 0, streakDays: 2 },
    difficulty: 'easy',
    icon: '🚫',
    rewards: { points: 50 },
    tags: ['weekend', 'no-spend', 'beginner']
  },
  {
    title: 'Coffee Shop Savings',
    description: 'Reduce your coffee shop expenses by 50% this month',
    type: 'reduction',
    config: { targetPercentage: 50, category: 'food', comparisonPeriod: 30 },
    difficulty: 'medium',
    icon: '☕',
    rewards: { points: 150 },
    tags: ['coffee', 'savings', 'food']
  },
  {
    title: 'Meal Prep Month',
    description: 'Reduce food delivery expenses by 75% this month',
    type: 'reduction',
    config: { targetPercentage: 75, category: 'food', comparisonPeriod: 30 },
    difficulty: 'hard',
    icon: '🥗',
    rewards: { points: 300 },
    tags: ['meal-prep', 'food', 'health']
  },
  {
    title: '7-Day Savings Sprint',
    description: 'Save at least ₹500 every day for 7 days',
    type: 'savings_target',
    config: { targetAmount: 3500, streakDays: 7 },
    difficulty: 'medium',
    icon: '🏃',
    rewards: { points: 200 },
    tags: ['savings', 'sprint', 'weekly']
  },
  {
    title: 'Budget Guardian',
    description: 'Stay under your total budget for 30 days',
    type: 'budget_under',
    config: { streakDays: 30 },
    difficulty: 'hard',
    icon: '🛡️',
    rewards: { points: 400 },
    tags: ['budget', 'monthly', 'discipline']
  }
];

class GamificationService {
  /**
   * Initialize gamification profile for a user
   */
  async initUserProfile(userId) {
    let profile = await UserGamification.findOne({ user: userId });
    
    if (!profile) {
      profile = new UserGamification({ user: userId });
      await profile.save();
    }
    
    return profile;
  }

  /**
   * Get user's gamification profile
   */
  async getUserProfile(userId) {
    let profile = await UserGamification.findOne({ user: userId })
      .populate('featuredBadges')
      .populate('badges.achievement');
    
    if (!profile) {
      profile = await this.initUserProfile(userId);
    }
    
    return profile;
  }

  /**
   * Add points to user
   */
  async addPoints(userId, points, reason) {
    const profile = await this.getUserProfile(userId);
    profile.addPoints(points, reason);
    profile.lastActivityAt = new Date();
    await profile.save();
    
    // Emit real-time update
    if (global.io) {
      global.io.to(`user_${userId}`).emit('points_earned', {
        points,
        reason,
        totalPoints: profile.points.total,
        level: profile.level
      });
    }
    
    return profile;
  }

  /**
   * Update user streak
   */
  async updateStreak(userId, streakType, achieved) {
    const profile = await this.getUserProfile(userId);
    profile.updateStreak(streakType, achieved);
    await profile.save();
    
    // Check for streak-based achievements
    await this.checkAchievements(userId);
    
    return profile.streaks[streakType];
  }

  /**
   * Seed default achievements
   */
  async seedAchievements() {
    for (const achievement of DEFAULT_ACHIEVEMENTS) {
      const exists = await Achievement.findOne({ code: achievement.code });
      if (!exists) {
        await Achievement.create(achievement);
        console.log(`[Gamification] Created achievement: ${achievement.code}`);
      }
    }
  }

  /**
   * Get all achievements
   */
  async getAchievements(options = {}) {
    const { category, rarity, includeSecret = false } = options;
    
    const query = { isActive: true };
    if (category) query.category = category;
    if (rarity) query.rarity = rarity;
    if (!includeSecret) query.isSecret = false;
    
    return await Achievement.find(query).sort({ displayOrder: 1, rarity: 1 });
  }

  /**
   * Get user's achievement progress
   */
  async getUserAchievements(userId, options = {}) {
    const { status, category } = options;
    
    const query = { user: userId };
    if (status) query.status = status;
    
    let achievements = await UserAchievement.find(query)
      .populate('achievement')
      .sort({ completedAt: -1, updatedAt: -1 });
    
    if (category) {
      achievements = achievements.filter(ua => ua.achievement.category === category);
    }
    
    return achievements;
  }

  /**
   * Check and award achievements for a user
   */
  async checkAchievements(userId) {
    const profile = await this.getUserProfile(userId);
    const achievements = await Achievement.find({ isActive: true });
    const earnedAchievements = [];
    
    for (const achievement of achievements) {
      // Check if already completed
      let userAchievement = await UserAchievement.findOne({
        user: userId,
        achievement: achievement._id
      });
      
      if (userAchievement?.status === 'completed') continue;
      
      // Calculate progress
      const progress = await this.calculateAchievementProgress(userId, achievement, profile);
      
      if (!userAchievement) {
        userAchievement = new UserAchievement({
          user: userId,
          achievement: achievement._id,
          progress: { current: progress, target: achievement.criteria.targetValue }
        });
      } else {
        userAchievement.progress.current = progress;
      }
      
      // Check if completed
      if (progress >= achievement.criteria.targetValue && userAchievement.status !== 'completed') {
        userAchievement.status = 'completed';
        userAchievement.completedAt = new Date();
        
        // Award points
        await this.addPoints(userId, achievement.points, `Achievement: ${achievement.name}`);
        
        // Add badge to profile
        profile.badges.push({
          achievement: achievement._id,
          earnedAt: new Date()
        });
        profile.stats.achievementsEarned++;
        await profile.save();
        
        earnedAchievements.push(achievement);
        
        // Send notification
        await notificationService.sendNotification(userId, {
          title: 'Achievement Unlocked!',
          message: `Congratulations! You've earned the "${achievement.name}" badge! ${achievement.badge}`,
          type: 'achievement_earned',
          priority: 'high',
          data: {
            achievementId: achievement._id,
            badge: achievement.badge,
            points: achievement.points
          }
        });
      }
      
      await userAchievement.save();
    }
    
    return earnedAchievements;
  }

  /**
   * Calculate progress for an achievement
   */
  async calculateAchievementProgress(userId, achievement, profile) {
    const { type, targetValue, category } = achievement.criteria;
    
    switch (type) {
      case 'budget_streak':
        return profile.streaks.budget.current;
        
      case 'savings_streak':
        return profile.streaks.savings.current;
        
      case 'dashboard_streak':
        return profile.streaks.login.current;
        
      case 'goals_completed':
        return profile.stats.goalsCompleted;
        
      case 'challenges_won':
        return profile.stats.challengesWon;
        
      case 'total_saved':
        return profile.stats.totalSaved;
        
      case 'expense_logged':
        const expenseCount = await Expense.countDocuments({ user: userId });
        return expenseCount;
        
      case 'category_mastered':
        // This would need more complex logic based on budget history
        return profile.stats.monthsUnderBudget;
        
      default:
        return 0;
    }
  }

  // ========== CHALLENGE METHODS ==========

  /**
   * Create a new challenge
   */
  async createChallenge(userId, data) {
    const challenge = new Challenge({
      ...data,
      creator: userId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate)
    });
    
    await challenge.save();
    
    // If starting now or in past, set to active
    if (new Date(challenge.startDate) <= new Date()) {
      challenge.status = 'active';
      await challenge.save();
    }
    
    return challenge;
  }

  /**
   * Get available challenges
   */
  async getChallenges(options = {}) {
    const { status, scope, type, userId } = options;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    
    // Scope filtering
    if (scope) {
      query.scope = scope;
    } else if (userId) {
      // Show personal (own), public, and workspace challenges
      query.$or = [
        { scope: 'public' },
        { scope: 'personal', creator: userId },
        { isSystemChallenge: true }
      ];
    }
    
    return await Challenge.find(query)
      .populate('creator', 'name')
      .sort({ startDate: -1 });
  }

  /**
   * Get challenge by ID
   */
  async getChallengeById(challengeId) {
    return await Challenge.findById(challengeId).populate('creator', 'name');
  }

  /**
   * Join a challenge
   */
  async joinChallenge(userId, challengeId) {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    
    if (challenge.status !== 'active' && challenge.status !== 'upcoming') {
      throw new Error('Challenge is not available to join');
    }
    
    // Check if already joined
    const existing = await ChallengeParticipant.findOne({
      challenge: challengeId,
      user: userId
    });
    
    if (existing) {
      throw new Error('Already joined this challenge');
    }
    
    // Calculate target based on challenge type
    let target = 0;
    switch (challenge.type) {
      case 'no_spend':
        target = challenge.config.streakDays || 1;
        break;
      case 'savings_target':
        target = challenge.config.targetAmount || 0;
        break;
      case 'budget_under':
        target = challenge.config.streakDays || 30;
        break;
      case 'reduction':
        target = 100; // Progress percentage
        break;
      case 'streak':
        target = challenge.config.streakDays || 7;
        break;
      default:
        target = challenge.config.targetAmount || 100;
    }
    
    const participant = new ChallengeParticipant({
      challenge: challengeId,
      user: userId,
      status: challenge.status === 'active' ? 'active' : 'joined',
      progress: { current: 0, target }
    });
    
    await participant.save();
    
    // Update user stats
    const profile = await this.getUserProfile(userId);
    profile.stats.challengesJoined++;
    await profile.save();
    
    // Send notification
    await notificationService.sendNotification(userId, {
      title: 'Challenge Joined!',
      message: `You've joined the "${challenge.title}" challenge! ${challenge.icon}`,
      type: 'challenge_joined',
      priority: 'medium',
      data: { challengeId }
    });
    
    return participant;
  }

  /**
   * Leave a challenge
   */
  async leaveChallenge(userId, challengeId) {
    const participant = await ChallengeParticipant.findOne({
      challenge: challengeId,
      user: userId
    });
    
    if (!participant) {
      throw new Error('Not participating in this challenge');
    }
    
    participant.status = 'withdrawn';
    await participant.save();
    
    return participant;
  }

  /**
   * Update challenge progress for a user
   */
  async updateChallengeProgress(userId, challengeId, progressUpdate) {
    const participant = await ChallengeParticipant.findOne({
      challenge: challengeId,
      user: userId,
      status: 'active'
    });
    
    if (!participant) {
      throw new Error('Not actively participating in this challenge');
    }
    
    const challenge = await Challenge.findById(challengeId);
    
    // Update progress
    if (progressUpdate.increment) {
      participant.progress.current += progressUpdate.increment;
    } else if (progressUpdate.set !== undefined) {
      participant.progress.current = progressUpdate.set;
    }
    
    // Update daily progress
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayProgress = participant.progress.dailyProgress.find(
      dp => new Date(dp.date).getTime() === today.getTime()
    );
    
    if (todayProgress) {
      todayProgress.value = progressUpdate.dailyValue || participant.progress.current;
      todayProgress.achieved = progressUpdate.achieved || false;
    } else {
      participant.progress.dailyProgress.push({
        date: today,
        value: progressUpdate.dailyValue || participant.progress.current,
        achieved: progressUpdate.achieved || false
      });
    }
    
    // Update streak
    if (progressUpdate.achieved !== undefined) {
      participant.updateStreak(progressUpdate.achieved);
    }
    
    // Check if completed
    if (participant.hasCompleted() && participant.status !== 'completed') {
      participant.status = 'completed';
      participant.completedAt = new Date();
      participant.pointsEarned = challenge.rewards.points;
      
      // Award points
      await this.addPoints(userId, challenge.rewards.points, `Challenge completed: ${challenge.title}`);
      
      // Update user stats
      const profile = await this.getUserProfile(userId);
      profile.stats.challengesCompleted++;
      await profile.save();
      
      // Send notification
      await notificationService.sendNotification(userId, {
        title: 'Challenge Completed!',
        message: `Congratulations! You've completed the "${challenge.title}" challenge! 🎉`,
        type: 'challenge_completed',
        priority: 'high',
        data: { challengeId, points: challenge.rewards.points }
      });
      
      // Check achievements
      await this.checkAchievements(userId);
    }
    
    await participant.save();
    return participant;
  }

  /**
   * Get user's challenge participations
   */
  async getUserChallenges(userId, options = {}) {
    const { status } = options;
    
    const query = { user: userId };
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    
    return await ChallengeParticipant.find(query)
      .populate('challenge')
      .sort({ updatedAt: -1 });
  }

  /**
   * Get leaderboard for a challenge
   */
  async getChallengeLeaderboard(challengeId, limit = 10) {
    const participants = await ChallengeParticipant.find({
      challenge: challengeId,
      showProgress: true,
      status: { $in: ['active', 'completed'] }
    })
      .populate('user', 'name')
      .sort({ 'progress.current': -1, completedAt: 1 })
      .limit(limit);
    
    return participants.map((p, index) => ({
      rank: index + 1,
      user: {
        id: p.user._id,
        name: p.user.name
      },
      progress: p.progressPercentage,
      streak: p.streak.current,
      completed: p.status === 'completed'
    }));
  }

  /**
   * Get global leaderboard
   */
  async getGlobalLeaderboard(options = {}) {
    const { period = 'all', limit = 50 } = options;
    
    const sortField = period === 'month' ? 'points.currentMonth' : 'points.total';
    
    const profiles = await UserGamification.find({
      'leaderboard.showOnPublic': true
    })
      .populate('user', 'name')
      .sort({ [sortField]: -1 })
      .limit(limit);
    
    return profiles.map((p, index) => ({
      rank: index + 1,
      user: {
        id: p.user._id,
        name: p.leaderboard.displayName || p.user.name
      },
      points: period === 'month' ? p.points.currentMonth : p.points.total,
      level: p.level.current,
      rankTitle: p.rankTitle,
      badges: p.badges.length
    }));
  }

  /**
   * Process daily challenge updates (called by cron)
   */
  async processDailyChallenges() {
    console.log('[Gamification] Processing daily challenge updates...');
    
    const now = new Date();
    
    // Update challenge statuses
    await Challenge.updateMany(
      { status: 'upcoming', startDate: { $lte: now } },
      { status: 'active' }
    );
    
    await Challenge.updateMany(
      { status: 'active', endDate: { $lt: now } },
      { status: 'completed' }
    );
    
    // Update participant statuses for ended challenges
    const endedChallenges = await Challenge.find({ status: 'completed' });
    for (const challenge of endedChallenges) {
      await ChallengeParticipant.updateMany(
        { challenge: challenge._id, status: 'active' },
        { status: 'completed' }
      );
    }
    
    // Determine winners for completed challenges
    for (const challenge of endedChallenges) {
      const topParticipant = await ChallengeParticipant.findOne({
        challenge: challenge._id,
        status: 'completed'
      })
        .sort({ 'progress.current': -1 })
        .populate('user');
      
      if (topParticipant && topParticipant.progress.current >= topParticipant.progress.target) {
        // Award bonus points to winner
        const bonusPoints = Math.round(challenge.rewards.points * 0.5);
        await this.addPoints(topParticipant.user._id, bonusPoints, `Challenge winner: ${challenge.title}`);
        
        // Update winner's stats
        const profile = await this.getUserProfile(topParticipant.user._id);
        profile.stats.challengesWon++;
        await profile.save();
        
        // Check achievements
        await this.checkAchievements(topParticipant.user._id);
      }
    }
    
    console.log('[Gamification] Daily challenge processing complete');
  }

  /**
   * Create default system challenges
   */
  async createSystemChallenges() {
    for (const challengeData of DEFAULT_CHALLENGES) {
      // Create challenge starting next week
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
      
      const existing = await Challenge.findOne({
        title: challengeData.title,
        isSystemChallenge: true,
        startDate: { $gte: new Date() }
      });
      
      if (!existing) {
        await Challenge.create({
          ...challengeData,
          startDate,
          endDate,
          isSystemChallenge: true,
          scope: 'public',
          status: 'upcoming'
        });
        console.log(`[Gamification] Created system challenge: ${challengeData.title}`);
      }
    }
  }

  /**
   * Record goal completion for achievements
   */
  async recordGoalCompletion(userId) {
    const profile = await this.getUserProfile(userId);
    profile.stats.goalsCompleted++;
    await profile.save();
    
    await this.checkAchievements(userId);
  }

  /**
   * Record savings for achievements
   */
  async recordSavings(userId, amount) {
    const profile = await this.getUserProfile(userId);
    profile.stats.totalSaved += amount;
    profile.updateStreak('savings', true);
    await profile.save();
    
    await this.checkAchievements(userId);
  }

  /**
   * Track dashboard visit for achievements
   */
  async trackDashboardVisit(userId) {
    const profile = await this.getUserProfile(userId);
    profile.updateStreak('login', true);
    profile.lastActivityAt = new Date();
    await profile.save();
    
    await this.checkAchievements(userId);
  }

  /**
   * Track expense logging for achievements
   */
  async trackExpenseLogged(userId) {
    const profile = await this.getUserProfile(userId);
    profile.updateStreak('logging', true);
    await profile.save();
    
    await this.checkAchievements(userId);
  }
}

module.exports = new GamificationService();
