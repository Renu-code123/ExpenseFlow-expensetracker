const webpush = require('web-push');
const twilio = require('twilio');
const axios = require('axios');
const { Notification, NotificationPreferences } = require('../models/Notification');
const emailService = require('./emailService');

// Configure web push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Configure Twilio
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

class NotificationService {
  
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
      const io = global.io;
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

  // Send email notification
  async sendEmailNotification(notification, preferences) {
    try {
      const User = require('../models/User');
      const user = await User.findById(notification.user);
      
      if (!user) return false;

      const emailData = {
        to: user.email,
        subject: `ExpenseFlow: ${notification.title}`,
        html: this.generateEmailTemplate(notification)
      };

      await emailService.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        ...emailData
      });

      // Mark as delivered
      notification.delivered.email = true;
      notification.deliveredAt.email = new Date();
      await notification.save();

      return true;
    } catch (error) {
      console.error('Email notification error:', error);
      return false;
    }
  }

  // Send push notification
  async sendPushNotification(notification, preferences) {
    try {
      const subscription = preferences.channels.push.subscription;
      if (!subscription) return false;

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
          notificationId: notification._id,
          type: notification.type,
          ...notification.data
        },
        actions: [
          { action: 'view', title: 'View Details' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });

      await webpush.sendNotification(subscription, payload);

      // Mark as delivered
      notification.delivered.push = true;
      notification.deliveredAt.push = new Date();
      await notification.save();

      return true;
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  // Send SMS notification
  async sendSMSNotification(notification, preferences) {
    try {
      const phoneNumber = preferences.channels.sms.phoneNumber;
      if (!phoneNumber) return false;

      const message = `ExpenseFlow Alert: ${notification.title}\n${notification.message}`;

      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      // Mark as delivered
      notification.delivered.sms = true;
      notification.deliveredAt.sms = new Date();
      await notification.save();

      return true;
    } catch (error) {
      console.error('SMS notification error:', error);
      return false;
    }
  }

  // Send webhook notification
  async sendWebhookNotification(notification, preferences) {
    try {
      const webhookUrl = preferences.channels.webhook.url;
      const secret = preferences.channels.webhook.secret;
      
      if (!webhookUrl) return false;

      const payload = {
        event: 'notification',
        timestamp: new Date().toISOString(),
        notification: {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          data: notification.data
        },
        user: notification.user
      };

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'ExpenseFlow-Webhook/1.0'
      };

      if (secret) {
        const crypto = require('crypto');
        const signature = crypto.createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-ExpenseFlow-Signature'] = `sha256=${signature}`;
      }

      await axios.post(webhookUrl, payload, { 
        headers,
        timeout: 10000
      });

      // Mark as delivered
      notification.delivered.webhook = true;
      notification.deliveredAt.webhook = new Date();
      await notification.save();

      return true;
    } catch (error) {
      console.error('Webhook notification error:', error);
      return false;
    }
  }

  // Determine which channels to use based on type and preferences
  determineChannels(type, preferences) {
    const channels = ['in_app']; // Always include in-app

    if (!preferences) return channels;

    // Add email if enabled for this type
    if (preferences.channels.email.enabled && 
        preferences.channels.email.types.includes(type)) {
      channels.push('email');
    }

    // Add push if enabled for this type
    if (preferences.channels.push.enabled && 
        preferences.channels.push.types.includes(type)) {
      channels.push('push');
    }

    // Add SMS for critical notifications
    if (preferences.channels.sms.enabled && 
        preferences.channels.sms.types.includes(type)) {
      channels.push('sms');
    }

    // Add webhook if enabled for this type
    if (preferences.channels.webhook.enabled && 
        preferences.channels.webhook.types.includes(type)) {
      channels.push('webhook');
    }

    return channels;
  }

  // Create default notification preferences
  async createDefaultPreferences(userId) {
    const defaultPreferences = new NotificationPreferences({
      user: userId,
      channels: {
        email: {
          enabled: true,
          types: ['budget_alert', 'goal_achieved', 'security_alert', 'system']
        },
        push: {
          enabled: true,
          types: ['budget_alert', 'goal_achieved', 'expense_added']
        },
        sms: {
          enabled: false,
          types: ['security_alert']
        },
        webhook: {
          enabled: false,
          types: []
        }
      }
    });

    await defaultPreferences.save();
    return defaultPreferences;
  }

  // Generate email template for notifications
  generateEmailTemplate(notification) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #667eea; color: white; padding: 20px; text-align: center;">
          <h2>${notification.title}</h2>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <p style="font-size: 16px; line-height: 1.5;">${notification.message}</p>
          ${notification.data ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 15px;">
              <h4>Additional Details:</h4>
              <pre style="background: #f1f1f1; padding: 10px; border-radius: 3px; overflow-x: auto;">
                ${JSON.stringify(notification.data, null, 2)}
              </pre>
            </div>
          ` : ''}
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              Open ExpenseFlow
            </a>
          </div>
        </div>
        <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated notification from ExpenseFlow.</p>
        </div>
      </div>
    `;
  }

  // Get user notifications with pagination
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    
    const query = { user: userId };
    if (unreadOnly) query.read = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    return notification;
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { user: userId, read: false },
      { read: true, readAt: new Date() }
    );

    return true;
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    await Notification.findOneAndDelete({ _id: notificationId, user: userId });
    return true;
  }
}

module.exports = new NotificationService();