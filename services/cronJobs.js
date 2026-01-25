const cron = require('node-cron');
const User = require('../models/User');
const Expense = require('../models/Expense');
const BankConnection = require('../models/BankConnection');
const emailService = require('../services/emailService');
const currencyService = require('../services/currencyService');
const subscriptionService = require('../services/subscriptionService');
const gamificationService = require('../services/gamificationService');
const recurringService = require('../services/recurringService');

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

    // Sync bank transactions - Every 4 hours for daily sync, every 15 min for realtime
    cron.schedule('0 */4 * * *', async () => {
      console.log('[CronJobs] Syncing bank transactions (daily)...');
      await this.syncBankTransactions('daily');
    });

    cron.schedule('*/15 * * * *', async () => {
      console.log('[CronJobs] Syncing bank transactions (realtime)...');
      await this.syncBankTransactions('realtime');
    });

    // Check bank connection health - Daily at 7 AM
    cron.schedule('0 7 * * *', async () => {
      console.log('[CronJobs] Checking bank connection health...');
      await this.checkBankConnectionHealth();
    });

    // Weekly bank sync (for weekly sync preference) - Every Monday at 6 AM
    cron.schedule('0 6 * * 1', async () => {
      console.log('[CronJobs] Syncing bank transactions (weekly)...');
      await this.syncBankTransactions('weekly');
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

  /**
   * Sync bank transactions based on frequency preference
   */
  static async syncBankTransactions(frequency) {
    try {
      const transactionImportService = require('./transactionImportService');
      const openBankingService = require('./openBankingService');

      // Find connections due for sync with this frequency
      const connections = await BankConnection.find({
        status: 'active',
        'syncConfig.syncEnabled': true,
        'syncConfig.frequency': frequency,
        $or: [
          { 'syncConfig.nextSyncAt': { $lte: new Date() } },
          { 'syncConfig.nextSyncAt': { $exists: false } }
        ]
      });

      console.log(`[BankSync] Found ${connections.length} connections to sync (${frequency})`);

      for (const connection of connections) {
        try {
          // Sync balances first
          await openBankingService.syncBalances(connection._id);
          
          // Sync transactions
          const result = await transactionImportService.syncTransactions(connection._id);
          
          console.log(`[BankSync] Synced ${connection.institution.name}: ${result.imported} new, ${result.duplicates} duplicates`);
        } catch (error) {
          console.error(`[BankSync] Error syncing ${connection.institution?.name}:`, error.message);
          
          // Update connection health
          connection.updateHealth(false);
          await connection.save();
        }
      }
    } catch (error) {
      console.error('[BankSync] Sync job error:', error);
    }
  }

  /**
   * Check and report on unhealthy bank connections
   */
  static async checkBankConnectionHealth() {
    try {
      // Find unhealthy connections
      const unhealthyConnections = await BankConnection.findUnhealthy();

      if (unhealthyConnections.length > 0) {
        console.log(`[BankHealth] Found ${unhealthyConnections.length} unhealthy connections`);

        for (const connection of unhealthyConnections) {
          // Notify user about connection issues
          if (connection.user?.email) {
            try {
              await emailService.sendBankConnectionAlert(connection.user, {
                institution: connection.institution.name,
                status: connection.status,
                error: connection.error?.displayMessage || 'Connection requires attention',
                lastSync: connection.syncConfig.lastSyncAt
              });
            } catch (emailError) {
              console.error('[BankHealth] Failed to send alert email:', emailError.message);
            }
          }
        }
      }

      // Find connections requiring re-authentication
      const reauthConnections = await BankConnection.find({
        status: 'requires_reauth'
      }).populate('user', 'email name');

      if (reauthConnections.length > 0) {
        console.log(`[BankHealth] Found ${reauthConnections.length} connections requiring re-auth`);

        for (const connection of reauthConnections) {
          if (connection.user?.email) {
            try {
              await emailService.sendBankReauthRequired(connection.user, {
                institution: connection.institution.name
              });
            } catch (emailError) {
              console.error('[BankHealth] Failed to send reauth email:', emailError.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('[BankHealth] Health check error:', error);
    }
  }
}

module.exports = CronJobs;