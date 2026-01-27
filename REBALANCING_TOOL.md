# Portfolio Rebalancing Tool

## Overview

The Portfolio Rebalancing Tool is an intelligent system that helps users maintain their desired investment portfolio allocation by analyzing current vs. target allocations and suggesting optimal trades.

## Features

### 1. **Set Target Allocation Percentages**
- Define target allocation by asset type (stocks, bonds, ETFs, crypto, etc.)
- Set tolerance bands (±%) for each asset type
- Support for specific asset allocations
- Multiple allocation strategies per portfolio

### 2. **Visual Comparison: Current vs Target Allocation**
- Side-by-side comparison of current and target allocations
- Interactive bar charts showing deviations
- Color-coded indicators (green = within tolerance, yellow/red = needs rebalancing)
- Real-time percentage calculations

### 3. **Automatic Rebalancing Suggestions**
- Intelligent trade recommendations (buy/sell/hold)
- Prioritization system (high/medium/low priority)
- Considers tolerance bands to avoid unnecessary trades
- Minimum trade amount threshold to prevent micro-trades

### 4. **Preview Trade Recommendations Before Executing**
- Detailed trade preview with all costs
- Summary of total trades, buy/sell values
- Review individual trade details before committing
- Ability to save as proposal for later review

### 5. **Rebalancing Cost Calculator**
- **Trading Fees**: Calculated based on trade value (0.1% default)
- **Tax Implications**: 
  - Short-term capital gains (held < 1 year): 25% tax rate
  - Long-term capital gains (held ≥ 1 year): 15% tax rate
  - FIFO/LIFO cost basis calculation
  - Estimated tax impact per trade
- **Total Cost Summary**: Fees + taxes = net rebalancing cost

### 6. **Scheduled Auto-Rebalancing Alerts**
- **Frequencies**:
  - Monthly
  - Quarterly
  - Semi-annually
  - Annually
  - Threshold-based (when deviation exceeds tolerance)
  - Manual only
- **Automatic Execution**: Option to enable auto-rebalancing
- **Alert Types**:
  - Scheduled reminders
  - Threshold exceeded warnings
  - Monthly portfolio check notifications
- **Alert Management**: Mark as read, dismiss, or take action

## Architecture

### Database Models

#### 1. **TargetAllocation**
```javascript
{
  user: ObjectId,
  portfolio: ObjectId,
  name: String,
  allocations: [{
    assetType: String,
    targetPercentage: Number,
    toleranceBand: Number
  }],
  rebalancingSettings: {
    frequency: String,
    minTradeAmount: Number,
    autoRebalance: Boolean,
    taxOptimized: Boolean,
    useCashFlow: Boolean
  }
}
```

#### 2. **RebalancingHistory**
```javascript
{
  user: ObjectId,
  portfolio: ObjectId,
  status: String, // proposed, approved, executed, cancelled
  preRebalance: { /* allocation state */ },
  recommendedTrades: [{
    action: String,
    asset: ObjectId,
    sharesToTrade: Number,
    estimatedFees: Object,
    taxImpact: Object
  }],
  postRebalance: { /* allocation state */ },
  summary: {
    totalTrades: Number,
    totalFees: Number,
    totalTaxImpact: Number,
    netCost: Number
  }
}
```

#### 3. **RebalancingAlert**
```javascript
{
  user: ObjectId,
  portfolio: ObjectId,
  alertType: String, // scheduled, threshold-exceeded, opportunity
  message: String,
  severity: String, // info, warning, critical
  details: Object,
  read: Boolean,
  dismissed: Boolean
}
```

### Backend Services

#### 1. **RebalancingService**
Location: `/services/rebalancingService.js`

Key Methods:
- `setTargetAllocation()` - Set or update target allocation
- `getCurrentAllocation()` - Get current portfolio allocation
- `calculateRebalancing()` - Generate rebalancing recommendations
- `executeRebalancing()` - Execute approved rebalancing
- `checkRebalancingNeeded()` - Check if rebalancing is needed
- `calculateTaxImpact()` - Calculate tax implications for trades

#### 2. **RebalancingScheduler**
Location: `/services/rebalancingScheduler.js`

Scheduled Jobs:
- **Daily at 9 AM**: Check for scheduled rebalances
- **Weekly on Monday at 10 AM**: Check threshold-based rebalancing
- **Monthly on 1st at 9 AM**: Send monthly reminders

### API Routes

Location: `/routes/rebalancing.js`

**Target Allocation**:
- `POST /api/rebalancing/portfolios/:portfolioId/target-allocation` - Set target
- `GET /api/rebalancing/portfolios/:portfolioId/target-allocation` - Get target
- `GET /api/rebalancing/portfolios/:portfolioId/current-allocation` - Get current

**Rebalancing**:
- `GET /api/rebalancing/portfolios/:portfolioId/rebalancing/calculate` - Calculate
- `POST /api/rebalancing/portfolios/:portfolioId/rebalancing` - Create proposal
- `GET /api/rebalancing/portfolios/:portfolioId/rebalancing/history` - Get history
- `POST /api/rebalancing/rebalancing/:rebalancingId/execute` - Execute
- `POST /api/rebalancing/rebalancing/:rebalancingId/approve` - Approve
- `POST /api/rebalancing/rebalancing/:rebalancingId/cancel` - Cancel

**Alerts**:
- `GET /api/rebalancing/portfolios/:portfolioId/rebalancing/alerts` - Get alerts
- `GET /api/rebalancing/portfolios/:portfolioId/rebalancing/check` - Check if needed
- `POST /api/rebalancing/alerts/:alertId/read` - Mark as read
- `POST /api/rebalancing/alerts/:alertId/dismiss` - Dismiss

### Frontend

Location: `/public/portfolio-rebalancing.html`

**Tabs**:
1. **Overview**: Current vs target allocation comparison
2. **Recommendations**: Trade recommendations and cost analysis
3. **History**: Past rebalancing executions
4. **Settings**: Rebalancing preferences

## Usage Guide

### Step 1: Set Target Allocation

1. Navigate to Portfolio Rebalancing Tool
2. Click "Set Target Allocation"
3. Define allocation percentages by asset type
4. Set tolerance bands (recommended: ±5%)
5. Configure rebalancing settings:
   - Frequency (quarterly recommended)
   - Minimum trade amount ($100 default)
   - Enable/disable auto-rebalancing
   - Tax optimization preference
6. Save target allocation

### Step 2: Monitor Allocation

1. View "Overview" tab for current vs target comparison
2. Check color-coded deviation indicators
3. Review allocation comparison chart
4. Look for alerts indicating rebalancing is needed

### Step 3: Calculate Rebalancing

1. Go to "Recommendations" tab
2. Click "Calculate" button
3. Review recommended trades:
   - Buy/sell actions
   - Trade values and quantities
   - Estimated fees and tax impact
4. Check summary:
   - Total number of trades
   - Total fees
   - Total tax impact
   - Net rebalancing cost

### Step 4: Execute Rebalancing

1. Click "Preview & Execute"
2. Review detailed trade plan
3. Verify all costs are acceptable
4. Click "Execute Rebalancing"
5. Confirm execution
6. View results in History tab

### Step 5: Review History

1. View all past rebalancing in History tab
2. Check execution status
3. Review trade details and costs
4. Analyze performance improvements

## Cost Calculation Examples

### Example 1: Simple Rebalancing

**Portfolio Value**: $50,000

**Current Allocation**:
- Stocks: 44% ($22,000)
- Bonds: 24% ($12,000)
- ETFs: 20% ($10,000)
- Cash: 12% ($6,000)

**Target Allocation**:
- Stocks: 40% (±5% tolerance)
- Bonds: 30% (±5% tolerance)
- ETFs: 20% (±5% tolerance)
- Cash: 10% (±5% tolerance)

**Recommendations**:
1. **SELL Stocks**: $2,000 worth
   - Shares to sell: varies by stock
   - Trading fee: $2.00 (0.1%)
   - Tax impact: $150 (assuming short-term gains)

2. **BUY Bonds**: $3,000 worth
   - Trading fee: $3.00 (0.1%)

3. **BUY Cash**: -$1,000 (use proceeds)

**Summary**:
- Total Trades: 2
- Total Fees: $5.00
- Total Tax Impact: $150.00
- Net Cost: $155.00
- Deviation Improvement: 4% → ~0%

## Configuration Options

### Rebalancing Frequency

- **Monthly**: Best for active traders, higher costs
- **Quarterly**: Recommended balance of maintenance and cost
- **Semi-annually**: Lower costs, less frequent monitoring
- **Annually**: Lowest costs, minimal intervention
- **Threshold-based**: Rebalance only when deviation exceeds tolerance
- **Manual**: Full control, no automatic reminders

### Advanced Settings

```javascript
{
  minTradeAmount: 100,        // Avoid micro-trades
  autoRebalance: false,       // Require manual approval
  taxOptimized: true,         // Consider tax implications
  useCashFlow: true,          // Use dividends/deposits for rebalancing
}
```

## Best Practices

1. **Set Realistic Tolerances**: ±5% is standard, ±10% for lower turnover
2. **Consider Tax Implications**: Enable tax optimization to minimize tax impact
3. **Use Quarterly Rebalancing**: Balance between maintenance and cost
4. **Review Before Executing**: Always preview trades before execution
5. **Track History**: Review past rebalancing to improve strategy
6. **Use Cash Flows**: Let dividends and deposits naturally rebalance
7. **Minimum Trade Threshold**: Set minimum to avoid excessive small trades

## Monitoring & Alerts

The system automatically:
- Checks for scheduled rebalancing daily at 9 AM UTC
- Monitors threshold exceedances weekly
- Sends monthly portfolio health reminders
- Creates alerts when action is needed
- Optionally executes rebalancing automatically

**Alert Severity Levels**:
- **Info**: Portfolio is balanced or minor deviation
- **Warning**: Deviation exceeds tolerance (5-15%)
- **Critical**: Large deviation (>15%), immediate action recommended

## Integration Points

### With Investment Portfolio
- Seamless navigation between portfolio and rebalancing tool
- Shares portfolio data and asset information
- Real-time allocation calculations

### With Notifications System
- Rebalancing alerts sent as notifications
- Email notifications for scheduled rebalancing
- Push notifications for critical deviations

### With Tax Reporting
- Tax impact data feeds into tax reports
- Cost basis tracking for accurate calculations
- Short-term vs long-term capital gains tracking

## Security & Permissions

- User authentication required for all operations
- Portfolio ownership verified on all requests
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure execution confirmation required

## Performance Considerations

- Calculations are performed on-demand
- Cron jobs run during off-peak hours
- Historical data is paginated (50 items default)
- Chart data is optimized for rendering
- Alerts expire after 30 days

## Future Enhancements

1. **Machine Learning Predictions**: AI-powered optimal rebalancing timing
2. **Tax-Loss Harvesting**: Automatic tax-loss harvesting suggestions
3. **Multi-Currency Support**: Rebalancing across different currencies
4. **Risk Analysis**: Portfolio risk metrics and rebalancing impact
5. **What-If Analysis**: Simulate different rebalancing strategies
6. **Integration with Brokers**: Direct execution through broker APIs
7. **Custom Asset Classes**: User-defined asset classifications
8. **Backtesting**: Historical analysis of rebalancing strategies

## Support & Troubleshooting

### Common Issues

**Q: Why aren't my trades executing?**
A: Check that you've approved the rebalancing proposal first. Auto-rebalancing must be explicitly enabled.

**Q: Tax calculations seem wrong?**
A: Ensure your cost basis is accurate. The system uses FIFO by default. Check asset transaction history.

**Q: I'm not receiving alerts?**
A: Verify notification settings and that target allocation is set. Check alert history in the UI.

**Q: Minimum trade amount not working?**
A: Ensure the deviation value exceeds the minimum trade amount setting (default $100).

## Credits

Developed as part of ExpenseFlow - Advanced Investment Portfolio Management System

---

For questions or issues, please refer to the main ExpenseFlow documentation or contact support.
