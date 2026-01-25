const cron = require('node-cron');
const User = require('../models/User');
const Expense = require('../models/Expense');
const emailService = require('../services/emailService');
const currencyService = require('../services/currencyService');
const taxService = require('../services/taxService');
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

    // Quarterly tax payment reminders - Check daily at 8 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('[CronJobs] Checking quarterly tax reminders...');
      await this.sendQuarterlyTaxReminders();
    });

    // Year-end tax reminder - December 1st and 15th at 9 AM
    cron.schedule('0 9 1,15 12 *', async () => {
      console.log('[CronJobs] Sending year-end tax reminders...');
      await this.sendYearEndTaxReminders();
    });

    // Missing receipt reminders - Weekly on Monday at 10 AM
    cron.schedule('0 10 * * 1', async () => {
      console.log('[CronJobs] Sending missing receipt reminders...');
      await this.sendMissingReceiptReminders();
    });

    // Seed default achievements and challenges on startup
    this.seedGamificationData();

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

  static async sendQuarterlyTaxReminders() {
    try {
      const TaxProfile = require('../models/TaxProfile');
      const now = new Date();
      
      // Quarterly due dates (US)
      const quarterlyDueDates = [
        { quarter: 1, month: 3, day: 15 }, // April 15
        { quarter: 2, month: 5, day: 15 }, // June 15
        { quarter: 3, month: 8, day: 15 }, // September 15
        { quarter: 4, month: 0, day: 15 }  // January 15 (next year)
      ];

      // Check if we're within 7 days of a due date
      for (const dueDate of quarterlyDueDates) {
        const year = dueDate.quarter === 4 ? now.getFullYear() + 1 : now.getFullYear();
        const due = new Date(year, dueDate.month, dueDate.day);
        const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

        if (daysUntilDue === 7 || daysUntilDue === 1) {
          // Find users with self-employment income who have tax profiles
          const profiles = await TaxProfile.find({
            employmentType: { $in: ['self_employed', 'freelancer', 'business_owner'] },
            'notifications.quarterlyReminders': true
          }).populate('user');

          for (const profile of profiles) {
            try {
              await taxService.sendQuarterlyReminder(profile.user._id, dueDate.quarter);
            } catch (e) {
              console.error(`Failed to send tax reminder to user ${profile.user._id}:`, e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Quarterly tax reminder error:', error);
    }
  }

  static async sendYearEndTaxReminders() {
    try {
      const TaxProfile = require('../models/TaxProfile');
      const notificationService = require('./notificationService');

      const profiles = await TaxProfile.find({
        'notifications.yearEndReminders': true
      });

      for (const profile of profiles) {
        try {
          const checklist = await taxService.getYearEndChecklist(profile.user);
          const incompleteItems = checklist.filter(item => !item.completed);

          if (incompleteItems.length > 0) {
            await notificationService.sendNotification(profile.user, {
              title: 'Year-End Tax Checklist Reminder',
              message: `You have ${incompleteItems.length} items to complete before year-end for tax optimization.`,
              type: 'tax_reminder',
              priority: 'high',
              data: { incompleteCount: incompleteItems.length }
            });
          }
        } catch (e) {
          console.error(`Failed to send year-end reminder to user ${profile.user}:`, e);
        }
      }
    } catch (error) {
      console.error('Year-end tax reminder error:', error);
    }
  }

  static async sendMissingReceiptReminders() {
    try {
      const Deduction = require('../models/Deduction');
      const TaxProfile = require('../models/TaxProfile');
      const notificationService = require('./notificationService');
      const taxYear = new Date().getFullYear();

      const profiles = await TaxProfile.find({
        'notifications.documentReminders': true
      });

      for (const profile of profiles) {
        try {
          const missingDocs = await Deduction.findMissingDocumentation(profile.user, taxYear);
          
          if (missingDocs.length > 0) {
            const totalAmount = missingDocs.reduce((sum, d) => sum + d.amount, 0);
            
            await notificationService.sendNotification(profile.user, {
              title: 'Missing Receipt Reminder',
              message: `${missingDocs.length} deductions worth $${totalAmount.toLocaleString()} are missing receipts.`,
              type: 'document_reminder',
              priority: 'medium',
              data: { count: missingDocs.length, totalAmount }
            });
          }
        } catch (e) {
          console.error(`Failed to send receipt reminder to user ${profile.user}:`, e);
        }
      }
    } catch (error) {
      console.error('Missing receipt reminder error:', error);
    }
  }
}

module.exports = CronJobs;