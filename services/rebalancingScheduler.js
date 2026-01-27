const cron = require('node-cron');
const { TargetAllocation, RebalancingAlert } = require('../models/PortfolioRebalancing');
const rebalancingService = require('../services/rebalancingService');
const Notification = require('../models/Notification');

class RebalancingScheduler {
  constructor() {
    this.jobs = new Map();
  }

  // Initialize all scheduled jobs
  async initialize() {
    console.log('Initializing rebalancing scheduler...');

    // Daily check at 9 AM for scheduled rebalances
    this.scheduleJob('daily-rebalancing-check', '0 9 * * *', async () => {
      await this.checkScheduledRebalancing();
    });

    // Weekly check on Monday at 10 AM for threshold-based rebalancing
    this.scheduleJob('weekly-threshold-check', '0 10 * * 1', async () => {
      await this.checkThresholdBasedRebalancing();
    });

    // Monthly reminder on 1st at 9 AM
    this.scheduleJob('monthly-reminder', '0 9 1 * *', async () => {
      await this.sendMonthlyReminders();
    });

    console.log('Rebalancing scheduler initialized');
  }

  // Schedule a cron job
  scheduleJob(name, cronExpression, callback) {
    if (this.jobs.has(name)) {
      console.log(`Job ${name} already exists, stopping old job`);
      this.jobs.get(name).stop();
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`Running scheduled job: ${name}`);
      try {
        await callback();
      } catch (error) {
        console.error(`Error in scheduled job ${name}:`, error);
      }
    }, {
      timezone: 'UTC'
    });

    this.jobs.set(name, job);
    console.log(`Scheduled job: ${name} with cron: ${cronExpression}`);
  }

  // Check for scheduled rebalancing
  async checkScheduledRebalancing() {
    console.log('Checking for scheduled rebalancing...');

    try {
      const now = new Date();
      
      // Find all target allocations with scheduled rebalancing due
      const dueAllocations = await TargetAllocation.find({
        isActive: true,
        'rebalancingSettings.frequency': { $in: ['monthly', 'quarterly', 'semi-annually', 'annually'] },
        'rebalancingSettings.nextRebalanceDate': { $lte: now }
      }).populate('portfolio user');

      console.log(`Found ${dueAllocations.length} portfolios due for rebalancing`);

      for (const targetAllocation of dueAllocations) {
        try {
          // Check if rebalancing is needed
          const check = await rebalancingService.checkRebalancingNeeded(
            targetAllocation.user._id,
            targetAllocation.portfolio._id
          );

          if (check.needed) {
            // Create alert
            await this.createRebalancingAlert(
              targetAllocation,
              'scheduled',
              'Scheduled rebalancing is due for your portfolio',
              check.maxDeviation > 15 ? 'critical' : check.maxDeviation > 10 ? 'warning' : 'info',
              {
                maxDeviation: check.maxDeviation,
                affectedAssets: check.deviations
                  .filter(d => d.exceedsTolerance)
                  .map(d => d.assetType)
              }
            );

            // If auto-rebalancing is enabled, execute it
            if (targetAllocation.rebalancingSettings.autoRebalance) {
              await this.executeAutoRebalancing(targetAllocation);
            }
          }

          // Update next rebalance date
          await targetAllocation.updateNextRebalanceDate();
        } catch (error) {
          console.error(`Error processing rebalancing for portfolio ${targetAllocation.portfolio._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in checkScheduledRebalancing:', error);
    }
  }

  // Check for threshold-based rebalancing
  async checkThresholdBasedRebalancing() {
    console.log('Checking threshold-based rebalancing...');

    try {
      // Find all target allocations with threshold-based rebalancing
      const thresholdAllocations = await TargetAllocation.find({
        isActive: true,
        'rebalancingSettings.frequency': 'threshold-based'
      }).populate('portfolio user');

      console.log(`Found ${thresholdAllocations.length} portfolios with threshold-based rebalancing`);

      for (const targetAllocation of thresholdAllocations) {
        try {
          // Check if rebalancing is needed
          const check = await rebalancingService.checkRebalancingNeeded(
            targetAllocation.user._id,
            targetAllocation.portfolio._id
          );

          if (check.needed) {
            // Check if we recently sent an alert (don't spam)
            const recentAlert = await RebalancingAlert.findOne({
              user: targetAllocation.user._id,
              portfolio: targetAllocation.portfolio._id,
              alertType: 'threshold-exceeded',
              createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
            });

            if (!recentAlert) {
              // Create alert
              await this.createRebalancingAlert(
                targetAllocation,
                'threshold-exceeded',
                `Portfolio has exceeded tolerance thresholds. Max deviation: ${check.maxDeviation.toFixed(1)}%`,
                check.maxDeviation > 15 ? 'critical' : 'warning',
                {
                  maxDeviation: check.maxDeviation,
                  affectedAssets: check.deviations
                    .filter(d => d.exceedsTolerance)
                    .map(d => d.assetType)
                }
              );

              // If auto-rebalancing is enabled, execute it
              if (targetAllocation.rebalancingSettings.autoRebalance) {
                await this.executeAutoRebalancing(targetAllocation);
              }
            }
          }
        } catch (error) {
          console.error(`Error checking threshold for portfolio ${targetAllocation.portfolio._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in checkThresholdBasedRebalancing:', error);
    }
  }

  // Send monthly reminders
  async sendMonthlyReminders() {
    console.log('Sending monthly rebalancing reminders...');

    try {
      // Find all active target allocations
      const allocations = await TargetAllocation.find({
        isActive: true
      }).populate('portfolio user');

      console.log(`Found ${allocations.length} active portfolios`);

      for (const targetAllocation of allocations) {
        try {
          // Check rebalancing status
          const check = await rebalancingService.checkRebalancingNeeded(
            targetAllocation.user._id,
            targetAllocation.portfolio._id
          );

          // Create informational reminder
          const message = check.needed
            ? `Monthly portfolio check: Rebalancing recommended. Max deviation: ${check.maxDeviation.toFixed(1)}%`
            : 'Monthly portfolio check: Your portfolio is well-balanced';

          await this.createRebalancingAlert(
            targetAllocation,
            'opportunity',
            message,
            'info',
            {
              maxDeviation: check.maxDeviation,
              affectedAssets: check.deviations
                .filter(d => d.exceedsTolerance)
                .map(d => d.assetType)
            }
          );
        } catch (error) {
          console.error(`Error sending reminder for portfolio ${targetAllocation.portfolio._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in sendMonthlyReminders:', error);
    }
  }

  // Execute auto rebalancing
  async executeAutoRebalancing(targetAllocation) {
    console.log(`Executing auto rebalancing for portfolio ${targetAllocation.portfolio._id}`);

    try {
      // Calculate rebalancing
      const rebalancing = await rebalancingService.calculateRebalancing(
        targetAllocation.user._id,
        targetAllocation.portfolio._id
      );

      // Create and execute rebalancing proposal
      const proposal = await rebalancingService.createRebalancingProposal(
        targetAllocation.user._id,
        targetAllocation.portfolio._id,
        {
          ...rebalancing,
          type: 'automatic',
          notes: 'Automatically executed by scheduled rebalancing'
        }
      );

      // Execute the rebalancing
      await rebalancingService.executeRebalancing(
        targetAllocation.user._id,
        proposal._id
      );

      // Send notification
      await Notification.create({
        user: targetAllocation.user._id,
        type: 'portfolio',
        title: 'Auto Rebalancing Executed',
        message: `Your portfolio "${targetAllocation.portfolio.name}" has been automatically rebalanced`,
        data: {
          portfolioId: targetAllocation.portfolio._id,
          rebalancingId: proposal._id,
          totalTrades: rebalancing.summary.totalTrades,
          totalCost: rebalancing.summary.netCost
        }
      });

      console.log(`Auto rebalancing completed for portfolio ${targetAllocation.portfolio._id}`);
    } catch (error) {
      console.error(`Error executing auto rebalancing for portfolio ${targetAllocation.portfolio._id}:`, error);
      
      // Send error notification
      await Notification.create({
        user: targetAllocation.user._id,
        type: 'alert',
        title: 'Auto Rebalancing Failed',
        message: `Failed to execute automatic rebalancing for portfolio "${targetAllocation.portfolio.name}": ${error.message}`,
        data: {
          portfolioId: targetAllocation.portfolio._id,
          error: error.message
        }
      });
    }
  }

  // Create rebalancing alert
  async createRebalancingAlert(targetAllocation, alertType, message, severity, details) {
    // Check if similar alert already exists (don't duplicate)
    const existingAlert = await RebalancingAlert.findOne({
      user: targetAllocation.user._id,
      portfolio: targetAllocation.portfolio._id,
      alertType,
      read: false,
      dismissed: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (existingAlert) {
      console.log(`Alert already exists for portfolio ${targetAllocation.portfolio._id}, skipping`);
      return existingAlert;
    }

    // Create alert
    const alert = await rebalancingService.createRebalancingAlert(
      targetAllocation.user._id,
      targetAllocation.portfolio._id,
      {
        targetAllocation: targetAllocation._id,
        alertType,
        message,
        severity,
        details,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    );

    // Also create a regular notification
    await Notification.create({
      user: targetAllocation.user._id,
      type: 'portfolio',
      title: 'Portfolio Rebalancing Alert',
      message,
      priority: severity === 'critical' ? 'high' : severity === 'warning' ? 'medium' : 'low',
      data: {
        portfolioId: targetAllocation.portfolio._id,
        alertId: alert._id,
        maxDeviation: details.maxDeviation,
        affectedAssets: details.affectedAssets
      }
    });

    return alert;
  }

  // Stop all jobs
  stopAll() {
    console.log('Stopping all rebalancing scheduler jobs...');
    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      console.log(`Stopped job: ${name}`);
    }
    this.jobs.clear();
  }

  // Stop specific job
  stopJob(name) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
      this.jobs.delete(name);
      console.log(`Stopped job: ${name}`);
      return true;
    }
    return false;
  }

  // Get job status
  getJobStatus() {
    const status = {};
    for (const [name, job] of this.jobs.entries()) {
      status[name] = {
        running: job.running || false
      };
    }
    return status;
  }

  // Manual trigger for testing
  async triggerCheckNow() {
    console.log('Manually triggering rebalancing checks...');
    await this.checkScheduledRebalancing();
    await this.checkThresholdBasedRebalancing();
  }
}

// Create singleton instance
const schedulerInstance = new RebalancingScheduler();

// Export functions
module.exports = {
  scheduler: schedulerInstance,
  initializeScheduler: () => schedulerInstance.initialize(),
  stopScheduler: () => schedulerInstance.stopAll(),
  getSchedulerStatus: () => schedulerInstance.getJobStatus(),
  triggerCheckNow: () => schedulerInstance.triggerCheckNow()
};
