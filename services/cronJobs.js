const cron = require('node-cron');
const User = require('../models/User');
const Expense = require('../models/Expense');
const BankConnection = require('../models/BankConnection');
const emailService = require('../services/emailService');
const currencyService = require('../services/currencyService');
const investmentService = require('../services/investmentService');
const insightService = require('../services/insightService');
const subscriptionDetector = require('../services/subscriptionDetector');
const Portfolio = require('../models/Portfolio');
const FinancialInsight = require('../models/FinancialInsight');
const Subscription = require('../models/Subscription');

class CronJobs {
  static init() {
    // Process recurring expenses - Daily at 6 AM
    cron.schedule('0 6 * * *', async () => {
      console.log('[CronJobs] Processing recurring expenses...');
      await this.processRecurringExpenses();
    });

    // Send recurring expense reminders - Daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('[CronJobs] Sending recurring expense reminders...');
      await this.sendRecurringReminders();
    });

    // Send subscription renewal reminders - Daily at 9:30 AM
    cron.schedule('30 9 * * *', async () => {
      console.log('[CronJobs] Sending subscription renewal reminders...');
      await this.sendSubscriptionReminders();
    });

    // Send trial ending reminders - Daily at 10 AM
    cron.schedule('0 10 * * *', async () => {
      console.log('[CronJobs] Sending trial ending reminders...');
      await this.sendTrialReminders();
    });

    // Process daily gamification updates - Daily at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('[CronJobs] Processing daily gamification updates...');
      await this.processDailyGamification();
    });

    // Weekly report - Every Sunday at 9 AM
    cron.schedule('0 9 * * 0', async () => {
      console.log('[CronJobs] Sending weekly reports...');
      await this.sendWeeklyReports();
    });

    // Monthly report - 1st day of month at 10 AM
    cron.schedule('0 10 1 * *', async () => {
      console.log('[CronJobs] Sending monthly reports...');
      await this.sendMonthlyReports();
    });

    // Reset monthly gamification points - 1st day of month at midnight
    cron.schedule('0 0 1 * *', async () => {
      console.log('[CronJobs] Resetting monthly gamification points...');
      await this.resetMonthlyGamification();
    });

    // Budget alerts - Daily at 8 PM
    cron.schedule('0 20 * * *', async () => {
      console.log('[CronJobs] Checking budget alerts...');
      await this.checkBudgetAlerts();
    });

    // Update exchange rates - Every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Updating exchange rates...');
      await this.updateExchangeRates();
    });

    // Update investment prices - Every hour during market hours (9 AM - 5 PM EST)
    cron.schedule('0 9-17 * * 1-5', async () => {
      console.log('[CronJobs] Updating investment asset prices...');
      await this.updateInvestmentPrices();
    });

    // Update crypto prices - Every 15 minutes (24/7)
    cron.schedule('*/15 * * * *', async () => {
      console.log('[CronJobs] Updating crypto prices...');
      await this.updateCryptoPrices();
    });

    // Take daily portfolio snapshots - Daily at 6 PM EST
    cron.schedule('0 18 * * 1-5', async () => {
      console.log('[CronJobs] Taking portfolio snapshots...');
      await this.takePortfolioSnapshots();
    });

    // Generate financial insights - Daily at 7 AM
    cron.schedule('0 7 * * *', async () => {
      console.log('[CronJobs] Generating financial insights...');
      await this.generateDailyInsights();
    });

    // Detect subscriptions - Weekly on Monday at 8 AM
    cron.schedule('0 8 * * 1', async () => {
      console.log('[CronJobs] Detecting subscriptions...');
      await this.detectSubscriptions();
    });

    // Check subscription renewals - Daily at 10 AM
    cron.schedule('0 10 * * *', async () => {
      console.log('[CronJobs] Checking subscription renewals...');
      await this.checkSubscriptionRenewals();
    });

    // Cleanup old insights - Weekly on Sunday at 2 AM
    cron.schedule('0 2 * * 0', async () => {
      console.log('[CronJobs] Cleaning up old insights...');
      await this.cleanupOldInsights();
    });

    console.log('Cron jobs initialized successfully');
  }

  static async processRecurringExpenses() {
    try {
      await recurringService.processRecurringExpenses();
    } catch (error) {
      console.error('[CronJobs] Recurring expenses error:', error);
    }
  }

  static async sendRecurringReminders() {
    try {
      await recurringService.sendUpcomingReminders();
    } catch (error) {
      console.error('[CronJobs] Recurring reminders error:', error);
    }
  }

  static async sendSubscriptionReminders() {
    try {
      await subscriptionService.sendRenewalReminders();
    } catch (error) {
      console.error('[CronJobs] Subscription reminders error:', error);
    }
  }

  static async sendTrialReminders() {
    try {
      await subscriptionService.sendTrialReminders();
    } catch (error) {
      console.error('[CronJobs] Trial reminders error:', error);
    }
  }

  static async processDailyGamification() {
    try {
      await gamificationService.processDailyChallenges();
    } catch (error) {
      console.error('[CronJobs] Gamification processing error:', error);
    }
  }

  static async resetMonthlyGamification() {
    try {
      const UserGamification = require('../models/UserGamification');
      await UserGamification.updateMany(
        {},
        { 
          'points.currentMonth': 0,
          'points.lastMonthReset': new Date()
        }
      );
      console.log('[CronJobs] Monthly gamification points reset');
    } catch (error) {
      console.error('[CronJobs] Monthly reset error:', error);
    }
  }

  static async seedGamificationData() {
    try {
      await gamificationService.seedAchievements();
      await gamificationService.createSystemChallenges();
    } catch (error) {
      console.error('[CronJobs] Gamification seed error:', error);
    }
  }

  static async updateExchangeRates() {
    try {
      // Update rates for major base currencies
      const baseCurrencies = ['USD', 'EUR', 'GBP', 'INR'];

      for (const currency of baseCurrencies) {
        try {
          await currencyService.updateExchangeRates(currency);
          console.log(`Updated exchange rates for ${currency}`);
        } catch (error) {
          console.error(`Failed to update rates for ${currency}:`, error.message);
        }
      }

      console.log('Exchange rates update completed');
    } catch (error) {
      console.error('Exchange rates update error:', error);
    }
  }

  static async sendWeeklyReports() {
    try {
      const users = await User.find({});
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      for (const user of users) {
        const weeklyExpenses = await Expense.aggregate([
          {
            $match: {
              user: user._id,
              date: { $gte: oneWeekAgo },
              type: 'expense'
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              amount: { $sum: '$amount' }
            }
          },
          { $sort: { _id: 1 } }
        ]);

        const totalSpent = weeklyExpenses.reduce((sum, day) => sum + day.amount, 0);
        const avgDaily = totalSpent / 7;

        const reportData = {
          weeklyExpenses: weeklyExpenses.map(day => ({
            date: day._id,
            amount: day.amount
          })),
          totalSpent,
          avgDaily
        };

        await emailService.sendWeeklyReport(user, reportData);
      }
    } catch (error) {
      console.error('Weekly report error:', error);
    }
  }

  static async sendMonthlyReports() {
    try {
      const users = await User.find({});
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      for (const user of users) {
        const monthlyData = await Expense.aggregate([
          {
            $match: {
              user: user._id,
              date: { $gte: startOfMonth }
            }
          },
          {
            $group: {
              _id: '$type',
              total: { $sum: '$amount' }
            }
          }
        ]);

        const categoryData = await Expense.aggregate([
          {
            $match: {
              user: user._id,
              date: { $gte: startOfMonth },
              type: 'expense'
            }
          },
          {
            $group: {
              _id: '$category',
              amount: { $sum: '$amount' }
            }
          },
          { $sort: { amount: -1 } },
          { $limit: 5 }
        ]);

        const totalExpenses = monthlyData.find(d => d._id === 'expense')?.total || 0;
        const totalIncome = monthlyData.find(d => d._id === 'income')?.total || 0;
        const balance = totalIncome - totalExpenses;

        const reportData = {
          totalExpenses,
          totalIncome,
          balance,
          topCategories: categoryData.map(cat => ({
            name: cat._id,
            amount: cat.amount
          }))
        };

        await emailService.sendMonthlyReport(user, reportData);
      }
    } catch (error) {
      console.error('Monthly report error:', error);
    }
  }

  static async checkBudgetAlerts() {
    try {
      // This would require a Budget model - simplified version
      const users = await User.find({});
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      for (const user of users) {
        const categorySpending = await Expense.aggregate([
          {
            $match: {
              user: user._id,
              date: { $gte: startOfMonth },
              type: 'expense'
            }
          },
          {
            $group: {
              _id: '$category',
              spent: { $sum: '$amount' }
            }
          }
        ]);

        // Example budget limits (in real app, this would come from Budget model)
        const budgetLimits = {
          food: 10000,
          transport: 5000,
          entertainment: 3000,
          shopping: 8000
        };

        for (const category of categorySpending) {
          const budget = budgetLimits[category._id];
          if (budget && category.spent > budget * 0.8) { // 80% threshold
            await emailService.sendBudgetAlert(
              user,
              category._id,
              category.spent,
              budget
            );
          }
        }
      }
    } catch (error) {
      console.error('Budget alert error:', error);
    }
  }

  // Update stock/ETF prices
  static async updateInvestmentPrices() {
    try {
      const Asset = require('../models/Asset');
      const assets = await Asset.find({ 
        isActive: true, 
        type: { $in: ['stock', 'etf', 'mutual_fund'] }
      });

      let updated = 0;
      let failed = 0;

      for (const asset of assets) {
        try {
          // Rate limiting for Alpha Vantage (5 calls/min on free tier)
          await new Promise(resolve => setTimeout(resolve, 12000));
          await investmentService.updateAssetPrice(asset._id);
          updated++;
        } catch (error) {
          console.error(`Failed to update ${asset.symbol}:`, error.message);
          failed++;
        }
      }

      console.log(`[CronJobs] Investment prices updated: ${updated} success, ${failed} failed`);
    } catch (error) {
      console.error('[CronJobs] Investment price update error:', error);
    }
  }

  // Update crypto prices (more frequent, CoinGecko has higher rate limits)
  static async updateCryptoPrices() {
    try {
      const Asset = require('../models/Asset');
      const cryptoAssets = await Asset.find({ 
        isActive: true, 
        type: 'crypto' 
      });

      let updated = 0;
      let failed = 0;

      for (const asset of cryptoAssets) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await investmentService.updateAssetPrice(asset._id);
          updated++;
        } catch (error) {
          console.error(`Failed to update crypto ${asset.symbol}:`, error.message);
          failed++;
        }
      }

      console.log(`[CronJobs] Crypto prices updated: ${updated} success, ${failed} failed`);
    } catch (error) {
      console.error('[CronJobs] Crypto price update error:', error);
    }
  }

  // Take daily portfolio snapshots for historical tracking
  static async takePortfolioSnapshots() {
    try {
      const portfolios = await Portfolio.find({})
        .populate('holdings.asset');

      let snapshotsTaken = 0;

      for (const portfolio of portfolios) {
        try {
          await portfolio.takeSnapshot();
          snapshotsTaken++;
        } catch (error) {
          console.error(`Failed to snapshot portfolio ${portfolio._id}:`, error.message);
        }
      }

      console.log(`[CronJobs] Portfolio snapshots taken: ${snapshotsTaken}`);
    } catch (error) {
      console.error('[CronJobs] Portfolio snapshot error:', error);
    }
  }
  // Generate daily financial insights for all users
  static async generateDailyInsights() {
    try {
      const users = await User.find({ isActive: true });
      let insightsGenerated = 0;

      for (const user of users) {
        try {
          await insightService.generateInsights(user._id);
          insightsGenerated++;
        } catch (error) {
          console.error(`Failed to generate insights for user ${user._id}:`, error.message);
        }
      }

      console.log(`[CronJobs] Insights generated for ${insightsGenerated} users`);
    } catch (error) {
      console.error('[CronJobs] Generate insights error:', error);
    }
  }

  // Detect subscriptions for all users
  static async detectSubscriptions() {
    try {
      const users = await User.find({ isActive: true });
      let totalDetected = 0;

      for (const user of users) {
        try {
          const detected = await subscriptionDetector.detectSubscriptions(user._id);
          totalDetected += detected.length;
        } catch (error) {
          console.error(`Failed to detect subscriptions for user ${user._id}:`, error.message);
        }
      }

      console.log(`[CronJobs] Detected ${totalDetected} subscriptions`);
    } catch (error) {
      console.error('[CronJobs] Detect subscriptions error:', error);
    }
  }

  // Check and send subscription renewal reminders
  static async checkSubscriptionRenewals() {
    try {
      const users = await User.find({ isActive: true });
      let remindersSent = 0;

      for (const user of users) {
        try {
          const upcoming = await subscriptionDetector.checkUpcomingRenewals(user._id, 3);

          for (const subscription of upcoming) {
            const daysUntil = subscription.days_until_billing;
            
            await emailService.sendEmail({
              to: user.email,
              subject: `Subscription Renewal: ${subscription.name}`,
              html: `<h2>Upcoming Subscription Renewal</h2><p>Your ${subscription.name} subscription will renew in ${daysUntil} day(s).</p>`
            });

            await subscriptionDetector.markReminderSent(subscription._id);
            remindersSent++;
          }
        } catch (error) {
          console.error(`Failed to check renewals for user ${user._id}:`, error.message);
        }
      }

      console.log(`[CronJobs] Subscription reminders sent: ${remindersSent}`);
    } catch (error) {
      console.error('[CronJobs] Subscription renewals error:', error);
    }
  }

  // Cleanup insights older than 90 days
  static async cleanupOldInsights() {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const result = await FinancialInsight.deleteMany({
        createdAt: { $lt: ninetyDaysAgo },
        isActioned: false
      });

      console.log(`[CronJobs] Cleaned up ${result.deletedCount} old insights`);
    } catch (error) {
      console.error('[CronJobs] Cleanup insights error:', error);
    }
  }
}

module.exports = CronJobs;
