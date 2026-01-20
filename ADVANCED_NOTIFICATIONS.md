# ExpenseFlow Advanced Notification System

## Features Implemented

### 🔔 Multi-Channel Notification System
- In-app notifications with real-time updates
- Push notifications for web/mobile apps
- SMS notifications for critical alerts
- Email notifications with rich templates
- Webhook integrations for third-party services
- Comprehensive notification preferences and scheduling

## New Files Created

### Backend Files:
1. **`models/Notification.js`** - Notification and preferences models
2. **`services/notificationService.js`** - Multi-channel notification delivery
3. **`routes/notifications.js`** - Notification management API endpoints

### Frontend Files:
1. **`notification-center.js`** - Complete notification center UI with real-time updates
2. **`sw-notifications.js`** - Service worker for push notifications

### Updated Files:
1. **`server.js`** - Integrated notification service and global Socket.IO access
2. **`package.json`** - Added notification dependencies
3. **`.env`** - Added notification service configurations

## Notification Channels

### ✅ In-App Notifications
- **Real-time Updates** - Socket.IO integration for instant notifications
- **Notification Center** - Dedicated UI with filtering and pagination
- **Toast Notifications** - Non-intrusive popup alerts
- **Read/Unread Status** - Track notification engagement
- **Priority Levels** - Visual indicators for importance

### ✅ Push Notifications
- **Web Push API** - Browser push notifications using VAPID
- **Service Worker** - Background notification handling
- **Rich Notifications** - Custom actions and data payload
- **Permission Management** - User consent and subscription handling
- **Cross-Device Support** - Works on desktop and mobile browsers

### ✅ SMS Notifications
- **Twilio Integration** - Reliable SMS delivery service
- **Critical Alerts Only** - Budget overruns and security alerts
- **Phone Number Validation** - International format support
- **Delivery Tracking** - Success/failure status monitoring

### ✅ Email Notifications
- **Rich HTML Templates** - Professional email formatting
- **Multiple Notification Types** - Budget, goals, security, system alerts
- **Delivery Tracking** - Email sent status monitoring
- **Unsubscribe Options** - User preference management

### ✅ Webhook Integration
- **Third-party Services** - Send notifications to external systems
- **Secure Delivery** - HMAC signature verification
- **Custom Payloads** - Structured JSON data format
- **Retry Logic** - Automatic retry on delivery failures
- **Timeout Handling** - Configurable request timeouts

## API Endpoints

### Notification Management:
- **GET /api/notifications** - Get user notifications with pagination
- **GET /api/notifications/unread-count** - Get unread notification count
- **PATCH /api/notifications/:id/read** - Mark notification as read
- **PATCH /api/notifications/mark-all-read** - Mark all notifications as read
- **DELETE /api/notifications/:id** - Delete specific notification
- **POST /api/notifications/test** - Send test notification

### Notification Preferences:
- **GET /api/notifications/preferences** - Get user notification preferences
- **PUT /api/notifications/preferences** - Update notification preferences
- **POST /api/notifications/push/subscribe** - Subscribe to push notifications
- **POST /api/notifications/push/unsubscribe** - Unsubscribe from push notifications
- **GET /api/notifications/push/vapid-key** - Get VAPID public key

## Notification Types

### System Notifications:
- **budget_alert** - Budget threshold exceeded
- **goal_achieved** - Financial goal completed
- **expense_added** - New expense recorded
- **security_alert** - Security-related events
- **system** - System maintenance and updates
- **custom** - User-defined notifications

### Priority Levels:
- **Low** - General information updates
- **Medium** - Standard notifications (default)
- **High** - Important alerts requiring attention
- **Critical** - Urgent notifications requiring immediate action

## User Preferences

### Channel Configuration:
```javascript
{
  channels: {
    email: {
      enabled: true,
      types: ['budget_alert', 'goal_achieved', 'security_alert']
    },
    push: {
      enabled: true,
      subscription: { /* push subscription object */ },
      types: ['budget_alert', 'goal_achieved', 'expense_added']
    },
    sms: {
      enabled: false,
      phoneNumber: '+1234567890',
      types: ['budget_alert', 'security_alert']
    },
    webhook: {
      enabled: false,
      url: 'https://your-webhook-url.com',
      secret: 'webhook-secret',
      types: ['budget_alert', 'goal_achieved']
    }
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'UTC'
  },
  frequency: {
    budget_alerts: 'immediate',
    goal_updates: 'daily',
    expense_summaries: 'weekly'
  }
}
```

## Real-time Features

### Socket.IO Integration:
- **Live Notifications** - Instant delivery via WebSocket
- **Connection Management** - Automatic reconnection handling
- **User Rooms** - Isolated notification channels per user
- **Event Broadcasting** - Real-time updates across devices

### Notification Center UI:
- **Unread Badge** - Visual indicator for new notifications
- **Filter Options** - Filter by type, read status, priority
- **Pagination** - Load more notifications on demand
- **Mark as Read** - Individual and bulk read operations
- **Delete Actions** - Remove unwanted notifications

## Setup Instructions

1. **Install dependencies:**
```bash
npm install web-push twilio axios
```

2. **Configure environment variables:**
```env
# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@expenseflow.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

3. **Generate VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

4. **Include frontend scripts:**
```html
<script src="notification-center.js"></script>
```

## Webhook Integration

### Payload Format:
```javascript
{
  event: 'notification',
  timestamp: '2024-01-19T10:30:00.000Z',
  notification: {
    id: '507f1f77bcf86cd799439011',
    title: 'Budget Alert',
    message: 'You have exceeded 80% of your food budget',
    type: 'budget_alert',
    priority: 'high',
    data: { category: 'food', spent: 8500, budget: 10000 }
  },
  user: '507f1f77bcf86cd799439012'
}
```

### Security:
- **HMAC Signatures** - Verify webhook authenticity
- **HTTPS Required** - Secure delivery endpoints
- **Timeout Protection** - 10-second request timeout
- **Retry Logic** - Automatic retry on failures

## Benefits

🔔 **Multi-Channel Delivery** - Reach users through their preferred channels  
📱 **Real-time Updates** - Instant notifications via Socket.IO and push  
⚙️ **Flexible Preferences** - Granular control over notification types and timing  
🔒 **Secure Integration** - HMAC signatures and encrypted delivery  
📊 **Delivery Tracking** - Monitor notification success rates  
🎯 **Smart Filtering** - Priority-based and type-based notification routing  

The advanced notification system transforms ExpenseFlow into a comprehensive communication platform with enterprise-grade notification capabilities across multiple channels.

**Resolves: #59**