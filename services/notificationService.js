const webpush = require('web-push');
const twilio = require('twilio');
const axios = require('axios');
const { Notification, NotificationPreferences } = require('../models/Notification');
const emailService = require('./emailService');

let ioInstance = null;

// Configure web push only if VAPID keys are provided and valid
if (process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT &&
    process.env.VAPID_PUBLIC_KEY.length > 10) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('Web push configured successfully');
  } catch (error) {
    console.warn('Web push configuration failed:', error.message);
  }
}

// Configure Twilio only if credentials are provided
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

class NotificationService {
  // Set the io instance for dependency injection
  setIo(io) {
    ioInstance = io;
  }

  setIo(io) {
    ioInstance = io;
  }
  
  // Send notification through multiple channels
  async sendNotification(userId, notificationData) {
    try {
      // Get user preferences
      const preferences = await NotificationPreferences.findOne({ user: userId });
      if (!preferences) {
        await this.createDefaultPreferences(userId);
      }

      // Create notification record
      const notification = new Notification({
        user: userId,
        ...notificationData,
        channels: this.determineChannels(notificationData.type, preferences)
      });

      await notification.save();

      // Send through enabled channels
      const deliveryPromises = [];

      if (notification.channels.includes('in_app')) {
        deliveryPromises.push(this.sendInAppNotification(notification));
      }

      if (notification.channels.includes('email') && preferences?.channels.email.enabled) {
        deliveryPromises.push(this.sendEmailNotification(notification, preferences));
      }

      if (notification.channels.includes('push') && preferences?.channels.push.enabled) {
        deliveryPromises.push(this.sendPushNotification(notification, preferences));
      }

      if (notification.channels.includes('sms') && preferences?.channels.sms.enabled) {
        deliveryPromises.push(this.sendSMSNotification(notification, preferences));
      }

      if (notification.channels.includes('webhook') && preferences?.channels.webhook.enabled) {
        deliveryPromises.push(this.sendWebhookNotification(notification, preferences));
      }

      // Wait for all deliveries
      await Promise.allSettled(deliveryPromises);

      return notification;
    } catch (error) {
      console.error('Notification service error:', error);
      throw error;
    }
  }

  // Send in-app notification via Socket.IO
  async sendInAppNotification(notification) {
    try {
      const io = ioInstance;
      if (io) {
        io.to(`user_${notification.user}`).emit('notification', {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          data: notification.data,
          timestamp: notification.createdAt
        });
      }

      // Mark as delivered
      notification.delivered.in_app = true;
      notification.deliveredAt.in_app = new Date();
      await notification.save();

      return true;
    } catch (error) {
      console.error('In-app notification error:', error);
      return false;
    }
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