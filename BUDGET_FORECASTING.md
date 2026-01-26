# AI-Powered Budget Forecasting & Anomaly Detection

## Overview

This feature implements advanced machine learning algorithms for budget forecasting and spending anomaly detection in ExpenseFlow. It provides users with predictive insights, proactive alerts, and intelligent recommendations based on their historical spending patterns.

## Features

### 1. Budget Forecasting
- **Time-Series Forecasting**: Predicts future spending using multiple ML algorithms
- **Multiple Algorithms**:
  - Moving Average (default)
  - Linear Regression
  - Exponential Smoothing
  - ARIMA (configurable)
  - Prophet (configurable)
- **Confidence Intervals**: Predictions include upper and lower confidence bounds (default 95%)
- **Seasonal Pattern Recognition**: Automatically detects seasonal spending variations
- **Trend Analysis**: Identifies increasing, decreasing, stable, or volatile spending trends
- **Budget Comparison**: Automatically compares forecasts against active budgets
- **Accuracy Tracking**: Continuously improves predictions by comparing with actual spending

### 2. Anomaly Detection
- **Statistical Methods**:
  - Z-score analysis
  - IQR (Interquartile Range) method
  - Percentile-based detection
- **Anomaly Types**:
  - Amount spikes (unusual spending amounts)
  - Frequency anomalies (transactions too frequent/infrequent)
  - Unusual merchants (new or rare vendors)
  - Time anomalies (transactions at unusual times)
  - Duplicate transactions
  - Location anomalies (future enhancement)
  - Velocity anomalies (rapid successive transactions)
- **Severity Levels**: Low, Medium, High, Critical
- **Fraud Detection**: Automatic flagging of potentially fraudulent transactions
- **Smart Alerts**: Email, push, and in-app notifications for critical anomalies

### 3. Intelligent Recommendations
- Budget adjustment suggestions
- Spending reduction opportunities
- Savings optimization
- Category review recommendations
- Custom alerts based on spending patterns

## Technical Architecture

### Models

#### BudgetForecast Model
Stores forecast predictions, confidence intervals, and accuracy metrics.

**Key Fields**:
- `forecast_period`: Start and end dates, period type
- `predictions[]`: Array of predicted amounts with confidence intervals
- `aggregate_forecast`: Total predictions, trends, and percentages
- `seasonal_factors[]`: Monthly seasonal patterns
- `model_metadata`: Algorithm details, accuracy scores (RMSE, MAE)
- `comparison`: Budget vs. forecast analysis
- `alerts[]`: Generated alerts with severity levels
- `recommendations[]`: AI-generated suggestions
- `accuracy_tracking[]`: Historical accuracy data

**Methods**:
- `addPrediction()`: Add new prediction data
- `addAlert()`: Create new alert
- `acknowledgeAlert()`: Mark alert as seen
- `trackAccuracy()`: Record actual vs. predicted
- `addRecommendation()`: Add recommendation

#### SpendingAnomaly Model
Tracks detected anomalies with detailed analysis.

**Key Fields**:
- `anomaly_type`: Type of detected anomaly
- `severity`: Low/Medium/High/Critical
- `anomaly_details`: Transaction details and deviation
- `statistical_analysis`: Z-score, percentile, standard deviations
- `context`: Historical comparison data
- `flags`: Fraud indicators, duplicate checks
- `user_actions`: Review status, notes
- `alert_sent`: Email/push/in-app delivery status
- `recommendations[]`: Suggested actions
- `resolution`: Resolution status and type

**Methods**:
- `markAsReviewed()`: Mark anomaly as reviewed
- `markAsNormal()`: Confirm transaction is legitimate
- `markAsFraud()`: Flag as fraudulent
- `sendAlert()`: Trigger alert notifications
- `addRecommendation()`: Add action recommendation

### Services

#### budgetForecastingService.js
Core forecasting engine with multiple algorithms.

**Key Methods**:
- `generateForecast(userId, options)`: Generate new forecast
- `getForecastById(forecastId, userId)`: Retrieve specific forecast
- `getUserForecasts(userId, filters)`: Get all user forecasts
- `updateForecastAccuracy(userId)`: Update accuracy metrics
- `getForecastSummary(userId)`: Dashboard summary

**Algorithm Implementations**:
- `_movingAverageForecast()`: Simple moving average with smoothing
- `_linearRegressionForecast()`: Trend-based linear predictions
- `_exponentialSmoothingForecast()`: Weighted exponential smoothing

**Analysis Methods**:
- `_detectSeasonalFactors()`: Identify seasonal patterns
- `_compareForecastToBudget()`: Budget comparison logic
- `_generateRecommendations()`: AI recommendations
- `_generateAlerts()`: Smart alert generation

#### anomalyDetectionService.js
Real-time anomaly detection with ML algorithms.

**Key Methods**:
- `detectAnomalies(userId, options)`: Scan recent transactions
- `analyzeTransaction(userId, expenseId)`: Analyze specific transaction
- `getUserAnomalies(userId, filters)`: Retrieve anomalies
- `getAnomalyStats(userId, period)`: Statistical summary
- `reviewAnomaly(userId, anomalyId, action)`: Review and resolve
- `getInsights(userId)`: Generate insights and recommendations

**Detection Algorithms**:
- `_detectAmountAnomaly()`: Z-score based amount detection
- `_detectFrequencyAnomaly()`: Transaction frequency analysis
- `_detectMerchantAnomaly()`: New/unusual merchant detection
- `_detectTimeAnomaly()`: Unusual transaction time detection
- `_detectDuplicate()`: Duplicate transaction detection

### Routes

#### /api/forecasting

**Forecast Endpoints**:
- `POST /api/forecasting/generate` - Generate new forecast
  ```json
  {
    "period_type": "monthly|weekly|quarterly|yearly",
    "category": "food|transport|...",
    "algorithm": "moving_average|linear_regression|exponential_smoothing",
    "confidence_level": 95
  }
  ```

- `GET /api/forecasting/forecasts` - Get all forecasts
  - Query params: `category`, `period_type`

- `GET /api/forecasting/forecasts/:id` - Get specific forecast

- `GET /api/forecasting/summary` - Dashboard summary

- `PUT /api/forecasting/forecasts/:id/acknowledge-alert/:alertId` - Acknowledge alert

- `POST /api/forecasting/update-accuracy` - Update accuracy metrics

**Anomaly Endpoints**:
- `POST /api/forecasting/anomalies/detect` - Run detection
  ```json
  {
    "lookback_days": 90,
    "sensitivity_level": "low|medium|high"
  }
  ```

- `GET /api/forecasting/anomalies` - Get anomalies
  - Query params: `severity`, `unreviewed`, `potential_fraud`

- `GET /api/forecasting/anomalies/stats` - Get statistics
  - Query params: `period` (default: 30 days)

- `GET /api/forecasting/anomalies/insights` - Get AI insights

- `POST /api/forecasting/anomalies/:expenseId/analyze` - Analyze transaction

- `PUT /api/forecasting/anomalies/:id/review` - Review anomaly
  ```json
  {
    "action": "mark_normal|mark_fraud|reviewed",
    "notes": "Optional notes"
  }
  ```

**Pattern Endpoints**:
- `GET /api/forecasting/patterns/seasonal` - Seasonal patterns
  - Query params: `category`

- `GET /api/forecasting/patterns/trends` - Spending trends

**Alert Endpoints**:
- `GET /api/forecasting/alerts` - Get unacknowledged alerts
  - Query params: `severity`

### Middleware

#### forecastValidator.js
Joi-based validation for forecast and anomaly endpoints.

**Validators**:
- `validateForecastGeneration`: Validates forecast generation requests
- `validateAnomalyDetection`: Validates anomaly detection parameters
- `validateAnomalyReview`: Validates anomaly review actions

## Automated Tasks (Cron Jobs)

### Daily Forecast Generation (6:00 AM)
```javascript
cron.schedule('0 6 * * *', generateDailyForecasts)
```
- Generates monthly forecasts for all users
- Creates category-specific forecasts for top 3 spending categories
- Updates existing forecasts with new data

### Daily Anomaly Detection (7:00 AM)
```javascript
cron.schedule('0 7 * * *', runAnomalyDetection)
```
- Scans last 7 days of transactions
- Detects anomalies with medium sensitivity
- Sends email alerts for critical anomalies

### Forecast Accuracy Update (11:00 PM)
```javascript
cron.schedule('0 23 * * *', updateForecastAccuracy)
```
- Compares predictions with actual spending
- Updates accuracy scores (RMSE, MAE)
- Adjusts model parameters based on performance

## Machine Learning Algorithms

### 1. Moving Average
**Use Case**: Short-term predictions, stable spending patterns

**How It Works**:
1. Calculates average of last N periods (default: 3)
2. Uses average as prediction for future periods
3. Calculates standard deviation for confidence intervals

**Advantages**:
- Simple and fast
- Good for stable patterns
- Minimal computational overhead

**Disadvantages**:
- Doesn't capture trends well
- Sensitive to window size

### 2. Linear Regression
**Use Case**: Trending data, long-term forecasts

**How It Works**:
1. Fits line to historical data using least squares
2. Extrapolates line for future predictions
3. Uses residuals for confidence intervals

**Formula**:
```
y = mx + b
where:
  m = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
  b = (Σy - m*Σx) / n
```

**Advantages**:
- Captures trends effectively
- Good for linear patterns
- Interpretable results

**Disadvantages**:
- Assumes linear relationship
- Poor for seasonal data

### 3. Exponential Smoothing
**Use Case**: Recent data more important, smooth predictions

**How It Works**:
1. Applies exponentially decreasing weights to older data
2. Smoothing parameter α (0.3 default) controls weight distribution
3. Recent data has higher influence

**Formula**:
```
S(t) = α*Y(t) + (1-α)*S(t-1)
```

**Advantages**:
- Emphasizes recent data
- Smooth predictions
- Adaptive to changes

**Disadvantages**:
- Requires tuning α parameter
- May lag behind rapid changes

## Anomaly Detection Algorithms

### Z-Score Method
**Sensitivity Thresholds**:
- Low: |z| > 3.0 (99.7% confidence)
- Medium: |z| > 2.0 (95% confidence)
- High: |z| > 1.5 (86.6% confidence)

**Formula**:
```
z = (x - μ) / σ
where:
  x = transaction amount
  μ = historical mean
  σ = standard deviation
```

**Severity Classification**:
- Critical: |z| > 3
- High: 2.5 < |z| ≤ 3
- Medium: 2 < |z| ≤ 2.5
- Low: |z| ≤ 2

### Frequency Analysis
Detects unusual transaction frequency:
- Calculates average interval between transactions
- Flags transactions occurring < 30% of average interval
- Requires minimum 5 historical transactions

### Merchant Analysis
Detects new merchants with large transactions:
- Checks merchant history
- Flags if: new merchant AND amount > 1.5x average
- Tracks merchant transaction patterns

### Time-Based Detection
Identifies transactions at unusual times:
- Calculates typical transaction hours
- Flags if > 6 hours outside normal range
- Category-specific time patterns

### Duplicate Detection
Identifies potential duplicate charges:
- Searches within ±5 minute window
- Matches: amount, category, date
- High severity for exact matches

## Usage Examples

### Generate Monthly Forecast

```javascript
POST /api/forecasting/generate
{
  "period_type": "monthly",
  "category": "food",
  "algorithm": "linear_regression",
  "confidence_level": 95
}

Response:
{
  "success": true,
  "message": "Forecast generated successfully",
  "data": {
    "_id": "forecast_id",
    "forecast_period": {
      "start_date": "2024-02-01",
      "end_date": "2024-03-01",
      "period_type": "monthly"
    },
    "predictions": [
      {
        "date": "2024-02-15",
        "predicted_amount": 5000,
        "confidence_lower": 4500,
        "confidence_upper": 5500,
        "confidence_level": 95
      }
    ],
    "aggregate_forecast": {
      "total_predicted": 5000,
      "average_monthly": 5000,
      "trend": "increasing",
      "trend_percentage": 12.5
    },
    "alerts": [],
    "recommendations": []
  }
}
```

### Run Anomaly Detection

```javascript
POST /api/forecasting/anomalies/detect
{
  "lookback_days": 30,
  "sensitivity_level": "high"
}

Response:
{
  "success": true,
  "message": "Detected 3 anomalies",
  "data": {
    "detected": 3,
    "anomalies": [
      {
        "_id": "anomaly_id",
        "anomaly_type": "amount_spike",
        "severity": "high",
        "anomaly_details": {
          "transaction_amount": 15000,
          "expected_amount": 5000,
          "deviation_percentage": 200,
          "merchant": "Electronics Store",
          "category": "shopping",
          "date": "2024-01-15",
          "description": "Amount $15000 is 3.2 standard deviations from average"
        },
        "statistical_analysis": {
          "z_score": 3.2,
          "percentile": 99.5,
          "confidence_score": 98
        },
        "flags": {
          "requires_review": true
        },
        "recommendations": [
          {
            "action": "verify_transaction",
            "description": "Verify this transaction is correct and authorized"
          }
        ]
      }
    ]
  }
}
```

### Get Forecast Summary

```javascript
GET /api/forecasting/summary

Response:
{
  "success": true,
  "data": {
    "total_forecasts": 4,
    "total_predicted_spending": 45000,
    "categories": [
      {
        "category": "food",
        "predicted": 15000,
        "trend": "stable",
        "accuracy": 92.5
      },
      {
        "category": "transport",
        "predicted": 8000,
        "trend": "increasing",
        "accuracy": 88.3
      }
    ],
    "alerts": {
      "critical": 0,
      "high": 2,
      "total_unacknowledged": 5
    },
    "accuracy": {
      "overall": 90.2,
      "by_category": {
        "food": 92.5,
        "transport": 88.3
      }
    }
  }
}
```

### Review Anomaly

```javascript
PUT /api/forecasting/anomalies/:id/review
{
  "action": "mark_normal",
  "notes": "This was a planned large purchase"
}

Response:
{
  "success": true,
  "message": "Anomaly reviewed successfully",
  "data": {
    "_id": "anomaly_id",
    "user_actions": {
      "reviewed": true,
      "reviewed_at": "2024-01-20T10:30:00Z",
      "marked_as_normal": true,
      "notes": "This was a planned large purchase"
    },
    "resolution": {
      "resolved": true,
      "resolved_at": "2024-01-20T10:30:00Z",
      "resolution_type": "confirmed_normal"
    }
  }
}
```

## Performance Considerations

### Optimization Strategies
1. **Batch Processing**: Cron jobs process users in batches
2. **Caching**: Frequently accessed forecasts cached
3. **Indexing**: Database indexes on user_id, date, category
4. **Lazy Loading**: Historical data loaded only when needed
5. **Rate Limiting**: API endpoints rate-limited

### Scalability
- Horizontal scaling supported
- Database sharding by user_id
- Async processing for heavy computations
- Webhook support for real-time alerts

## Error Handling

### Common Errors
1. **Insufficient Data**: Minimum 3 historical periods required
2. **Invalid Parameters**: Validation errors with detailed messages
3. **Model Failures**: Fallback to simpler algorithms
4. **Rate Limits**: 429 status with retry headers

### Error Responses
```javascript
{
  "success": false,
  "message": "Insufficient historical data for forecasting",
  "errors": ["Minimum 3 periods required"]
}
```

## Security

### Authentication
- All endpoints require JWT authentication
- User-specific data isolation
- Role-based access control (RBAC)

### Data Privacy
- Encrypted at rest and in transit
- Anonymized data for analytics
- GDPR compliance
- User data deletion support

### Rate Limiting
- Forecast generation: 10 requests/hour
- Anomaly detection: 5 requests/hour
- General queries: 100 requests/hour

## Future Enhancements

### Planned Features
1. **Deep Learning Models**: LSTM, GRU for complex patterns
2. **Multi-variate Analysis**: Consider multiple factors
3. **External Data Integration**: Economic indicators, inflation
4. **Natural Language Insights**: AI-generated textual insights
5. **Predictive Categories**: Auto-categorization predictions
6. **Goal-Based Forecasting**: Forecast aligned with financial goals
7. **Collaborative Forecasting**: Shared financial planning
8. **Mobile Optimization**: Reduced payload for mobile apps

### API Version 2.0 (Coming Soon)
- GraphQL support
- Real-time WebSocket updates
- Batch operations
- Advanced filtering and sorting
- Export to PDF/CSV

## Support

### Documentation
- API Reference: `/docs/api/forecasting`
- Code Examples: `/examples/forecasting`
- Video Tutorials: `/tutorials`

### Community
- GitHub Issues: https://github.com/Renu-code123/ExpenseFlow/issues
- Discord: #forecasting-support
- Email: support@expenseflow.com

## License
MIT License - See LICENSE file for details

## Contributors
- @SatyamPandey-07 - Initial implementation
- @Renu-code123 - Feature design and review
- ECWoC26 Program - Open source contribution

---

**Note**: This feature is part of the ExpenseFlow #286 issue implementation. For bug reports or feature requests, please create an issue on GitHub with the label `forecasting`.
