// Simple notification service without web-push
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.init();
  }

  init() {
    try {
      this.emailTransporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      console.log('Notification service initialized');
    } catch (error) {
      console.log('Email service not configured');
    }
  }

  async sendEmail(to, subject, text, html) {
    if (!this.emailTransporter) {
      console.log('Email not configured, skipping notification');
      return { success: false, message: 'Email not configured' };
    }

    try {
      const result = await this.emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
        html
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPushNotification(subscription, payload) {
    console.log('Push notifications not available in simplified version');
    return { success: false, message: 'Push notifications not available' };
  }

  async sendSMS(to, message) {
    console.log('SMS not available in simplified version');
    return { success: false, message: 'SMS not available' };
  }
}

module.exports = new NotificationService();