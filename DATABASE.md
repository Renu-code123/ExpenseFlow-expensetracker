# 🗄️ ExpenseFlow Database Documentation

This document provides comprehensive information about the ExpenseFlow MongoDB database schema, including all models, their relationships, and setup instructions.

## 📋 Table of Contents

- [Database Overview](#database-overview)
- [Setup Instructions](#setup-instructions)
- [Data Models](#data-models)
  - [User Model](#user-model)
  - [Expense Model](#expense-model)
  - [Budget Model](#budget-model)
  - [Goal Model](#goal-model)
  - [Receipt Model](#receipt-model)
  - [Notification Models](#notification-models)
  - [Currency Rate Model](#currency-rate-model)
  - [Sync Queue Model](#sync-queue-model)
  - [Category Pattern Model](#category-pattern-model)
- [Database Relationships](#database-relationships)
- [Indexes and Performance](#indexes-and-performance)

## 🗃️ Database Overview


ExpenseFlow uses **MongoDB** as its primary database with **Mongoose ODM** for schema definition and data validation. The database is designed to handle:

- User authentication and profiles
- Financial transaction management
- Budget tracking and alerts
- Goal setting and progress monitoring
- Receipt storage and OCR data
- Multi-channel notifications
- Real-time synchronization
- Currency conversion
- AI-powered categorization

For security, compliance, monitoring, and audit details, see [SETUP_AND_SECURITY.md](SETUP_AND_SECURITY.md).

### Key Design Principles

- **Document-based structure** for flexible financial data
- **Referential integrity** through Mongoose population
- **Indexing** for optimal query performance
- **Validation** at the schema level
- **Timestamps** for audit trails
- **Soft deletes** where applicable

## ⚙️ Setup Instructions

### Prerequisites

- MongoDB 4.4+ installed and running
- Node.js 16+ installed
- Environment variables configured

### Environment Configuration

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/expenseflow
# Or for cloud MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Other required environment variables...
```

### Database Connection

The application connects to MongoDB using Mongoose in `server.js`:

```javascript
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
```

### Initial Setup

1. Start MongoDB service
2. Run the application: `npm start`
3. The database and collections will be created automatically on first use

## 📊 Data Models

### User Model

**File:** `models/User.js`

The User model handles authentication and user profile information.

```javascript
{
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  preferredCurrency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true
  },
  currencySettings: {
    locale: {
      type: String,
      default: 'en-IN'
    },
    decimalPlaces: {
      type: Number,
      default: 2,
      min: 0,
      max: 4
    }
  }
}
```

**Key Features:**
- Password hashing with bcrypt
- Email uniqueness validation
- Currency preferences for localization
- Automatic timestamps

**Relationships:**
- Referenced by: Expense, Budget, Goal, Receipt, Notification, CategoryPattern

### Expense Model

**File:** `models/Expense.js`

Core model for financial transactions.

```javascript
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  originalAmount: {
    type: Number,
    required: true,
    min: 0.01
  },
  originalCurrency: {
    type: String,
    required: true,
    default: 'INR',
    uppercase: true
  },
  convertedAmount: {
    type: Number,
    min: 0.01
  },
  convertedCurrency: {
    type: String,
    uppercase: true
  },
  exchangeRate: {
    type: Number,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other']
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  date: {
    type: Date,
    default: Date.now
  }
}
```

**Key Features:**
- Multi-currency support with automatic conversion
- Category-based organization
- Income/expense classification
- User ownership validation

**Relationships:**
- Belongs to: User
- Referenced by: Receipt

### Budget Model

**File:** `models/Budget.js`

Manages spending limits and tracking.

```javascript
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other', 'all'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  period: {
    type: String,
    enum: ['monthly', 'weekly', 'yearly'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  alertThreshold: {
    type: Number,
    default: 80,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  spent: {
    type: Number,
    default: 0
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}
```

**Key Features:**
- Flexible budgeting periods
- Category-specific or overall budgets
- Alert thresholds for notifications
- Automatic spending calculations

**Relationships:**
- Belongs to: User

**Indexes:**
- `{ user: 1, category: 1, period: 1 }`

### Goal Model

**File:** `models/Goal.js`

Financial goal setting and progress tracking.

```javascript
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  goalType: {
    type: String,
    enum: ['savings', 'expense_reduction', 'income_increase', 'debt_payoff'],
    required: true
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other', 'general'],
    default: 'general'
  },
  targetDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  milestones: [{
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    achieved: {
      type: Boolean,
      default: false
    },
    achievedDate: Date
  }],
  reminderFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'none'],
    default: 'weekly'
  }
}
```

**Key Features:**
- Progress tracking with milestones
- Goal categorization and prioritization
- Reminder system integration
- Virtual progress percentage calculation

**Relationships:**
- Belongs to: User

**Virtual Fields:**
- `progressPercentage`: Calculated completion percentage
- `isOverdue`: Checks if goal is past target date

### Receipt Model

**File:** `models/Receipt.js`

Document storage for expense receipts.

```javascript
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['image', 'pdf'],
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  ocrData: {
    extractedText: String,
    extractedAmount: Number,
    extractedDate: Date,
    confidence: Number
  }
}
```

**Key Features:**
- Cloudinary integration for file storage
- OCR data extraction and storage
- File type validation
- Expense association

**Relationships:**
- Belongs to: User, Expense

### Notification Models

**File:** `models/Notification.js`

Two related models for notification management.

#### Notification Schema
```javascript
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['budget_alert', 'goal_achieved', 'expense_added', 'security_alert', 'system', 'custom'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms', 'webhook']
  }],
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  delivered: {
    in_app: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    webhook: { type: Boolean, default: false }
  },
  deliveredAt: {
    in_app: Date,
    email: Date,
    push: Date,
    sms: Date,
    webhook: Date
  },
  scheduledFor: Date,
  expiresAt: Date
}
```

#### NotificationPreferences Schema
```javascript
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  channels: {
    email: {
      enabled: { type: Boolean, default: true },
      types: [{
        type: String,
        enum: ['budget_alert', 'goal_achieved', 'expense_added', 'security_alert', 'system']
      }]
    },
    push: {
      enabled: { type: Boolean, default: true },
      subscription: mongoose.Schema.Types.Mixed,
      types: [{
        type: String,
        enum: ['budget_alert', 'goal_achieved', 'expense_added', 'security_alert', 'system']
      }]
    },
    sms: {
      enabled: { type: Boolean, default: false },
      phoneNumber: String,
      types: [{
        type: String,
        enum: ['budget_alert', 'security_alert', 'system']
      }]
    },
    webhook: {
      enabled: { type: Boolean, default: false },
      url: String,
      secret: String,
      types: [{
        type: String,
        enum: ['budget_alert', 'goal_achieved', 'expense_added', 'security_alert', 'system']
      }]
    }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: String,
    end: String,
    timezone: { type: String, default: 'UTC' }
  },
  frequency: {
    budget_alerts: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' },
    goal_updates: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'daily' },
    expense_summaries: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' }
  }
}
```

**Key Features:**
- Multi-channel notification delivery
- User preference management
- Scheduled and real-time notifications
- Delivery tracking and status

**Relationships:**
- Belongs to: User

**Indexes:**
- `{ user: 1, createdAt: -1 }`
- `{ scheduledFor: 1 }`
- `{ expiresAt: 1 }` (TTL index)

### Currency Rate Model

**File:** `models/CurrencyRate.js`

Exchange rate caching and management.

```javascript
{
  baseCurrency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  rates: {
    type: Map,
    of: Number,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    required: true
  },
  source: {
    type: String,
    default: 'exchangerate-api.com'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}
```

**Key Features:**
- Cached exchange rates with TTL
- Map-based rate storage for flexibility
- Automatic expiration handling

**Indexes:**
- `{ baseCurrency: 1, lastUpdated: -1 }`
- `{ expiresAt: 1 }` (TTL index)

**Methods:**
- `isExpired()`: Check if rates are expired
- `getRate(currency)`: Get rate for specific currency

### Sync Queue Model

**File:** `models/SyncQueue.js`

Real-time synchronization management.

```javascript
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    required: true
  },
  resourceType: {
    type: String,
    enum: ['expense'],
    required: true
  },
  resourceId: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  processed: {
    type: Boolean,
    default: false
  },
  deviceId: {
    type: String,
    required: true
  }
}
```

**Key Features:**
- Cross-device synchronization
- Action-based queue processing
- Device-specific tracking

**Relationships:**
- Belongs to: User

### Category Pattern Model

**File:** `models/CategoryPattern.js`

AI-powered expense categorization.

```javascript
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pattern: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other']
  },
  patternType: {
    type: String,
    enum: ['keyword', 'merchant', 'phrase', 'learned'],
    default: 'learned'
  },
  confidence: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1
  },
  usageCount: {
    type: Number,
    default: 1
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  accuracy: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    enum: ['user_correction', 'auto_learned', 'merchant_db', 'manual'],
    default: 'auto_learned'
  }
}
```

**Key Features:**
- Machine learning-based categorization
- Confidence scoring and accuracy tracking
- Pattern learning from user behavior
- Text search capabilities

**Relationships:**
- Belongs to: User

**Indexes:**
- `{ user: 1, pattern: 1 }`
- `{ user: 1, category: 1 }`
- `{ pattern: 'text' }`
- `{ isActive: 1, confidence: -1 }`

**Methods:**
- `updateUsage(wasCorrect)`: Update pattern statistics
- `findPatternsForDescription()`: Find matching patterns
- `learnFromExpense()`: Learn from new expenses

## 🔗 Database Relationships

```
User (1) ──── (M) Expense (1) ──── (M) Receipt
  │                    │
  ├── (M) Budget       ├── Referenced by CategoryPattern
  │                    │
  ├── (M) Goal         ├── Referenced by SyncQueue
  │
  ├── (M) Notification
  │
  ├── (M) NotificationPreferences
  │
  └── (M) CategoryPattern

CurrencyRate (Independent collection with TTL)
```

### Key Relationships:

1. **User → Expenses**: One-to-many, user owns multiple expenses
2. **User → Budgets**: One-to-many, user can have multiple budgets
3. **User → Goals**: One-to-many, user can set multiple goals
4. **Expense → Receipt**: One-to-one, expense can have one receipt
5. **User → Notifications**: One-to-many, user receives multiple notifications
6. **User → CategoryPatterns**: One-to-many, user has personalized categorization patterns

## 📈 Indexes and Performance

### Performance Optimizations

- **Compound Indexes**: Multi-field indexes for common queries
- **TTL Indexes**: Automatic document expiration for cache collections
- **Text Indexes**: Full-text search for categorization patterns
- **Sparse Indexes**: Efficient storage for optional fields

### Key Indexes

```javascript
// Budget queries
budgetSchema.index({ user: 1, category: 1, period: 1 });

// Notification queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Currency rates
currencyRateSchema.index({ baseCurrency: 1, lastUpdated: -1 });
currencyRateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Category patterns
categoryPatternSchema.index({ user: 1, pattern: 1 });
categoryPatternSchema.index({ user: 1, category: 1 });
categoryPatternSchema.index({ pattern: 'text' });
categoryPatternSchema.index({ isActive: 1, confidence: -1 });
```

### Query Optimization Tips

1. **Populate Selectively**: Only populate fields you need
2. **Use Indexes**: Ensure queries use indexed fields
3. **Limit Results**: Use pagination for large datasets
4. **Cache Frequently Used Data**: Implement caching for exchange rates and analytics

## 🔧 Maintenance and Monitoring

### Database Maintenance

- **Regular Backups**: Schedule automated backups
- **Index Monitoring**: Monitor index usage and performance
- **Storage Optimization**: Monitor collection sizes and growth
- **TTL Cleanup**: Automatic cleanup of expired documents

### Monitoring Queries

```javascript
// Enable query profiling
db.setProfilingLevel(2, { slowms: 100 });

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(5);
```

### Backup Strategy

```bash
# MongoDB backup command
mongodump --db expenseflow --out /path/to/backup

# Restore from backup
mongorestore --db expenseflow /path/to/backup/expenseflow
```

This database schema provides a solid foundation for the ExpenseFlow application, supporting all core features while maintaining performance and scalability.
