# GitHub Issues for ExpenseFlow

This file contains two GitHub issues ready to be posted to the repository.

---

## ISSUE 1: Bug Report - Backend-Frontend Disconnection

### Template Metadata
```yaml
name: Bug report
about: Create a report to help us improve
title: '[BUG] Frontend not connected to Backend API - LocalStorage used instead'
labels: 'bug, priority: critical, backend, frontend'
assignees: ''
```

### Issue Content

**Describe the bug**

The frontend application (`trackerscript.js`) is currently using browser LocalStorage for data persistence and is not connected to the backend Express API. This means all the authentication and expense management endpoints in the backend are currently unused, and users cannot sync their data across devices or benefit from the secure backend implementation.

**To Reproduce**

Steps to reproduce the behavior:
1. Open the application in browser (`index.html`)
2. Add a new transaction using the form
3. Open browser DevTools → Network tab
4. Observe no API calls are made to `/api/auth` or `/api/expenses`
5. Check Application → LocalStorage
6. See that all transactions are stored in LocalStorage only

**Expected behavior**

The frontend should:
- Make API calls to `/api/auth/register` and `/api/auth/login` for user authentication
- Store JWT tokens securely
- Make API calls to `/api/expenses` endpoints (GET, POST, PUT, DELETE)
- Sync transaction data with MongoDB via the backend
- Fall back to LocalStorage only when offline (as part of PWA functionality)

**Current vs Expected Flow**

**Current (Incorrect):**
```
User → Frontend → LocalStorage
```

**Expected:**
```
User → Frontend → Backend API → MongoDB
                ↓ (offline fallback)
            LocalStorage
```

**Screenshots**

N/A - Code inspection reveals the issue in `trackerscript.js`:
- Lines 28-29: `const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));`
- Line 456-458: `updateLocalStorage()` function only saves to LocalStorage
- No fetch/axios calls to API endpoints found

**Impact**

- 🔴 **Critical**: Backend implementation is completely unused
- 🔴 **Critical**: No cross-device data synchronization
- 🔴 **Critical**: No user authentication despite backend support
- 🔴 **High**: Data loss risk when browser cache is cleared
- 🔴 **High**: LocalStorage has 5-10MB limit (insufficient for large transaction history)

**Technical Details**

**Environment:**
- Frontend: Vanilla JavaScript
- Backend: Node.js + Express + MongoDB
- Current data storage: Browser LocalStorage
- Expected data storage: MongoDB (via API)

**Files Affected:**
- `trackerscript.js` - Needs API integration
- `api-integration.js` - May need updates
- `auth-integration.js` - May need updates
- All frontend forms and data display logic

**Proposed Solution**

1. **Create API Service Layer** in frontend:
   ```javascript
   // services/api.js
   class APIService {
     constructor() {
       this.baseURL = 'http://localhost:3000/api';
       this.token = localStorage.getItem('authToken');
     }
     
     async login(email, password) { /* ... */ }
     async register(name, email, password) { /* ... */ }
     async getExpenses() { /* ... */ }
     async createExpense(expense) { /* ... */ }
     async updateExpense(id, expense) { /* ... */ }
     async deleteExpense(id) { /* ... */ }
   }
   ```

2. **Add Authentication UI**:
   - Create login/register modal or pages
   - Implement JWT token management
   - Add token refresh logic

3. **Update `trackerscript.js`**:
   - Replace LocalStorage calls with API calls
   - Add error handling for network failures
   - Keep LocalStorage as offline cache for PWA

4. **Sync Existing Data**:
   - On first login, migrate LocalStorage data to backend
   - Clear LocalStorage after successful sync

**Additional context**

This issue blocks the full functionality of the application. The backend has proper authentication, validation, and database integration already implemented, but the frontend bypasses it entirely. Fixing this is the highest priority for making ExpenseFlow production-ready.

**Related Files:**
- `server.js` - Backend entry point ✅ (working)
- `routes/auth.js` - Auth endpoints ✅ (working)
- `routes/expenses.js` - Expense CRUD ✅ (working)
- `models/User.js` - User model ✅ (working)
- `models/Expense.js` - Expense model ✅ (working)
- `middleware/auth.js` - JWT verification ✅ (working)
- `trackerscript.js` - Frontend logic ❌ (needs update)

---

## ISSUE 2: Feature Request - Multi-Currency Support

### Template Metadata
```yaml
name: Feature request
about: Suggest an idea for this project
title: '[FEATURE] Add Multi-Currency Support for International Transactions'
labels: 'enhancement, feature, priority: medium'
assignees: ''
```

### Issue Content

**Is your feature request related to a problem? Please describe.**

Users who travel internationally or have income/expenses in multiple currencies cannot accurately track their finances. Currently, ExpenseFlow only supports Indian Rupees (₹), which limits its usefulness for:
- Users who work freelance with international clients
- Travelers who make purchases in foreign currencies
- Multi-national businesses
- Users receiving income in different currencies

This leads to manual conversion errors, inaccurate balance calculations, and poor financial tracking for international transactions.

**Describe the solution you'd like**

Implement a comprehensive multi-currency support system with the following features:

### 1. **Currency Selection for Transactions**
- Add a currency dropdown to the transaction form
- Support major currencies (USD, EUR, GBP, INR, JPY, AUD, CAD, CHF, CNY, etc.)
- Display currency symbol alongside amount (e.g., $100.00, €85.50, ¥10,000)

### 2. **Real-time Exchange Rates**
- Integrate with a currency exchange rate API (e.g., [exchangerate-api.io](https://exchangerate-api.io/) or [Fixer.io](https://fixer.io/))
- Fetch and cache exchange rates daily
- Allow manual refresh of exchange rates
- Display last updated timestamp

### 3. **Base Currency Configuration**
- Allow users to set their primary/base currency in Settings
- Convert all transactions to base currency for total calculations
- Display both original and converted amounts

### 4. **Smart Display**
- Show transaction in its original currency in the transaction list
- Display totals (Balance, Income, Expense) in base currency
- Add tooltip showing converted amount when hovering over transactions
- Option to toggle between original and converted view

### 5. **Analytics with Currency Consideration**
- Charts and graphs should use base currency for accurate comparisons
- Show spending breakdown by currency
- Track exchange rate gains/losses over time

### UI/UX Mockup (Text Format)

```
┌─────────────────────────────────────────┐
│ Add New Transaction                     │
├─────────────────────────────────────────┤
│ Description: [Coffee in Paris       ]   │
│ Amount:      [4.50                 ]    │
│ Currency:    [EUR ▼] → ₹400.50          │
│              └─ Real-time conversion     │
│ Category:    [Food & Dining ▼]          │
│ Type:        [Expense ▼]                │
│ [Add Transaction]                       │
└─────────────────────────────────────────┘

Transaction Display:
┌────────────────────────────────────────┐
│ Coffee in Paris        €4.50          │
│ 🍽️ Food & Dining      ≈ ₹400.50       │
│ 21 Jan 2026                            │
└────────────────────────────────────────┘
```

**Describe alternatives you've considered**

### Alternative 1: Manual Conversion
- Users manually convert amounts before entering
- **Pros**: Simpler implementation
- **Cons**: Error-prone, time-consuming, no historical rate tracking

### Alternative 2: Single Currency with Note Field
- Add note field for original currency
- **Pros**: Minimal code change
- **Cons**: No automatic conversion, poor analytics, difficult to track actual amounts

### Alternative 3: Cryptocurrency Integration
- Support crypto alongside fiat currencies
- **Pros**: Future-proof for crypto users
- **Cons**: Higher complexity, volatile rates, smaller user base

**Chosen Approach**: Full multi-currency support (described in solution) as it provides the best user experience and accurate financial tracking.

**Implementation Plan**

### Backend Changes

1. **Update Expense Model** (`models/Expense.js`):
```javascript
{
  // ... existing fields
  currency: {
    type: String,
    default: 'INR',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', /* ... */]
  },
  exchangeRate: {
    type: Number,
    default: 1.0  // Rate at time of transaction
  },
  baseAmount: {
    type: Number,  // Amount in user's base currency
    required: true
  }
}
```

2. **Create Currency Service** (`services/currencyService.js`):
```javascript
class CurrencyService {
  async getExchangeRates(baseCurrency = 'INR') { /* ... */ }
  async convertAmount(amount, fromCurrency, toCurrency) { /* ... */ }
  async cacheRates() { /* ... */ }
}
```

3. **Add Currency Routes** (`routes/currency.js`):
- `GET /api/currency/rates` - Get current exchange rates
- `GET /api/currency/supported` - List supported currencies
- `POST /api/currency/convert` - Convert amount between currencies

4. **Update User Model** (add base currency preference):
```javascript
{
  // ... existing fields
  baseCurrency: {
    type: String,
    default: 'INR'
  }
}
```

### Frontend Changes

1. **Update Transaction Form** (`index.html`):
- Add currency dropdown
- Show real-time conversion preview
- Validate currency selection

2. **Update Display Logic** (`trackerscript.js`):
- Format amounts with appropriate currency symbols
- Show conversion tooltips
- Calculate totals in base currency

3. **Add Settings Section**:
- Base currency selector
- Exchange rate refresh button
- Currency preferences

### API Selection

**Recommended**: [exchangerate-api.io](https://www.exchangerate-api.io/)
- ✅ Free tier: 1,500 requests/month
- ✅ 161 currencies supported
- ✅ Daily updates
- ✅ No credit card required
- ✅ Simple JSON API

**Alternative**: Open Exchange Rates API or Fixer.io

**Technical Specifications**

**Supported Currencies (Initial):**
- USD - US Dollar
- EUR - Euro
- GBP - British Pound
- INR - Indian Rupee (default)
- JPY - Japanese Yen
- AUD - Australian Dollar
- CAD - Canadian Dollar
- CHF - Swiss Franc
- CNY - Chinese Yuan
- AED - UAE Dirham

**Exchange Rate Caching:**
- Cache duration: 24 hours
- Storage: MongoDB collection or Redis
- Fallback: Use last known rates if API fails

**Performance Considerations:**
- Cache API responses to minimize requests
- Batch convert transactions for analytics
- Index currency field in database

**Additional context**

This feature would make ExpenseFlow truly international and competitive with apps like Splitwise, Mint, and YNAB which all support multiple currencies. Given that freelancing and remote work are increasingly global, multi-currency support is becoming essential rather than optional.

**Benefits:**
- 🌍 Expand user base to international users
- 📊 Accurate financial tracking for travelers
- 💼 Support freelancers with international clients
- 🎯 Competitive feature parity with major expense trackers

**Estimated Implementation Time:** 2-3 weeks
**Complexity:** Medium
**User Impact:** High

**Related Issues:**
- Depends on: #[Backend-Frontend Integration Issue]
- Related to: Settings implementation
- Related to: Analytics Dashboard

---

## Notes

These issues are ready to be copied and pasted into GitHub's issue creation interface. Simply:
1. Go to your repository on GitHub
2. Click on "Issues" tab
3. Click "New Issue"
4. Select the appropriate template (Bug Report or Feature Request)
5. Copy the content from above (excluding the template metadata)
6. Fill in any additional labels or assignees
7. Submit the issue
