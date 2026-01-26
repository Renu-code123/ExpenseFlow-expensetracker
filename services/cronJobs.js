const cron = require('node-cron');
const User = require('../models/User');
const Expense = require('../models/Expense');
const BankConnection = require('../models/BankConnection');
const emailService = require('../services/emailService');
const currencyService = require('../services/currencyService');
const budgetForecastingService = require('./budgetForecastingService');
const anomalyDetectionService = require('./anomalyDetectionService');

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

    // Update portfolio prices - Every 15 minutes during market hours
    cron.schedule('*/15 9-16 * * 1-5', async () => {
      console.log('[CronJobs] Updating portfolio prices...');
      await this.updatePortfolioPrices();
    });

    // Daily portfolio metrics update - Daily at 5 PM
    cron.schedule('0 17 * * *', async () => {
      console.log('[CronJobs] Updating portfolio metrics...');
      await this.updateDailyPortfolioMetrics();
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
$newMethods}
}
module.exports = CronJobs;
