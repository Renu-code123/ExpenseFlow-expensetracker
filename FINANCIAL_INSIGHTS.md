# Smart Financial Insights & Anomaly Detection with ML Patterns

## Overview
The Financial Insights system uses machine learning patterns and statistical analysis to provide intelligent spending insights, detect anomalies, forecast cash flow, and automatically identify subscriptions.

## Features

### 1. **Anomaly Detection**
- Detects unusual transactions based on statistical analysis
- Uses Z-score methodology (2.5 standard deviations threshold)
- Category-specific anomaly detection
- Automatic severity classification (low, medium, high, critical)
- Provides context: "You spent ₹5000 on food, which is 150% higher than usual"

### 2. **Spending Pattern Recognition**
- Identifies recurring spending patterns by merchant
- Tracks daily, weekly, monthly, and seasonal patterns
- Calculates average spending and frequency
- Detects spending trends (increasing, decreasing, stable, volatile)
- Minimum 3 occurrences required for pattern detection

### 3. **Cash Flow Forecasting**
- 7-day, 30-day, and 90-day spending predictions
- Based on historical transaction patterns
- Projected monthly balance calculations
- Income stability analysis
- Confidence-based recommendations

### 4. **Automatic Subscription Detection**
- Scans transaction history for recurring charges
- Detects billing cycles (daily, weekly, monthly, quarterly, yearly)
- Confidence scoring based on:
  - Number of occurrences
  - Interval consistency (max 5-day variance)
  - Amount consistency (max 10% variance)
- Auto-categorizes known services (Netflix, Spotify, Amazon Prime, etc.)

### 5. **Financial Health Score**
- Comprehensive score from 0-100
- Weighted components:
  - **40%**: Savings rate
  - **30%**: Subscription ratio
  - **30%**: Expense variance
- Ratings: Excellent (80+), Good (60-79), Fair (40-59), Needs Improvement (<40)

### 6. **Personalized Recommendations**
- Category-specific saving tips
- Identifies high-spending categories
- Calculates 15% savings potential
- Actionable advice tailored to spending habits

### 7. **Subscription Management**
- Track all active subscriptions
- Calculate total monthly/annual costs
- Renewal reminders (3 days before billing)
- Identify unused subscriptions
- Cancellation tracking

### 8. **Peer Comparison Insights**
- Anonymous benchmarking (planned feature)
- Compare spending by category
- See average spending in your region
- Identify areas for improvement

## Data Models

### FinancialInsight
```javascript
{
  user: ObjectId,
  type: 'anomaly|pattern|forecast|recommendation|health_score|subscription_alert',
  severity: 'low|medium|high|critical',
  title: String,
  description: String,
  category: String,
  confidence: Number (0-1),
  amount: Number,
  savings_potential: Number,
  metadata: {
    anomaly_score, pattern_type, forecast_period, recommendations, etc.
  },
  isRead: Boolean,
  isActioned: Boolean,
  expiresAt: Date (30 days TTL)
}
```

### SpendingPattern
```javascript
{
  user: ObjectId,
  pattern_type: 'daily|weekly|monthly|seasonal|merchant|category',
  category: String,
  merchant: String,
  frequency: 'very_frequent|frequent|occasional|rare',
  average_amount: Number,
  median_amount: Number,
  transaction_count: Number,
  time_pattern: { hour_of_day, day_of_week, preferred_time },
  trend: 'increasing|decreasing|stable|volatile',
  confidence_score: Number (0-1),
  last_occurrence: Date,
  next_predicted_date: Date,
  anomaly_threshold: { lower, upper }
}
```

### Subscription
```javascript
{
  user: ObjectId,
  name: String,
  merchant: String,
  category: String,
  amount: Number,
  billing_cycle: 'daily|weekly|monthly|quarterly|yearly',
  next_billing_date: Date,
  detection_method: 'auto|manual',
  confidence_score: Number (0-1),
  status: 'active|cancelled|paused|trial',
  transaction_history: [{ transaction_id, amount, date }]
}
```

## API Endpoints

### Insights
```
GET    /api/insights                    Get all insights with filters
GET    /api/insights/generate            Generate fresh insights
GET    /api/insights/dashboard           Dashboard summary
PUT    /api/insights/:id/read            Mark insight as read
PUT    /api/insights/:id/action          Mark insight as actioned
GET    /api/insights/patterns            Get spending patterns
```

**Query Parameters for GET /api/insights:**
- `type`: anomaly, pattern, forecast, recommendation, health_score
- `severity`: low, medium, high, critical
- `category`: food, transport, entertainment, etc.
- `isRead`: true, false
- `limit`: Number (default: 20, max: 100)
- `page`: Number (default: 1)

### Subscriptions
```
GET    /api/insights/subscriptions         Get all subscriptions
GET    /api/insights/subscriptions/detect  Auto-detect subscriptions
POST   /api/insights/subscriptions         Create manual subscription
PUT    /api/insights/subscriptions/:id     Update subscription
DELETE /api/insights/subscriptions/:id     Cancel subscription
```

## Automated Jobs (Cron)

### Daily
- **7:00 AM**: Generate financial insights for all users
- **10:00 AM**: Check subscription renewals and send reminders

### Weekly
- **Monday 8:00 AM**: Detect new subscriptions from transaction patterns

### Weekly Cleanup
- **Sunday 2:00 AM**: Remove insights older than 90 days

## Usage Examples

### 1. Generate Insights
```javascript
GET /api/insights/generate

Response:
{
  "success": true,
  "message": "Generated 12 insights",
  "data": [
    {
      "type": "anomaly",
      "severity": "high",
      "title": "Unusual food expense detected",
      "description": "You spent ₹3500 on Swiggy...",
      "confidence": 0.85
    },
    {
      "type": "health_score",
      "title": "Financial health: Good (72/100)",
      "metadata": {
        "score": 72,
        "savings_rate": "25.5",
        "subscription_ratio": "12.3"
      }
    }
  ]
}
```

### 2. Get Dashboard Summary
```javascript
GET /api/insights/dashboard

Response:
{
  "success": true,
  "data": {
    "unread_count": 5,
    "critical_insights": [...],
    "health_score": { score: 72, rating: "Good" },
    "recent_anomalies": [...],
    "patterns": [...]
  }
}
```

### 3. Detect Subscriptions
```javascript
GET /api/insights/subscriptions/detect

Response:
{
  "success": true,
  "message": "Detected 4 subscriptions",
  "data": [
    {
      "name": "Netflix Subscription",
      "merchant": "netflix",
      "amount": 649,
      "billing_cycle": "monthly",
      "next_billing_date": "2026-02-01",
      "confidence_score": 0.95,
      "status": "active"
    }
  ]
}
```

### 4. Create Manual Subscription
```javascript
POST /api/insights/subscriptions
Content-Type: application/json

{
  "name": "Gym Membership",
  "merchant": "Gold's Gym",
  "category": "healthcare",
  "amount": 2000,
  "billing_cycle": "monthly",
  "next_billing_date": "2026-02-15",
  "notes": "Annual contract until Dec 2026"
}
```

### 5. Filter Insights
```javascript
GET /api/insights?type=anomaly&severity=high&isRead=false&limit=10

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 23,
    "pages": 3
  }
}
```

## Machine Learning Patterns

### Anomaly Detection Algorithm
1. **Data Collection**: Gather last 30 days of expenses by category
2. **Statistical Analysis**: Calculate mean, median, and standard deviation
3. **Z-Score Calculation**: `z = (value - mean) / stdDev`
4. **Threshold Check**: Flag if `|z| > 2.5`
5. **Severity Classification**:
   - Critical: z > 3.5
   - High: z > 3.0
   - Medium: z > 2.5

### Pattern Recognition
1. **Grouping**: Group transactions by normalized merchant name
2. **Frequency Analysis**: Count occurrences over 90-day window
3. **Interval Calculation**: Calculate days between transactions
4. **Variance Check**: Ensure interval variance < 5 days
5. **Amount Consistency**: Ensure amount variance < 10%
6. **Confidence Scoring**: Based on occurrences, consistency, regularity

### Subscription Detection
1. **Merchant Normalization**: Clean and normalize merchant names
2. **Recurring Pattern Identification**: Find transactions with:
   - Minimum 3 occurrences
   - Consistent intervals (variance < 5 days)
   - Similar amounts (variance < 10%)
3. **Billing Cycle Determination**:
   - 0-2 days: Daily
   - 3-8 days: Weekly
   - 9-35 days: Monthly
   - 36-100 days: Quarterly
   - 100+ days: Yearly
4. **Confidence Calculation**:
   - Base: 0.5
   - +0.3 for high occurrence count
   - +0.1 for low interval variance
   - +0.1 for low amount variance

## Best Practices

### For Users
1. **Review Insights Daily**: Check dashboard for new anomalies and recommendations
2. **Act on Recommendations**: Mark insights as actioned when you take action
3. **Verify Auto-Detected Subscriptions**: Confirm or correct automatically detected subscriptions
4. **Set Subscription Reminders**: Enable email notifications for renewal alerts
5. **Monitor Financial Health Score**: Track improvements over time

### For Developers
1. **Optimize Queries**: Use MongoDB indexes for performance
2. **Cache Results**: Implement caching for frequently accessed patterns
3. **Batch Processing**: Generate insights in batches during cron jobs
4. **Error Handling**: Gracefully handle missing data or failed API calls
5. **Privacy**: Never expose individual user data in peer comparisons
6. **Testing**: Test with various spending patterns and edge cases

## Configuration

### Thresholds (Customizable)
```javascript
// insightService.js
ANOMALY_THRESHOLD = 2.5              // Standard deviations
PATTERN_MIN_OCCURRENCES = 3          // Minimum transactions for pattern
CONFIDENCE_THRESHOLD = 0.7           // Minimum confidence to show insights

// subscriptionDetector.js
MIN_OCCURRENCES = 3                  // Minimum for subscription detection
MAX_DAY_VARIANCE = 5                 // Days variance allowed
AMOUNT_VARIANCE_THRESHOLD = 0.1      // 10% amount variance
```

### Cron Schedule
```javascript
// Daily insights: '0 7 * * *'        (7:00 AM)
// Subscription detection: '0 8 * * 1' (Monday 8:00 AM)
// Renewal reminders: '0 10 * * *'    (10:00 AM)
// Cleanup: '0 2 * * 0'                (Sunday 2:00 AM)
```

## Troubleshooting

### No Insights Generated
- **Cause**: Insufficient transaction history (< 7 days)
- **Solution**: Wait for more transactions or manually add historical data

### Low Confidence Scores
- **Cause**: Irregular spending patterns, few transactions
- **Solution**: More consistent spending will improve confidence over time

### Subscriptions Not Detected
- **Cause**: High variance in amounts or intervals
- **Solution**: Manually add subscriptions or adjust detection thresholds

### False Anomalies
- **Cause**: One-time legitimate expenses flagged as unusual
- **Solution**: Mark as read or actioned to train the system

## Future Enhancements

1. **Merchant Recognition AI**: Improve merchant name normalization with ML
2. **Predictive Budgeting**: Suggest budget limits based on patterns
3. **Bill Negotiation**: Identify opportunities to negotiate lower rates
4. **Income Forecasting**: Predict income based on historical patterns
5. **Goal-Based Recommendations**: Align recommendations with user's financial goals
6. **Collaborative Filtering**: Anonymous peer comparison with privacy protection
7. **Deep Learning**: Use neural networks for more accurate predictions
8. **Natural Language**: Chat-based insights and recommendations

## Security & Privacy

- All insights are user-specific and private
- No personal data shared in peer comparisons (anonymized only)
- Insights expire after 30 days automatically
- Rate limiting applied to prevent abuse
- Encrypted data transmission (HTTPS)
- MongoDB indexes for efficient querying

## Contributing

To add new insight types:
1. Add enum value to `FinancialInsight` model
2. Implement detection logic in `insightService.js`
3. Add API endpoint in `routes/insights.js`
4. Update documentation

---

**Implemented for Issue #264 | ECWoC26**
