# Multi-Currency Crypto & Stock Portfolio Tracker

## Overview

A comprehensive investment portfolio tracking system that monitors stocks, cryptocurrencies, ETFs, and mutual funds across multiple currencies with real-time price updates, performance analytics, and intelligent investment insights.

## Features

### 1. Multi-Asset Support
- **Stocks**: Track individual stocks from major exchanges
- **Cryptocurrencies**: Bitcoin, Ethereum, and 10,000+ digital assets
- **ETFs**: Exchange-Traded Funds tracking
- **Mutual Funds**: Mutual fund portfolio management
- **Bonds**: Fixed-income securities
- **Cash**: Cash and cash equivalents

### 2. Real-Time Price Tracking
- Integration with multiple price data providers:
  - **CoinGecko**: Cryptocurrency prices (10,000+ coins)
  - **Alpha Vantage**: Stock and ETF prices
  - **Finnhub**: Real-time stock quotes
  - **Polygon**: Market data (optional)
- Automatic price updates every 15 minutes during market hours
- Price caching to minimize API calls
- Historical price data storage (365 days)

### 3. Portfolio Management
- Multiple portfolio support
- Custom portfolio names and descriptions
- Base currency selection (USD, EUR, GBP, INR, etc.)
- Buy/sell transaction recording
- Dividend and interest income tracking
- Tax lot tracking (FIFO/LIFO methods)
- Asset allocation visualization
- Portfolio rebalancing recommendations

### 4. Performance Analytics
- **Return Metrics**:
  - ROI (Return on Investment)
  - CAGR (Compound Annual Growth Rate)
  - YTD, 1-year, 3-year, 5-year returns
- **Risk Metrics**:
  - Volatility (standard deviation)
  - Sharpe Ratio
  - Beta and Alpha
  - Maximum Drawdown
- **Diversification Analysis**:
  - Herfindahl-Hirschman Index
  - Concentration risk assessment
  - Asset correlation analysis

### 5. Transaction Management
- Buy/sell/transfer transactions
- Dividend payments
- Stock splits
- Transaction history
- Cost basis tracking
- Realized/unrealized gains calculation
- Tax reporting support

### 6. Price Alerts
- Target price alerts (above/below)
- Percentage change alerts
- Email/push/in-app notifications
- Customizable alert conditions

### 7. Benchmarking
- Compare portfolio performance with major indices:
  - S&P 500
  - NASDAQ
  - NIFTY 50
  - SENSEX
  - FTSE 100
  - DAX
  - Bitcoin
  - Gold
- Correlation analysis
- Relative performance tracking

## Technical Architecture

### Models

#### 1. Portfolio Model
Manages portfolio containers and overall portfolio data.

**Key Fields**:
- `name`, `description`: Portfolio identification
- `base_currency`: Base currency for reporting
- `total_value`, `total_invested`, `total_return`: Financial metrics
- `asset_allocation`: Breakdown by asset type
- `performance_metrics`: ROI, CAGR, Sharpe ratio, volatility
- `benchmarks[]`: Performance vs. indices
- `risk_metrics`: Risk assessment scores
- `rebalancing`: Target allocation and recommendations
- `historical_values[]`: Time-series portfolio values
- `dividend_income`: Dividend tracking

**Methods**:
- `updateTotalValue()`: Update portfolio value
- `addHistoricalValue()`: Record daily snapshot
- `updateAssetAllocation()`: Recalculate allocation
- `checkRebalancing()`: Generate rebalancing recommendations
- `updateDividendIncome()`: Track dividend payments

#### 2. Asset Model
Individual asset holdings within portfolios.

**Key Fields**:
- `portfolio`: Parent portfolio reference
- `asset_type`: stock/crypto/etf/mutual_fund/bond/cash
- `symbol`, `name`: Asset identification
- `quantity`, `average_buy_price`, `current_price`: Position data
- `current_value`, `total_invested`: Value tracking
- `unrealized_gain`, `realized_gain`: Profit/loss
- `tax_lots[]`: FIFO/LIFO cost basis tracking
- `dividend_info`: Dividend yield and history
- `price_alerts[]`: Price alert configurations
- `metadata`: Sector, industry, market cap, etc.

**Methods**:
- `updateCurrentPrice()`: Update with latest price
- `addTransaction()`: Record buy transaction
- `sellShares()`: Sell shares with tax lot accounting
- `checkPriceAlerts()`: Trigger price alerts
- `addDividend()`: Record dividend payment

#### 3. Transaction Model
Records all portfolio transactions.

**Key Fields**:
- `transaction_type`: buy/sell/dividend/split/transfer/fee
- `symbol`, `asset_type`: Transaction target
- `transaction_date`: When transaction occurred
- `quantity`, `price`, `total_amount`, `fees`: Transaction details
- `currency`, `exchange_rate`: Multi-currency support
- `tax_info`: Tax reporting data (gain/loss, holding period)
- `split_info`: Stock split details
- `status`: pending/completed/cancelled/failed

**Methods**:
- `calculateGainLoss()`: Calculate tax gain/loss
- `cancel()`: Cancel pending transaction

**Static Methods**:
- `getPortfolioTransactions()`: Get all transactions
- `getDividendHistory()`: Dividend history
- `getTaxReport()`: Annual tax report
- `getTransactionSummary()`: Summary statistics

#### 4. PriceHistory Model
Caches historical price data.

**Key Fields**:
- `symbol`, `asset_type`: Asset identification
- `prices[]`: OHLCV data points
- `latest_price`: Most recent price with change
- `metadata`: Asset information (sector, PE ratio, etc.)
- `data_source`: API provider and update info
- `cache_info`: TTL and staleness tracking

**Methods**:
- `addPrice()`: Add historical price point
- `updateLatestPrice()`: Update current price
- `getHistoricalData()`: Retrieve price history
- `calculateVolatility()`: Calculate price volatility
- `markStale()`: Mark for refresh

### Services

#### 1. portfolioService.js
Core portfolio management and calculations.

**Key Methods**:
- `createPortfolio()`: Create new portfolio
- `getPortfolio()`: Get portfolio with assets
- `updatePortfolioMetrics()`: Recalculate all metrics
- `addAsset()`: Add new asset to portfolio
- `buyAsset()`: Buy more shares of existing asset
- `sellAsset()`: Sell shares with tax accounting
- `recordDividend()`: Record dividend payment
- `getAnalytics()`: Comprehensive analytics
- `getPerformanceHistory()`: Historical performance
- `calculateDiversification()`: HHI-based score

**Private Methods**:
- `_calculatePerformanceMetrics()`: Calculate ROI, CAGR, Sharpe, volatility
- Risk and concentration analysis

#### 2. priceUpdateService.js
Real-time price fetching and caching.

**Key Methods**:
- `updateAssetPrice()`: Update single asset price
- `batchUpdatePrices()`: Update multiple assets
- `updatePortfolioPrices()`: Update entire portfolio
- `getQuote()`: Get real-time quote
- `searchAssets()`: Search for stocks/crypto
- `getHistoricalPrices()`: Fetch historical data

**API Integration Methods**:
Crypto (CoinGecko):
- `_getCryptoPrice()`: Current price
- `_getCryptoQuote()`: Detailed quote
- `_getCryptoHistoricalPrices()`: Historical data
- `_searchCrypto()`: Search cryptocurrencies

Stocks (Alpha Vantage, Finnhub):
- `_getStockPrice()`: Current price
- `_getStockQuote()`: Detailed quote
- `_getStockHistoricalPrices()`: Historical data
- `_searchStocks()`: Search stocks

**Supported APIs**:
- **CoinGecko**: Free tier, 50 calls/min
- **Alpha Vantage**: Free tier, 5 calls/min (500/day)
- **Finnhub**: Free tier, 60 calls/min
- **Polygon**: Premium, 5 calls/min

### Routes

#### /api/portfolios

**Portfolio Management**:
```
POST   /api/portfolios                    - Create portfolio
GET    /api/portfolios                    - Get all user portfolios
GET    /api/portfolios/:id                - Get portfolio details
GET    /api/portfolios/:id/analytics      - Get portfolio analytics
POST   /api/portfolios/:id/update-metrics - Update metrics
GET    /api/portfolios/:id/performance    - Performance history
POST   /api/portfolios/:id/update-prices  - Update all asset prices
```

**Asset Management**:
```
POST   /api/portfolios/:id/assets                    - Add new asset
POST   /api/portfolios/:id/assets/:assetId/buy       - Buy more shares
POST   /api/portfolios/:id/assets/:assetId/sell      - Sell shares
POST   /api/portfolios/:id/assets/:assetId/dividend  - Record dividend
```

## API Examples

### Create Portfolio

```javascript
POST /api/portfolios
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Growth Portfolio",
  "description": "High-growth tech stocks and crypto",
  "base_currency": "USD",
  "target_allocation": {
    "stocks": 60,
    "crypto": 20,
    "bonds": 15,
    "cash": 5
  }
}

Response:
{
  "success": true,
  "data": {
    "_id": "portfolio_id",
    "name": "Growth Portfolio",
    "base_currency": "USD",
    "total_value": 0,
    "total_invested": 0,
    "asset_allocation": {...},
    "performance_metrics": {...}
  }
}
```

### Add Asset to Portfolio

```javascript
POST /api/portfolios/:id/assets
Authorization: Bearer <token>

{
  "asset_type": "stock",
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "quantity": 10,
  "purchase_price": 150.00,
  "purchase_date": "2024-01-15",
  "currency": "USD",
  "fees": 5.00
}

Response:
{
  "success": true,
  "data": {
    "_id": "asset_id",
    "symbol": "AAPL",
    "quantity": 10,
    "average_buy_price": 150.00,
    "current_price": 150.00,
    "current_value": 1500.00,
    "unrealized_gain": 0
  }
}
```

### Buy More Shares

```javascript
POST /api/portfolios/:id/assets/:assetId/buy
Authorization: Bearer <token>

{
  "quantity": 5,
  "price": 155.00,
  "date": "2024-01-20",
  "fees": 2.50,
  "notes": "Additional purchase"
}

Response:
{
  "success": true,
  "data": {
    "asset": {
      "quantity": 15,
      "average_buy_price": 151.67,
      "current_value": 2325.00
    },
    "transaction": {
      "transaction_type": "buy",
      "quantity": 5,
      "price": 155.00,
      "total_amount": 775.00
    }
  }
}
```

### Sell Shares

```javascript
POST /api/portfolios/:id/assets/:assetId/sell
Authorization: Bearer <token>

{
  "quantity": 3,
  "price": 160.00,
  "date": "2024-01-25",
  "fees": 1.50,
  "tax_lot_method": "FIFO",
  "notes": "Taking profits"
}

Response:
{
  "success": true,
  "data": {
    "asset": {
      "quantity": 12,
      "realized_gain": 25.50,
      "current_value": 1920.00
    },
    "transaction": {
      "transaction_type": "sell",
      "quantity": 3,
      "price": 160.00,
      "tax_info": {
        "cost_basis": 454.50,
        "gain_loss": 25.50,
        "holding_period": "long_term"
      }
    }
  }
}
```

### Get Portfolio Analytics

```javascript
GET /api/portfolios/:id/analytics
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "portfolio": {
      "total_value": 50000,
      "total_invested": 45000,
      "total_return": 5000,
      "total_return_percentage": 11.11,
      "performance_metrics": {
        "roi": 11.11,
        "cagr": 8.5,
        "sharpe_ratio": 1.2,
        "volatility": 15.3
      },
      "asset_allocation": {
        "stocks": { "value": 30000, "percentage": 60 },
        "crypto": { "value": 10000, "percentage": 20 },
        "bonds": { "value": 7500, "percentage": 15 },
        "cash": { "value": 2500, "percentage": 5 }
      }
    },
    "top_performers": [
      {
        "symbol": "TSLA",
        "unrealized_gain_percentage": 45.2,
        "current_value": 8500
      }
    ],
    "worst_performers": [...],
    "dividend_summary": {
      "total": 1250,
      "count": 12
    }
  }
}
```

### Update Portfolio Prices

```javascript
POST /api/portfolios/:id/update-prices
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total": 15,
    "success": 14,
    "failed": 1,
    "details": [
      {
        "success": true,
        "symbol": "AAPL",
        "price": 165.50,
        "provider": "alpha_vantage",
        "triggered_alerts": 0
      },
      {
        "success": true,
        "symbol": "BTC",
        "price": 42500,
        "provider": "coingecko",
        "triggered_alerts": 1
      }
    ]
  }
}
```

## Automated Tasks (Cron Jobs)

### Price Updates (Every 15 minutes, 9 AM - 4 PM, Mon-Fri)
```javascript
cron.schedule('*/15 9-16 * * 1-5', updatePortfolioPrices)
```
- Updates all asset prices during market hours
- Respects API rate limits (250ms delay between calls)
- Triggers price alerts
- Updates price history cache

### Daily Portfolio Metrics (5:00 PM daily)
```javascript
cron.schedule('0 17 * * *', updateDailyPortfolioMetrics)
```
- Recalculates portfolio values
- Updates performance metrics
- Checks rebalancing needs
- Records historical snapshots
- Calculates risk metrics

## Environment Variables

```bash
# API Keys (Required)
COINGECKO_API_KEY=your_coingecko_key  # Optional for free tier
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key
POLYGON_API_KEY=your_polygon_key  # Optional

# Database
MONGODB_URI=mongodb://localhost:27017/expenseflow

# Server
PORT=3000
NODE_ENV=production
```

## Performance Metrics Explained

### ROI (Return on Investment)
```
ROI = ((Current Value - Total Invested) / Total Invested) × 100
```
Simple percentage return on investment.

### CAGR (Compound Annual Growth Rate)
```
CAGR = ((Ending Value / Beginning Value)^(1/Years) - 1) × 100
```
Annualized growth rate over time.

### Sharpe Ratio
```
Sharpe Ratio = (Portfolio Return - Risk-Free Rate) / Portfolio Volatility
```
Risk-adjusted return. Higher is better.
- < 1: Sub-optimal
- 1-2: Good
- 2-3: Very good
- \> 3: Excellent

### Volatility
```
Volatility = Standard Deviation of Returns × √252
```
Annualized standard deviation of daily returns. Measures price fluctuation.

### Diversification Score (Herfindahl-Hirschman Index)
```
HHI = Σ(Asset Share)²
Diversification Score = ((1 - HHI) / (1 - 1/N)) × 100
```
Measures portfolio concentration:
- 0-40: Highly concentrated
- 40-70: Moderately diversified
- 70-100: Well diversified

## Tax Reporting

### Tax Lot Methods

**FIFO (First-In, First-Out)**:
- Sells oldest shares first
- Usually results in more long-term gains
- Default method

**LIFO (Last-In, First-Out)**:
- Sells newest shares first
- May reduce short-term gains
- Optional method

### Tax Report Generation

```javascript
GET /api/portfolios/:id/tax-report?year=2024

Returns:
- All sales with gain/loss
- Dividend income
- Interest income
- Short-term vs. long-term gains
- Cost basis details
```

## Real-Time Price Data Sources

### CoinGecko (Cryptocurrency)
- **Coverage**: 10,000+ cryptocurrencies
- **Rate Limit**: 50 calls/min (free tier)
- **Data**: Price, market cap, volume, 24h change
- **Historical**: Up to 365 days
- **Cost**: Free

### Alpha Vantage (Stocks/ETFs)
- **Coverage**: US and international stocks
- **Rate Limit**: 5 calls/min, 500/day (free tier)
- **Data**: OHLCV, fundamentals
- **Historical**: 20+ years
- **Cost**: Free/$49.99/month premium

### Finnhub (Real-Time Stocks)
- **Coverage**: Global stocks
- **Rate Limit**: 60 calls/min (free tier)
- **Data**: Real-time quotes, company info
- **Cost**: Free/$59.99/month premium

## Security & Best Practices

### API Key Management
- Store API keys in environment variables
- Never commit keys to version control
- Rotate keys regularly
- Monitor API usage

### Rate Limiting
- Respect API rate limits
- Implement exponential backoff
- Cache responses
- Use batch operations

### Data Privacy
- Encrypt sensitive data
- User data isolation
- GDPR compliance
- Audit logging

## Future Enhancements

### Planned Features
1. **Advanced Analytics**:
   - Monte Carlo simulations
   - Portfolio optimization
   - Risk scenario analysis
   - Value at Risk (VaR)

2. **Social Features**:
   - Public portfolio sharing
   - Leaderboards
   - Copy trading
   - Discussion forums

3. **Additional Assets**:
   - Commodities (gold, silver, oil)
   - Forex trading
   - Options and derivatives
   - Real estate

4. **Mobile App**:
   - React Native app
   - Push notifications
   - Biometric authentication
   - Offline mode

5. **AI/ML Features**:
   - Price prediction
   - Portfolio recommendations
   - Risk assessment
   - Anomaly detection

## Troubleshooting

### Common Issues

**Price Updates Failing**:
- Check API keys are valid
- Verify rate limits not exceeded
- Check network connectivity
- Review error logs

**Incorrect Portfolio Values**:
- Trigger manual price update
- Recalculate metrics
- Verify transaction history
- Check currency conversions

**Performance Issues**:
- Enable price caching
- Reduce update frequency
- Optimize database queries
- Use indexes

## Support

### Documentation
- API Reference: `/docs/api/portfolios`
- Code Examples: `/examples/portfolio-tracking`
- Video Tutorials: `/tutorials`

### Community
- GitHub Issues: https://github.com/Renu-code123/ExpenseFlow/issues
- Discord: #portfolio-tracker
- Email: support@expenseflow.com

## License
MIT License - See LICENSE file for details

## Contributors
- @SatyamPandey-07 - Initial implementation
- @Renu-code123 - Feature design and review
- ECWoC26 Program - Open source contribution

---

**Note**: This feature is part of ExpenseFlow #287 issue implementation. Configure API keys before use. See `.env.example` for required environment variables.
