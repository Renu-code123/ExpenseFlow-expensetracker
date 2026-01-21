# Multi-Currency Support - Implementation Guide

## Overview
This document provides comprehensive information about the multi-currency support feature implemented in ExpenseFlow. The feature allows users to track expenses in multiple currencies with automatic conversion using real-time exchange rates.

## Features Implemented

### ✅ Backend Features
1. **Currency Service** (`services/currencyService.js`)
   - Fetches real-time exchange rates from external APIs
   - Supports 30+ major world currencies
   - Implements caching mechanism (1-hour TTL)
   - Automatic fallback to secondary API if primary fails
   - Fallback to expired cache if both APIs fail

2. **Database Models**
   - `CurrencyRate` model for storing cached exchange rates
   - Updated `User` model with currency preferences
   - Updated `Expense` model with multi-currency fields

3. **API Endpoints** (`routes/currency.js`)
   - `GET /api/currency/rates` - Get current exchange rates
   - `GET /api/currency/convert` - Convert amount between currencies
   - `GET /api/currency/supported` - List all supported currencies
   - `GET /api/currency/preference` - Get user's currency preference
   - `PUT /api/currency/preference` - Update user's currency preference

4. **Automatic Updates**
   - Cron job runs every 6 hours to update exchange rates
   - Updates rates for major base currencies (USD, EUR, GBP, INR)

### ✅ Frontend Features
1. **Currency Selection**
   - Currency selector in expense form
   - Displays currency symbol, code, and full name
   - Pre-populated with user's preferred currency

2. **Currency Settings Modal**
   - Accessible via currency button in navbar
   - Shows current exchange rates for popular currencies
   - Allows changing preferred currency
   - Displays last update timestamp

3. **Automatic Conversion**
   - All expenses displayed in user's preferred currency
   - Original currency and amount preserved
   - Exchange rate information stored with each transaction

## Supported Currencies (34 total)

| Code | Currency | Symbol |
|------|----------|--------|
| USD | US Dollar | $ |
| EUR | Euro | € |
| GBP | British Pound | £ |
| JPY | Japanese Yen | ¥ |
| AUD | Australian Dollar | A$ |
| CAD | Canadian Dollar | C$ |
| CHF | Swiss Franc | CHF |
| CNY | Chinese Yuan | ¥ |
| HKD | Hong Kong Dollar | HK$ |
| NZD | New Zealand Dollar | NZ$ |
| SEK | Swedish Krona | kr |
| KRW | South Korean Won | ₩ |
| SGD | Singapore Dollar | S$ |
| NOK | Norwegian Krone | kr |
| MXN | Mexican Peso | $ |
| INR | Indian Rupee | ₹ |
| RUB | Russian Ruble | ₽ |
| ZAR | South African Rand | R |
| TRY | Turkish Lira | ₺ |
| BRL | Brazilian Real | R$ |
| TWD | Taiwan Dollar | NT$ |
| DKK | Danish Krone | kr |
| PLN | Polish Zloty | zł |
| THB | Thai Baht | ฿ |
| IDR | Indonesian Rupiah | Rp |
| HUF | Hungarian Forint | Ft |
| CZK | Czech Koruna | Kč |
| ILS | Israeli Shekel | ₪ |
| CLP | Chilean Peso | $ |
| PHP | Philippine Peso | ₱ |
| AED | UAE Dirham | د.إ |
| SAR | Saudi Riyal | ﷼ |
| MYR | Malaysian Ringgit | RM |
| RON | Romanian Leu | lei |

## API Integration

### Primary API
- **Provider**: exchangerate-api.com
- **Endpoint**: `https://api.exchangerate-api.com/v4/latest/{baseCurrency}`
- **Rate Limit**: Free tier (no API key required)
- **Update Frequency**: Every 6 hours

### Fallback API
- **Provider**: frankfurter.app
- **Endpoint**: `https://api.frankfurter.app/latest?from={baseCurrency}`
- **Rate Limit**: Free, no authentication required

## Database Schema Updates

### User Model
```javascript
{
  preferredCurrency: {
    type: String,
    default: 'INR',
    uppercase: true
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

### Expense Model
```javascript
{
  amount: Number,              // Primary amount (original)
  originalAmount: Number,      // Original amount entered
  originalCurrency: String,    // Currency used for entry
  convertedAmount: Number,     // Converted amount (optional)
  convertedCurrency: String,   // Target currency (optional)
  exchangeRate: Number         // Exchange rate used (optional)
}
```

### CurrencyRate Model
```javascript
{
  baseCurrency: String,        // Base currency code
  rates: Map<String, Number>,  // Currency -> Rate mapping
  lastUpdated: Date,           // Timestamp of last update
  source: String,              // API source used
  expiresAt: Date             // Cache expiration time
}
```

## Usage Examples

### Setting User's Preferred Currency
```javascript
PUT /api/currency/preference
Authorization: Bearer <token>
Content-Type: application/json

{
  "currency": "USD",
  "locale": "en-US",
  "decimalPlaces": 2
}
```

### Adding Expense with Currency
```javascript
POST /api/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Coffee",
  "amount": 5.50,
  "currency": "USD",
  "category": "food",
  "type": "expense",
  "date": "2026-01-20"
}
```

### Converting Currency
```javascript
GET /api/currency/convert?amount=100&from=USD&to=EUR
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "originalAmount": 100,
    "originalCurrency": "USD",
    "convertedAmount": 92.5,
    "convertedCurrency": "EUR",
    "exchangeRate": 0.925,
    "lastUpdated": "2026-01-20T10:00:00.000Z"
  }
}
```

### Getting Exchange Rates
```javascript
GET /api/currency/rates?base=USD
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "baseCurrency": "USD",
    "rates": {
      "EUR": 0.925,
      "GBP": 0.79,
      "INR": 83.25,
      ...
    },
    "lastUpdated": "2026-01-20T10:00:00.000Z",
    "source": "exchangerate-api.com",
    "cached": true
  }
}
```

## Caching Strategy

### Cache Duration
- **Primary Cache**: 1 hour (3600 seconds)
- **Fallback**: Expired cache used if APIs unavailable

### Cache Updates
- Automatic updates every 6 hours via cron job
- On-demand updates when cache expires
- Multiple base currencies updated (USD, EUR, GBP, INR)

### Cache Benefits
1. Reduced API calls
2. Faster response times
3. Reliability during API outages
4. Cost-effective for high-traffic applications

## Frontend Integration

### Loading Currencies on Page Load
```javascript
document.addEventListener('DOMContentLoaded', function() {
  loadSupportedCurrencies();
  loadUserCurrencyPreference();
});
```

### Opening Currency Settings
```javascript
function openCurrencyModal() {
  document.getElementById('currency-modal').style.display = 'flex';
  loadExchangeRateInfo();
}
```

### Saving Currency Preference
```javascript
async function saveCurrencyPreference() {
  const token = localStorage.getItem('token');
  const newCurrency = document.getElementById('preferred-currency').value;
  
  const response = await fetch('/api/currency/preference', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currency: newCurrency })
  });
  
  if (response.ok) {
    location.reload(); // Reload to show expenses in new currency
  }
}
```

## Error Handling

### API Failures
1. **Primary API fails**: Automatically switches to fallback API
2. **Both APIs fail**: Uses expired cache if available
3. **No cache available**: Returns appropriate error message

### Validation Errors
- Invalid currency codes rejected
- Amount validation (must be positive)
- User authentication required for all endpoints

### Frontend Error Handling
- User-friendly error messages
- Graceful degradation if APIs unavailable
- Loading states during async operations

## Performance Considerations

### Optimization Strategies
1. **Database Indexing**
   - Index on `baseCurrency` and `lastUpdated` in CurrencyRate
   - Index on `expiresAt` for efficient cache queries

2. **Caching**
   - 1-hour cache reduces API calls by ~95%
   - Multi-level fallback ensures availability

3. **Async Operations**
   - Non-blocking currency conversions
   - Parallel API requests for multiple base currencies

4. **Query Optimization**
   - Aggregation pipelines for expense calculations
   - Selective field loading with `.select()`

## Security Considerations

1. **Authentication Required**
   - All currency endpoints require valid JWT token
   - User can only modify their own preferences

2. **Input Validation**
   - Currency codes validated against supported list
   - Amount validation prevents negative values
   - SQL injection prevention via Mongoose

3. **Rate Limiting** (Recommended for Production)
   - Implement rate limiting on API endpoints
   - Prevent abuse of currency conversion endpoint

## Testing Checklist

### Backend Tests
- [ ] Currency service fetches rates successfully
- [ ] Fallback API works when primary fails
- [ ] Cache expiration works correctly
- [ ] User preference updates persist
- [ ] Expense creation with currency works
- [ ] Currency conversion calculations accurate
- [ ] Cron job updates rates on schedule

### Frontend Tests
- [ ] Currency selector populates correctly
- [ ] Currency modal opens and closes
- [ ] Exchange rates display properly
- [ ] Preference updates reflect in UI
- [ ] Expenses display in user's currency
- [ ] Mobile responsive design works

### Integration Tests
- [ ] End-to-end expense creation with conversion
- [ ] User changes preference and sees updated expenses
- [ ] System handles API failures gracefully
- [ ] Cache invalidation and refresh works

## Troubleshooting

### Common Issues

**Issue**: Exchange rates not updating
- **Solution**: Check cron job status, verify API connectivity
- **Command**: Check logs for "Updating exchange rates..." message

**Issue**: Currency conversion fails
- **Solution**: Verify currency codes are valid and supported
- **Check**: GET /api/currency/supported endpoint

**Issue**: User preference not saving
- **Solution**: Ensure user is authenticated, check JWT token validity
- **Debug**: Check browser console for error messages

**Issue**: Frontend not showing currencies
- **Solution**: Verify API endpoints are accessible
- **Check**: Network tab in browser developer tools

## Future Enhancements

### Planned Features
1. **Historical Rates**
   - Store historical exchange rates
   - Allow viewing past conversions with original rates

2. **Custom Exchange Rates**
   - Allow manual rate entry for specific currencies
   - Override automatic rates for business purposes

3. **Multi-Currency Reports**
   - Generate reports showing expenses by original currency
   - Currency distribution charts

4. **Cryptocurrency Support**
   - Add support for BTC, ETH, and other cryptocurrencies
   - Real-time crypto exchange rates

5. **Offline Support**
   - Cache rates in localStorage for offline access
   - Queue conversion requests when offline

## Contributing

When contributing to currency feature:
1. Follow existing code style
2. Add tests for new currency-related features
3. Update this documentation for changes
4. Ensure backward compatibility

## Dependencies

```json
{
  "axios": "^1.6.2",           // HTTP client for API calls
  "node-cron": "^3.0.3",       // Cron job scheduler
  "mongoose": "^7.8.8"         // MongoDB ODM
}
```

## Support

For issues or questions:
- Check existing GitHub issues
- Review API documentation
- Contact development team

---

**Implementation Date**: January 20, 2026  
**Version**: 1.0.0  
**Status**: ✅ Completed
