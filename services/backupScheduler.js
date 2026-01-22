const schedule = require('node-schedule');
const backupService = require('./backupService');
const emailService = require('./emailService');

class BackupScheduler {
  constructor() {
    this.jobs = new Map();
  }

  // Initialize all scheduled backup jobs
  init() {
    try {
      // Daily incremental backup at 2 AM
      this.scheduleIncrementalBackup();
      
      // Weekly full backup on Sunday at 3 AM
      this.scheduleFullBackup();
      
      // Daily cleanup at 4 AM
      this.scheduleCleanup();
      
      // Weekly backup verification on Monday at 5 AM
      this.scheduleVerification();

      console.log('Backup scheduler initialized successfully');
    } catch (error) {
      console.error('Failed to initialize backup scheduler:', error);
    }
  }

  // Schedule daily incremental backups
  scheduleIncrementalBackup() {
    const job = schedule.scheduleJob('0 2 * * *', async () => {
      console.log('Starting scheduled incremental backup...');
      
      try {
        const backup = await backupService.createIncrementalBackup('schedule');
        console.log(`Incremental backup completed: ${backup.backupId}`);
        
        // Send success notification
        await this.sendBackupNotification('success', 'incremental', backup);
        
      } catch (error) {
        console.error('Scheduled incremental backup failed:', error);
        
        // Send failure notification
        await this.sendBackupNotification('failure', 'incremental', null, error);
      }
    });

    this.jobs.set('incremental', job);
    console.log('Incremental backup scheduled: Daily at 2:00 AM');
  }

  // Schedule weekly full backups
  scheduleFullBackup() {
    const job = schedule.scheduleJob('0 3 * * 0', async () => {
      console.log('Starting scheduled full backup...');
      
      try {
        const backup = await backupService.createFullBackup('schedule');
        console.log(`Full backup completed: ${backup.backupId}`);
        
        // Send success notification
        await this.sendBackupNotification('success', 'full', backup);
        
      } catch (error) {
        console.error('Scheduled full backup failed:', error);
        
        // Send failure notification
        await this.sendBackupNotification('failure', 'full', null, error);
      }
    });

    this.jobs.set('full', job);
    console.log('Full backup scheduled: Weekly on Sunday at 3:00 AM');
  }

  // Schedule daily cleanup
  scheduleCleanup() {
    const job = schedule.scheduleJob('0 4 * * *', async () => {
      console.log('Starting scheduled backup cleanup...');
      
      try {
        const cleanedCount = await backupService.cleanupOldBackups();
        console.log(`Cleanup completed: ${cleanedCount} old backups removed`);
        
        if (cleanedCount > 0) {
          await this.sendCleanupNotification(cleanedCount);
        }
        
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    });

    this.jobs.set('cleanup', job);
    console.log('Backup cleanup scheduled: Daily at 4:00 AM');
  }

  // Schedule weekly backup verification
  scheduleVerification() {
    const job = schedule.scheduleJob('0 5 * * 1', async () => {
      console.log('Starting scheduled backup verification...');
      
      try {
        const Backup = require('../models/Backup');
        
        // Get recent unverified backups
        const unverifiedBackups = await Backup.find({
          verified: false,
          status: 'completed',
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }).limit(5);

        const verificationResults = [];
        
        for (const backup of unverifiedBackups) {
          try {
            const result = await backupService.verifyBackup(backup.backupId);
            verificationResults.push(result);
          } catch (error) {
            console.error(`Verification failed for ${backup.backupId}:`, error);
            verificationResults.push({
              backupId: backup.backupId,
              verified: false,
              error: error.message
            });
          }
        }

        console.log(`Verification completed: ${verificationResults.length} backups checked`);
        
        if (verificationResults.length > 0) {
          await this.sendVerificationNotification(verificationResults);
        }
        
      } catch (error) {
        console.error('Scheduled verification failed:', error);
      }
    });

    this.jobs.set('verification', job);
    console.log('Backup verification scheduled: Weekly on Monday at 5:00 AM');
  }

  // Send backup notification email
  async sendBackupNotification(status, type, backup, error = null) {
    try {
      const User = require('../models/User');
      const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });
      
      if (!adminUser) return;

      const subject = status === 'success' 
        ? `✅ ExpenseFlow ${type} backup completed successfully`
        : `❌ ExpenseFlow ${type} backup failed`;

      const message = status === 'success'
        ? `The ${type} backup has been completed successfully.\n\nBackup Details:\n- ID: ${backup.backupId}\n- Size: ${this.formatBytes(backup.size)}\n- Duration: ${backup.duration}ms\n- Collections: ${backup.collections.length}`
        : `The ${type} backup has failed.\n\nError: ${error.message}\n\nPlease check the system logs for more details.`;

      await emailService.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        subject,
        text: message,
        html: this.generateBackupEmailTemplate(status, type, backup, error)
      });

    } catch (emailError) {
      console.error('Failed to send backup notification:', emailError);
    }
  }

  // Send cleanup notification
  async sendCleanupNotification(cleanedCount) {
    try {
      await emailService.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        subject: '🧹 ExpenseFlow backup cleanup completed',
        text: `Backup cleanup completed successfully. ${cleanedCount} old backups were removed.`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>🧹 Backup Cleanup Report</h2>
            <p>The scheduled backup cleanup has been completed successfully.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
              <strong>Cleaned up:</strong> ${cleanedCount} old backup(s)
            </div>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send cleanup notification:', error);
    }
  }

  // Send verification notification
  async sendVerificationNotification(results) {
    try {
      const successCount = results.filter(r => r.verified).length;
      const failureCount = results.length - successCount;

      await emailService.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        subject: '🔍 ExpenseFlow backup verification report',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>🔍 Backup Verification Report</h2>
            <p>Weekly backup verification has been completed.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <div style="margin-bottom: 10px;">
                <strong>✅ Verified:</strong> ${successCount} backup(s)
              </div>
              <div>
                <strong>❌ Failed:</strong> ${failureCount} backup(s)
              </div>
            </div>

            <h3>Verification Details:</h3>
            <ul>
              ${results.map(r => `
                <li>
                  <strong>${r.backupId}:</strong> 
                  ${r.verified ? '✅ Verified' : '❌ Failed'}
                  ${r.error ? ` - ${r.error}` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        `
      });
    } catch (error) {
      console.error('Failed to send verification notification:', error);
    }
  }

  // Generate backup email template
  generateBackupEmailTemplate(status, type, backup, error) {
    if (status === 'success') {
      return `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #28a745;">✅ Backup Completed Successfully</h2>
          <p>The ${type} backup has been completed successfully.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>Backup Details:</h3>
            <ul>
              <li><strong>Backup ID:</strong> ${backup.backupId}</li>
              <li><strong>Type:</strong> ${backup.type}</li>
              <li><strong>Size:</strong> ${this.formatBytes(backup.size)}</li>
              <li><strong>Duration:</strong> ${backup.duration}ms</li>
              <li><strong>Collections:</strong> ${backup.collections.length}</li>
              <li><strong>S3 Location:</strong> ${backup.s3Location.key}</li>
            </ul>
          </div>

          <h3>Collection Summary:</h3>
          <ul>
            ${backup.collections.map(c => `
              <li><strong>${c.name}:</strong> ${c.documentCount} documents (${this.formatBytes(c.size)})</li>
            `).join('')}
          </ul>
        </div>
      `;
    } else {
      return `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #dc3545;">❌ Backup Failed</h2>
          <p>The ${type} backup has failed and requires attention.</p>
          
          <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc3545;">
            <h3>Error Details:</h3>
            <p><strong>Message:</strong> ${error.message}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>

          <p>Please check the system logs for more detailed information and take appropriate action.</p>
        </div>
      `;
    }
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Cancel a scheduled job
  cancelJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.cancel();
      this.jobs.delete(jobName);
      console.log(`Cancelled scheduled job: ${jobName}`);
    }
  }

  // Cancel all scheduled jobs
  cancelAllJobs() {
    for (const [name, job] of this.jobs) {
      job.cancel();
      console.log(`Cancelled scheduled job: ${name}`);
    }
    this.jobs.clear();
  }

  // Get job status
  getJobStatus() {
    const status = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        scheduled: job.nextInvocation(),
        running: job.running || false
      };
    }
    return status;
  }
}

module.exports = new BackupScheduler();