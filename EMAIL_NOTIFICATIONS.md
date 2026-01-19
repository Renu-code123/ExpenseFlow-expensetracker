# ExpenseFlow Email Notifications System

## Features Implemented

### 📧 Email Notification System
- Welcome emails on user registration
- Monthly expense summary reports
- Weekly spending reports
- Budget limit alerts
- Password reset emails (structure ready)

## New Files Created

### Backend Files:
1. **`services/emailService.js`** - Complete email service with templates
2. **`services/cronJobs.js`** - Automated email scheduling
3. **`routes/notifications.js`** - Manual email trigger endpoints
4. **Updated `routes/auth.js`** - Welcome email on registration
5. **Updated `server.js`** - Cron jobs initialization
6. **Updated `package.json`** - Added nodemailer and node-cron
7. **Updated `.env`** - Email configuration variables

## Email Types

### ✅ Welcome Email
- Sent automatically on user registration
- Includes getting started guide
- Professional HTML template

### ✅ Monthly Reports
- Automated on 1st of every month at 10 AM
- Total income, expenses, and balance
- Top 5 spending categories
- Financial health summary

### ✅ Weekly Reports
- Automated every Sunday at 9 AM
- Daily spending breakdown
- Weekly total and daily average
- Spending pattern insights

### ✅ Budget Alerts
- Daily check at 8 PM
- Triggered at 80% budget usage
- Category-wise spending alerts
- Remaining budget information

### ✅ Password Reset (Ready)
- Secure reset token generation
- Time-limited reset links
- Professional email template

## API Endpoints

### Manual Email Triggers:
- **POST /api/notifications/test** - Send test welcome email
- **POST /api/notifications/monthly-report** - Generate monthly report
- **POST /api/notifications/weekly-report** - Generate weekly report

## Automated Schedules

### Cron Job Schedule:
```javascript
// Weekly reports - Every Sunday at 9 AM
'0 9 * * 0'

// Monthly reports - 1st day of month at 10 AM  
'0 10 1 * *'

// Budget alerts - Daily at 8 PM
'0 20 * * *'
```

## Setup Instructions

1. **Install dependencies:**
```bash
npm install nodemailer node-cron
```

2. **Configure email in `.env`:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=ExpenseFlow <noreply@expenseflow.com>
```

3. **Gmail Setup:**
   - Enable 2-factor authentication
   - Generate app-specific password
   - Use app password in EMAIL_PASS

## Email Templates

### Professional HTML Templates:
- **Responsive design** - Works on all devices
- **Brand colors** - Consistent with ExpenseFlow theme
- **Rich formatting** - Tables, charts, and visual elements
- **Call-to-action buttons** - Interactive elements
- **Financial data** - Formatted currency and percentages

## Usage Examples

### Welcome Email:
```javascript
await emailService.sendWelcomeEmail(user);
```

### Monthly Report:
```javascript
const reportData = {
  totalExpenses: 25000,
  totalIncome: 50000,
  balance: 25000,
  topCategories: [...]
};
await emailService.sendMonthlyReport(user, reportData);
```

### Budget Alert:
```javascript
await emailService.sendBudgetAlert(user, 'food', 8500, 10000);
```

## Benefits

📧 **Automated Communication** - Users stay informed without manual intervention  
📊 **Financial Insights** - Regular spending analysis and trends  
⚠️ **Proactive Alerts** - Budget warnings before overspending  
🎯 **User Engagement** - Regular touchpoints to maintain app usage  
📱 **Multi-channel** - Email + in-app notifications  

The email notification system ensures users stay connected with their financial data and receive timely insights to make better spending decisions.

**Resolves: #47**