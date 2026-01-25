# 🚀 ExpenseFlow Backend Documentation

This document provides comprehensive information about the ExpenseFlow backend architecture, API endpoints, middleware, services, and setup instructions.

## 📋 Table of Contents

- [Backend Overview](#backend-overview)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [Expenses](#expenses)
  - [Budgets](#budgets)
  - [Goals](#goals)
  - [Receipts](#receipts)
  - [Analytics](#analytics)
  - [Currency](#currency)
  - [Notifications](#notifications)
- [Middleware](#middleware)
- [Services](#services)
- [Real-time Features](#real-time-features)
- [Security](#security)
- [Deployment](#deployment)

## 🏗️ Backend Overview

ExpenseFlow backend is built with **Node.js** and **Express.js**, providing a robust REST API with real-time capabilities. The backend handles:

- User authentication and authorization
- Financial data management (expenses, budgets, goals)
- File uploads and OCR processing
- Real-time synchronization across devices
- Multi-channel notifications
- Currency conversion and analytics
- Security monitoring and rate limiting

### Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **Validation**: Joi
- **Security**: Helmet, Rate Limiting, Input Sanitization

## 🏛️ Architecture

### Application Structure

```
backend/
├── server.js                 # Main application entry point
├── routes/                   # API route handlers
│   ├── auth.js              # Authentication routes
│   ├── expenses.js          # Expense management
│   ├── budgets.js           # Budget management
│   ├── goals.js             # Goal tracking
│   ├── receipts.js          # Receipt upload
│   ├── analytics.js         # Analytics endpoints
│   ├── currency.js          # Currency conversion
│   ├── notifications.js     # Notification management
│   └── sync.js              # Real-time sync
├── middleware/              # Express middleware
│   ├── auth.js              # JWT authentication
│   ├── rateLimit.js         # Rate limiting
│   ├── sanitization.js      # Input sanitization
│   └── securityMonitor.js   # Security monitoring
├── services/                # Business logic services
│   ├── emailService.js      # Email notifications
│   ├── currencyService.js   # Currency conversion
│   ├── budgetService.js     # Budget calculations
│   ├── analyticsService.js  # Analytics processing
│   └── notificationService.js # Notification management
├── models/                  # MongoDB schemas
└── package.json             # Dependencies
```

### Request Flow

```
Client Request → Middleware → Route Handler → Service → Database → Response
                      ↓
                Security Monitoring
                      ↓
               Real-time Broadcasting
```

## ⚙️ Setup Instructions

### Prerequisites

- Node.js 16 or higher
- MongoDB 4.4 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/expenseflow.git
   cd expenseflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory:

   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/expenseflow

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d

   # Server
   PORT=3000
   NODE_ENV=development

   # Email Service (for notifications)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password

   # Cloudinary (for file uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Currency API
   EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000

   # Twilio (for SMS notifications - optional)
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=your-twilio-number
   ```

4. **Start MongoDB**
   ```bash
   # Using local MongoDB
   mongod

   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All API endpoints (except authentication) require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST /api/auth/login
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Expenses

#### GET /api/expenses
Get all expenses for authenticated user.

**Response:**
```json
[
  {
    "_id": "expense-id",
    "description": "Lunch at restaurant",
    "amount": 25.50,
    "originalAmount": 25.50,
    "originalCurrency": "USD",
    "displayAmount": 25.50,
    "displayCurrency": "USD",
    "category": "food",
    "type": "expense",
    "date": "2024-01-15T12:00:00.000Z",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
]
```

#### POST /api/expenses
Create a new expense.

**Request Body:**
```json
{
  "description": "Grocery shopping",
  "amount": 85.30,
  "currency": "USD",
  "category": "food",
  "type": "expense",
  "date": "2024-01-15"
}
```

**Response:** Expense object with ID and timestamps.

#### PUT /api/expenses/:id
Update an existing expense.

**Request Body:** Same as POST, with optional fields.

#### DELETE /api/expenses/:id
Delete an expense.

### Budgets

#### GET /api/budgets
Get all budgets for authenticated user.

#### POST /api/budgets
Create a new budget.

**Request Body:**
```json
{
  "name": "Monthly Food Budget",
  "category": "food",
  "amount": 500,
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "alertThreshold": 80
}
```

#### PUT /api/budgets/:id
Update a budget.

#### DELETE /api/budgets/:id
Delete a budget.

### Goals

#### GET /api/goals
Get all financial goals for authenticated user.

#### POST /api/goals
Create a new financial goal.

**Request Body:**
```json
{
  "title": "Emergency Fund",
  "description": "Save for emergencies",
  "targetAmount": 10000,
  "goalType": "savings",
  "targetDate": "2024-12-31",
  "priority": "high"
}
```

#### PUT /api/goals/:id
Update a goal.

#### DELETE /api/goals/:id
Delete a goal.

### Receipts

#### POST /api/receipts
Upload a receipt image for OCR processing.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `receipt`: Image file (PNG, JPG, JPEG, PDF)
- `expenseId`: Associated expense ID

**Response:**
```json
{
  "_id": "receipt-id",
  "filename": "receipt-123456.jpg",
  "fileUrl": "https://cloudinary.com/...",
  "fileType": "image",
  "ocrData": {
    "extractedText": "Total: $25.50",
    "extractedAmount": 25.50,
    "confidence": 0.85
  }
}
```

### Analytics

#### GET /api/analytics/dashboard
Get dashboard analytics data.

**Response:**
```json
{
  "totalBalance": 15420.50,
  "monthlyIncome": 5000,
  "monthlyExpenses": 3200,
  "savingsRate": 36,
  "categoryBreakdown": [
    { "category": "food", "amount": 800, "percentage": 25 },
    { "category": "transport", "amount": 600, "percentage": 18.75 }
  ],
  "monthlyTrend": [
    { "month": "2024-01", "income": 5000, "expenses": 3200 }
  ]
}
```

#### GET /api/analytics/spending/:period
Get spending analytics for a specific period.

**Parameters:**
- `period`: `weekly`, `monthly`, `yearly`

### Currency

#### GET /api/currency/rates
Get current exchange rates.

**Query Parameters:**
- `base`: Base currency (default: USD)
- `symbols`: Comma-separated target currencies

**Response:**
```json
{
  "base": "USD",
  "rates": {
    "EUR": 0.85,
    "GBP": 0.73,
    "INR": 83.12
  },
  "lastUpdated": "2024-01-15T10:00:00.000Z"
}
```

#### POST /api/currency/convert
Convert amount between currencies.

**Request Body:**
```json
{
  "amount": 100,
  "from": "USD",
  "to": "EUR"
}
```

**Response:**
```json
{
  "originalAmount": 100,
  "convertedAmount": 85,
  "exchangeRate": 0.85,
  "from": "USD",
  "to": "EUR"
}
```

### Groups

#### POST /api/groups
Create a new group.

**Request Body:**
```json
{
  "name": "Trip to Paris",
  "description": "Group expenses for our Paris vacation",
  "currency": "EUR",
  "settings": {
    "allowPublicExpenses": false,
    "requireApproval": false,
    "defaultSplitMethod": "equal"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Group created successfully",
  "data": {
    "_id": "group-id",
    "name": "Trip to Paris",
    "description": "Group expenses for our Paris vacation",
    "createdBy": "user-id",
    "members": [
      {
        "user": "user-id",
        "role": "admin",
        "joinedAt": "2024-01-15T10:00:00.000Z",
        "isActive": true
      }
    ],
    "currency": "EUR",
    "settings": {
      "allowPublicExpenses": false,
      "requireApproval": false,
      "defaultSplitMethod": "equal"
    }
  }
}
```

#### GET /api/groups
Get user's groups.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "group-id",
      "name": "Trip to Paris",
      "description": "Group expenses for our Paris vacation",
      "memberCount": 3,
      "totalExpenses": 5,
      "currency": "EUR",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

#### GET /api/groups/:id
Get group details.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "group-id",
    "name": "Trip to Paris",
    "members": [
      {
        "user": { "_id": "user-id", "name": "John Doe", "email": "john@example.com" },
        "role": "admin",
        "joinedAt": "2024-01-15T10:00:00.000Z",
        "isActive": true
      }
    ],
    "expenses": [
      {
        "expense": "expense-id",
        "addedBy": "user-id",
        "addedAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

#### POST /api/groups/:id/members
Add member to group.

**Request Body:**
```json
{
  "email": "friend@example.com"
}
```

#### DELETE /api/groups/:id/members/:memberId
Remove member from group.

#### GET /api/groups/:id/statistics
Get group statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMembers": 3,
    "totalExpenses": 5,
    "totalAmount": 450.50,
    "currency": "EUR",
    "memberContributions": [
      { "user": "user-id", "name": "John Doe", "totalAmount": 150.17, "expenseCount": 2 }
    ]
  }
}
```

### Expense Splitting

#### POST /api/splits
Create expense split.

**Request Body:**
```json
{
  "expenseId": "expense-id",
  "groupId": "group-id",
  "splitMethod": "equal",
  "notes": "Dinner at restaurant"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Expense split created successfully",
  "data": {
    "_id": "split-id",
    "expense": {
      "description": "Restaurant dinner",
      "amount": 75.00
    },
    "participants": [
      {
        "user": { "_id": "user-id", "name": "John Doe" },
        "amount": 25.00,
        "isPaid": true,
        "paidAt": "2024-01-15T10:00:00.000Z"
      },
      {
        "user": { "_id": "user-id-2", "name": "Jane Smith" },
        "amount": 25.00,
        "isPaid": false
      }
    ],
    "status": "partial",
    "totalAmount": 75.00
  }
}
```

#### GET /api/splits
Get user's pending splits.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "split-id",
      "expense": {
        "description": "Restaurant dinner",
        "amount": 75.00,
        "category": "food"
      },
      "group": { "name": "Trip to Paris" },
      "participants": [
        {
          "user": { "name": "John Doe" },
          "amount": 25.00,
          "isPaid": false
        }
      ],
      "status": "pending"
    }
  ]
}
```

#### PATCH /api/splits/:id/pay
Mark user as paid.

**Response:**
```json
{
  "success": true,
  "message": "Payment marked successfully",
  "data": { /* updated split object */ }
}
```

#### POST /api/splits/:id/remind/:participantId
Send payment reminder.

#### GET /api/splits/statistics/user
Get user's split statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSplits": 10,
    "pendingPayments": 3,
    "completedPayments": 7,
    "totalOwed": 125.50,
    "totalOwedTo": 89.25,
    "pendingSplits": [
      {
        "splitId": "split-id",
        "expense": "Restaurant dinner",
        "amount": 25.00,
        "group": "Trip to Paris"
      }
    ]
  }
}
```

### Notifications

#### GET /api/notifications
Get user notifications.

**Query Parameters:**
- `read`: `true`/`false` (filter by read status)
- `limit`: Number of notifications to return

#### PUT /api/notifications/:id/read
Mark notification as read.

#### POST /api/notifications/preferences
Update notification preferences.

**Request Body:**
```json
{
  "channels": {
    "email": {
      "enabled": true,
      "types": ["budget_alert", "goal_achieved"]
    },
    "push": {
      "enabled": true,
      "subscription": { /* Push subscription object */ }
    }
  }
}
```

## 🛡️ Middleware

### Authentication Middleware (`middleware/auth.js`)

Validates JWT tokens and attaches user information to requests.

```javascript
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Rate Limiting (`middleware/rateLimiter.js`)

Implements different rate limits for various endpoints:

- **General**: 1000 requests per 15 minutes
- **Auth**: 5 attempts per 15 minutes
- **Expense operations**: 100 per 15 minutes
- **File uploads**: 10 per hour

### Input Sanitization (`middleware/sanitization.js`)

- MongoDB injection prevention
- XSS protection
- Input validation using Joi schemas

### Security Monitoring (`middleware/securityMonitor.js`)

- Logs suspicious activities
- Blocks IP addresses with excessive failed attempts
- Monitors for security threats

## 🔧 Services

### Email Service (`services/emailService.js`)

Handles email notifications using Nodemailer:

- Welcome emails for new users
- Budget alerts
- Goal achievement notifications
- Security alerts

### Currency Service (`services/currencyService.js`)

Manages currency conversion:

- Fetches rates from external APIs
- Caches rates in MongoDB with TTL
- Handles currency validation and conversion

### Budget Service (`services/budgetService.js`)

Manages budget calculations:

- Updates spending against budgets
- Triggers alerts when thresholds are reached
- Calculates goal progress

### Analytics Service (`services/analyticsService.js`)

Processes financial data for insights:

- Category spending analysis
- Trend calculations
- Forecasting and recommendations

### Notification Service (`services/notificationService.js`)

Manages multi-channel notifications:

- In-app notifications
- Email notifications
- Push notifications (web)
- SMS notifications (optional)

## 🔄 Real-time Features

### Socket.IO Integration

The backend uses Socket.IO for real-time communication:

```javascript
// Server-side connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.user.name} connected`);

  // Join user-specific room
  socket.join(`user_${socket.userId}`);

  // Handle sync requests
  socket.on('sync_request', async (data) => {
    // Process sync queue
  });
});
```

### Real-time Events

- `expense_created`: Broadcast when new expense is added
- `expense_updated`: Broadcast when expense is modified
- `expense_deleted`: Broadcast when expense is removed
- `sync_data`: Send pending sync data to client

### Cross-device Synchronization

- Uses SyncQueue model to track changes
- Supports CREATE, UPDATE, DELETE operations
- Device-specific conflict resolution

## 🔒 Security

### Security Measures

1. **Authentication & Authorization**
   - JWT-based authentication
   - Password hashing with bcrypt
   - Route-level authorization

2. **Input Validation & Sanitization**
   - Joi schema validation
   - MongoDB injection prevention
   - XSS protection

3. **Rate Limiting**
   - API rate limiting by endpoint
   - Brute force protection on auth routes

4. **Security Headers**
   - Helmet.js for security headers
   - CORS configuration
   - Content Security Policy

5. **Monitoring & Logging**
   - Security event logging
   - Failed login attempt tracking
   - Suspicious activity monitoring

### Environment Security

- Sensitive data stored in environment variables
- No secrets committed to version control
- Secure random JWT secrets

## 🚀 Deployment

### Production Setup

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Configure production database URL
   - Set secure JWT secret
   - Configure email and cloud services

2. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name expenseflow-backend
   ```

3. **Reverse Proxy (nginx)**
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

4. **SSL Certificate**
   - Use Let's Encrypt for free SSL
   - Configure HTTPS redirection

### Docker Deployment

```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

### Cloud Platforms

- **Railway**: Direct GitHub deployment
- **Heroku**: Git-based deployment
- **AWS/DigitalOcean**: Docker container deployment
- **Vercel**: Serverless function deployment

### Monitoring

- **Application Monitoring**: PM2 monitoring
- **Error Tracking**: Winston logging
- **Performance Monitoring**: Custom middleware
- **Database Monitoring**: MongoDB Atlas monitoring

This backend architecture provides a scalable, secure, and feature-rich foundation for the ExpenseFlow application, supporting all frontend requirements while maintaining high performance and reliability.
