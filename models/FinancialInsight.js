const mongoose = require('mongoose');

// Schema for storing generated financial insights
const financialInsightSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Insight type
  type: {
    type: String,
    required: true,
    enum: [
      'forecast',           // Spending forecast
      'anomaly',            // Unusual transaction
      'health_score',       // Financial health update
      'recommendation',     // Savings tip
      'trend',              // Trend detection
      'budget_optimization', // Budget suggestion
      'seasonal',           // Seasonal pattern
      'category_alert',     // Category overspending
      'goal_insight',       // Goal-related insight
      'comparison'          // Peer comparison
    ]
  },
  // Insight title
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  // Detailed message
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  // Priority level (1 = highest)
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  // Severity/impact
  severity: {
    type: String,
    enum: ['info', 'success', 'warning', 'critical'],
    default: 'info'
  },
  // Category if applicable
  category: {
    type: String,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other', 'all']
  },
  // Associated data
  data: {
    // For forecasts
    predictedAmount: Number,
    confidence: Number,
    
    // For anomalies
    actualAmount: Number,
    expectedAmount: Number,
    deviation: Number,
    expenseId: mongoose.Schema.Types.ObjectId,
    
    // For health score
    score: Number,
    previousScore: Number,
    factors: [{
      name: String,
      score: Number,
      weight: Number,
      status: String
    }],
    
    // For recommendations
    potentialSavings: Number,
    actionItems: [String],
    
    // For trends
    trendDirection: String,
    trendPercentage: Number,
    
    // For budget optimization
    currentBudget: Number,
    suggestedBudget: Number,
    reason: String,
    
    // Generic metadata
    metadata: mongoose.Schema.Types.Mixed
  },
  // Whether user has viewed this insight
  viewed: {
    type: Boolean,
    default: false
  },
  viewedAt: Date,
  // Whether user dismissed this insight
  dismissed: {
    type: Boolean,
    default: false
  },
  dismissedAt: Date,
  // Whether user acted on this insight
  actedUpon: {
    type: Boolean,
    default: false
  },
  // Insight validity period
  validUntil: {
    type: Date
  },
  // For recurring insights - prevent duplicates
  insightHash: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
financialInsightSchema.index({ user: 1, type: 1, createdAt: -1 });
financialInsightSchema.index({ user: 1, viewed: 1 });
financialInsightSchema.index({ user: 1, dismissed: 1 });
financialInsightSchema.index({ validUntil: 1 }, { expireAfterSeconds: 0 });

// Static: Get unread insights for user
financialInsightSchema.statics.getUnread = async function(userId, limit = 10) {
  return await this.find({
    user: userId,
    viewed: false,
    dismissed: false,
    $or: [
      { validUntil: { $gt: new Date() } },
      { validUntil: null }
    ]
  })
    .sort({ priority: 1, createdAt: -1 })
    .limit(limit);
};

// Static: Get insights by type
financialInsightSchema.statics.getByType = async function(userId, type, limit = 20) {
  return await this.find({
    user: userId,
    type,
    dismissed: false
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('FinancialInsight', financialInsightSchema);
