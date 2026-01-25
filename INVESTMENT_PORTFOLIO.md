# Multi-Currency Investment Portfolio & Asset Tracking

This guide covers the comprehensive investment portfolio feature in ExpenseFlow, enabling users to track stocks, crypto, bonds, and other assets with real-time prices and performance analytics.

## Features

- **Multi-Asset Portfolio Management**: Track stocks, cryptocurrencies, bonds, mutual funds, ETFs, real estate, and commodities
- **Real-Time Price Updates**: Integration with Alpha Vantage (stocks) and CoinGecko (crypto)
- **Tax Lot Tracking**: FIFO, LIFO, and average cost basis methods
- **Performance Analytics**: Calculate returns, CAGR, Sharpe ratio, volatility, and more
- **Dividend Tracking**: Record dividends with reinvestment support
- **Portfolio Rebalancing**: Target allocation suggestions
- **Historical Charts**: Price history and portfolio performance visualization
- **Watchlist**: Track assets without owning them

## Environment Variables

```env
# Investment API Keys
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
```

Note: CoinGecko API doesn't require an API key for basic usage.

## API Endpoints

### Portfolios

#### Create Portfolio
```http
POST /api/investments/portfolios
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Main Portfolio",
  "description": "Long-term investments",
  "baseCurrency": "USD",
  "costBasisMethod": "fifo",
  "targetAllocations": [
    { "assetType": "stock", "targetPercent": 60 },
    { "assetType": "bond", "targetPercent": 30 },
    { "assetType": "crypto", "targetPercent": 10 }
  ]
}
```

#### Get User Portfolios
```http
GET /api/investments/portfolios
Authorization: Bearer <token>
```

#### Get Portfolio with Values
```http
GET /api/investments/portfolios/:portfolioId
Authorization: Bearer <token>
```

#### Get Portfolio Performance
```http
GET /api/investments/portfolios/:portfolioId/performance
Authorization: Bearer <token>
```

#### Get Portfolio History (for charts)
```http
GET /api/investments/portfolios/:portfolioId/history?days=365
Authorization: Bearer <token>
```

#### Get Rebalancing Suggestions
```http
GET /api/investments/portfolios/:portfolioId/rebalance
Authorization: Bearer <token>
```

### Transactions

#### Buy Asset
```http
POST /api/investments/transactions/buy
Authorization: Bearer <token>
Content-Type: application/json

{
  "portfolioId": "portfolio_id",
  "symbol": "AAPL",
  "assetType": "stock",
  "quantity": 10,
  "price": 150.50,
  "fees": {
    "commission": 4.95
  },
  "date": "2024-01-15",
  "notes": "Initial position"
}
```

#### Sell Asset
```http
POST /api/investments/transactions/sell
Authorization: Bearer <token>
Content-Type: application/json

{
  "portfolioId": "portfolio_id",
  "symbol": "AAPL",
  "quantity": 5,
  "price": 175.00,
  "costBasisMethod": "fifo",
  "fees": {
    "commission": 4.95
  }
}
```

#### Record Dividend
```http
POST /api/investments/transactions/dividend
Authorization: Bearer <token>
Content-Type: application/json

{
  "portfolioId": "portfolio_id",
  "symbol": "AAPL",
  "dividendPerShare": 0.24,
  "dividendType": "cash",
  "reinvested": false,
  "date": "2024-03-15"
}
```

#### Transfer Between Portfolios
```http
POST /api/investments/transactions/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "fromPortfolioId": "source_portfolio_id",
  "toPortfolioId": "target_portfolio_id",
  "symbol": "AAPL",
  "quantity": 5,
  "costBasis": 750.00,
  "purchaseDate": "2024-01-15"
}
```

#### Get Transaction History
```http
GET /api/investments/transactions?portfolioId=xxx&type=buy&page=1&limit=50
Authorization: Bearer <token>
```

#### Get Realized Gains Report
```http
GET /api/investments/transactions/gains?year=2024
Authorization: Bearer <token>
```

#### Get Dividend History
```http
GET /api/investments/transactions/dividends?year=2024
Authorization: Bearer <token>
```

### Assets

#### Search Assets
```http
GET /api/investments/assets/search?query=apple&type=stock&limit=20
Authorization: Bearer <token>
```

#### Search Crypto
```http
GET /api/investments/assets/search/crypto?query=bitcoin
Authorization: Bearer <token>
```

#### Get Asset Details
```http
GET /api/investments/assets/:assetId
Authorization: Bearer <token>
```

#### Get Asset Price History
```http
GET /api/investments/assets/:assetId/history?interval=daily&days=365
Authorization: Bearer <token>
```

#### Refresh Asset Price
```http
POST /api/investments/assets/:assetId/refresh
Authorization: Bearer <token>
```

#### Import Historical Data
```http
POST /api/investments/assets/:assetId/import-history
Authorization: Bearer <token>
Content-Type: application/json

{
  "days": 365
}
```

### Watchlist

#### Get Watchlist
```http
GET /api/investments/watchlist
Authorization: Bearer <token>
```

#### Add to Watchlist
```http
POST /api/investments/watchlist
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "TSLA",
  "type": "stock"
}
```

#### Remove from Watchlist
```http
DELETE /api/investments/watchlist/:assetId
Authorization: Bearer <token>
```

### Dashboard

#### Get Investment Dashboard
```http
GET /api/investments/dashboard
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "totalValue": 125000.50,
    "totalDayChange": 1250.25,
    "dayChangePercent": 1.01,
    "portfolioCount": 2,
    "assetAllocation": {
      "stock": 75000,
      "crypto": 25000,
      "bond": 25000
    },
    "watchlist": [...],
    "recentTransactions": [...]
  }
}
```

## Data Models

### Asset
Stores information about tradeable assets:
- Symbol and name
- Asset type (stock, crypto, bond, etc.)
- Current price and market data
- Historical price data source (Alpha Vantage, CoinGecko)

### Portfolio
User investment portfolio with:
- Holdings array with tax lot tracking
- Cost basis method (FIFO, LIFO, Average)
- Target allocations for rebalancing
- Performance metrics
- Historical snapshots

### AssetTransaction
Records all investment activity:
- Buy/sell/dividend/split transactions
- Fee tracking
- Realized gain/loss calculation
- Tax lot assignment

### PriceHistory
Historical price data for:
- OHLCV data (Open, High, Low, Close, Volume)
- Technical indicators
- Multiple time intervals

## Performance Metrics

### Portfolio Metrics
- **Total Return**: Current value vs total invested
- **CAGR**: Compound Annual Growth Rate
- **Sharpe Ratio**: Risk-adjusted return
- **Volatility**: Standard deviation of returns
- **Max Drawdown**: Peak to trough decline

### Asset Metrics
- **Returns**: 7d, 30d, 90d, 365d returns
- **Volatility**: Daily and annualized
- **Moving Averages**: SMA 20, 50, 200
- **52-Week High/Low**

## Cost Basis Methods

### FIFO (First In, First Out)
Sells oldest shares first. Default method.

### LIFO (Last In, First Out)
Sells newest shares first. May minimize taxes in rising markets.

### Average Cost
Uses weighted average cost of all shares. Simplest for reporting.

## Cron Jobs

The system automatically:
- Updates stock prices hourly during market hours (9 AM - 5 PM EST, weekdays)
- Updates crypto prices every 15 minutes (24/7)
- Takes daily portfolio snapshots at market close
- Cleans old price data (keeps 5 years)

## Example Usage

### Creating an Investment Portfolio

```javascript
// 1. Create portfolio
const portfolio = await fetch('/api/investments/portfolios', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Retirement Fund',
    baseCurrency: 'USD',
    targetAllocations: [
      { assetType: 'stock', targetPercent: 70 },
      { assetType: 'bond', targetPercent: 25 },
      { assetType: 'cash', targetPercent: 5 }
    ]
  })
});

// 2. Buy stocks
await fetch('/api/investments/transactions/buy', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    portfolioId: portfolio.id,
    symbol: 'VTI',
    assetType: 'etf',
    quantity: 50,
    price: 220.00
  })
});

// 3. Check performance
const performance = await fetch(`/api/investments/portfolios/${portfolio.id}/performance`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Security

- All endpoints require authentication
- Users can only access their own portfolios
- API keys stored securely in environment variables
- Rate limiting on external API calls

## Rate Limits

### Alpha Vantage (Free Tier)
- 5 API calls per minute
- 500 API calls per day
- System includes built-in rate limiting

### CoinGecko (Free Tier)
- 10-30 calls per minute
- More generous limits than Alpha Vantage

## Future Enhancements

- [ ] Options and futures tracking
- [ ] Tax-loss harvesting suggestions
- [ ] Integration with more data providers
- [ ] Real-time WebSocket price updates
- [ ] Benchmark comparison (S&P 500, etc.)
- [ ] Import from brokerage accounts (CSV/OFX)
- [ ] Multi-currency portfolio consolidation
