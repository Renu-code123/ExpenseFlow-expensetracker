const cron = require('node-cron');
const User = require('../models/User');
const Expense = require('../models/Expense');
const emailService = require('../services/emailService');
const currencyService = require('../services/currencyService');
const TaxProfile = require('../models/TaxProfile');
const taxOptimizationService = require('../services/taxOptimizationService');

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

    // Quarterly tax estimate reminders - 1st of each quarter month at 9 AM
    cron.schedule('0 9 1 1,4,7,10 *', async () => {
      console.log('[CronJobs] Sending quarterly tax estimate reminders...');
      await this.sendQuarterlyTaxReminders();
    });

    // Year-end tax planning - December 1st at 9 AM
    cron.schedule('0 9 1 12 *', async () => {
      console.log('[CronJobs] Sending year-end tax planning reminders...');
      await this.sendYearEndTaxPlanningReminders();
    });

    // Tax document generation reminder - March 1st at 9 AM
    cron.schedule('0 9 1 3 *', async () => {
      console.log('[CronJobs] Sending tax document preparation reminders...');
      await this.sendTaxDocumentReminders();
    });

    console.log('Cron jobs initialized successfully');
  }

  static async processRecurringExpenses() {
    console.log('Processing recurring expenses (Placeholder)');
    // Implementation would go here
  }

  static async sendRecurringReminders() {
    console.log('Sending recurring reminders (Placeholder)');
    // Implementation would go here
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
      const profiles = await TaxProfile.getProfilesNeedingQuarterlyEstimates();
      
      for (const profile of profiles) {
        const upcomingPayments = profile.estimated_tax_payments.filter(
          p => !p.paid && p.due_date >= new Date() && p.due_date <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        );
        
        if (upcomingPayments.length > 0) {
          for (const payment of upcomingPayments) {
            await emailService.sendEmail({
              to: profile.user.email,
              subject: `Q${payment.quarter} Estimated Tax Payment Due`,
              html: `
                <h2>Quarterly Estimated Tax Payment Reminder</h2>
                <p>Hi ${profile.user.name},</p>
                <p>Your Q${payment.quarter} estimated tax payment of <strong>₹${payment.amount.toFixed(2)}</strong> is due on ${payment.due_date.toDateString()}.</p>
                <p>Please make sure to submit your payment before the deadline to avoid penalties.</p>
                <p><a href="${process.env.FRONTEND_URL}/tax/estimated">View Payment Details</a></p>
              `
            });
          }
        }
      }
      
      console.log(`Sent quarterly tax reminders to ${profiles.length} users`);
    } catch (error) {
      console.error('Quarterly tax reminder error:', error);
    }
  }

  static async sendYearEndTaxPlanningReminders() {
    try {
      const users = await User.find({});
      const currentYear = new Date().getFullYear();
      
      for (const user of users) {
        try {
          const profile = await TaxProfile.getUserProfile(user._id);
          
          if (profile) {
            // Generate year-end checklist
            const harvest = await taxOptimizationService.identifyTaxLossHarvestingOpportunities(user._id, currentYear);
            const contributionRoom = taxOptimizationService.calculateContributionRoom(profile);
            
            await emailService.sendEmail({
              to: user.email,
              subject: 'Year-End Tax Planning Checklist',
              html: `
                <h2>Year-End Tax Planning Reminders</h2>
                <p>Hi ${user.name},</p>
                <p>As we approach the end of the year, here are some tax optimization opportunities:</p>
                <ul>
                  ${harvest.length > 0 ? `<li><strong>Tax Loss Harvesting:</strong> ${harvest.length} opportunities identified with potential savings of ₹${harvest[0].potential_savings?.toFixed(2) || 0}</li>` : ''}
                  ${contributionRoom.total > 0 ? `<li><strong>Retirement Contributions:</strong> ₹${contributionRoom.total.toFixed(2)} remaining contribution room</li>` : ''}
                  <li><strong>Charitable Donations:</strong> Make contributions before December 31st</li>
                  <li><strong>Business Expenses:</strong> Review and document all deductible expenses</li>
                </ul>
                <p>Deadline: December 31, ${currentYear}</p>
                <p><a href="${process.env.FRONTEND_URL}/tax/year-end">View Full Checklist</a></p>
              `
            });
          }
        } catch (userError) {
          console.error(`Error processing user ${user._id}:`, userError);
        }
      }
      
      console.log(`Sent year-end tax planning reminders to ${users.length} users`);
    } catch (error) {
      console.error('Year-end tax planning reminder error:', error);
    }
  }

  static async sendTaxDocumentReminders() {
    try {
      const users = await User.find({});
      const lastYear = new Date().getFullYear() - 1;
      
      for (const user of users) {
        const profile = await TaxProfile.getUserProfile(user._id);
        
        if (profile) {
          await emailService.sendEmail({
            to: user.email,
            subject: `${lastYear} Tax Document Preparation`,
            html: `
              <h2>Tax Season is Here!</h2>
              <p>Hi ${user.name},</p>
              <p>It's time to prepare your ${lastYear} tax documents. ExpenseFlow can help you generate:</p>
              <ul>
                <li>Tax Summary Report</li>
                <li>Capital Gains Schedule (Schedule D)</li>
                <li>Business Income & Expenses (Schedule C)</li>
                <li>Year-End Tax Optimization Report</li>
              </ul>
              <p>Filing Deadline: April 15, ${new Date().getFullYear()}</p>
              <p><a href="${process.env.FRONTEND_URL}/tax/documents">Generate Tax Documents</a></p>
            `
          });
        }
      }
      
      console.log(`Sent tax document reminders to ${users.length} users`);
    } catch (error) {
      console.error('Tax document reminder error:', error);
    }
  }
}

module.exports = CronJobs;
