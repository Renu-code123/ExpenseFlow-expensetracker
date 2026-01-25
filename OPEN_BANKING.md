# Open Banking Integration & Automatic Transaction Import

## Overview

This feature implements secure bank account connectivity using Open Banking APIs (Plaid/Yodlee/TrueLayer) to automatically import transactions, sync balances, and provide a unified view of all financial accounts.

## Features

### 1. Bank Connection Management
- **Plaid Link Integration**: Secure bank authentication using Plaid Link
- **Multiple Provider Support**: Support for Plaid, Yodlee, and TrueLayer
- **Connection Health Monitoring**: Automatic health checks and error detection
- **Re-authentication Flows**: Seamless re-auth when connections expire

### 2. Account Types Supported
- Checking accounts
- Savings accounts
- Credit cards
- Loans
- Investment accounts
- Mortgage accounts
- Brokerage accounts

### 3. Transaction Import
- **Automatic Sync**: Scheduled imports (realtime/daily/weekly)
- **Deduplication**: Intelligent duplicate detection using transaction hashes
- **Transaction Enrichment**: Clean merchant names, logos, and locations
- **Auto-categorization**: AI-powered category assignment

### 4. Transaction Matching
- **Intelligent Matching**: Match imported transactions with manual entries
- **Confidence Scoring**: Automatic matching based on amount, date, and merchant
- **Bulk Operations**: Approve, reject, or categorize multiple transactions

### 5. Reconciliation
- **Account Reconciliation**: Verify balances and track discrepancies
- **Pending Review**: Flag transactions requiring user attention
- **Balance History**: Track balance changes over time

## API Endpoints

### Connection Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/banking/link/token` | Create link token for connection |
| POST | `/api/banking/link/exchange` | Exchange public token for access |
| GET | `/api/banking/connections` | Get all user connections |
| GET | `/api/banking/connections/:id` | Get connection details |
| PUT | `/api/banking/connections/:id/sync-config` | Update sync settings |
| POST | `/api/banking/connections/:id/sync` | Trigger manual sync |
| POST | `/api/banking/connections/:id/reauth` | Initiate re-auth |
| DELETE | `/api/banking/connections/:id` | Disconnect bank |

### Account Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/banking/accounts` | Get all linked accounts |
| GET | `/api/banking/accounts/summary` | Get dashboard summary |
| GET | `/api/banking/accounts/:id` | Get account details |
| PUT | `/api/banking/accounts/:id/preferences` | Update account preferences |
| GET | `/api/banking/accounts/:id/balance-history` | Get balance history |
| GET | `/api/banking/accounts/:id/reconciliation` | Get reconciliation status |
| POST | `/api/banking/accounts/:id/reconcile` | Mark account reconciled |

### Transaction Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/banking/transactions` | Get imported transactions |
| GET | `/api/banking/transactions/pending` | Get pending review |
| GET | `/api/banking/transactions/unmatched` | Get unmatched transactions |
| GET | `/api/banking/transactions/:id` | Get transaction details |
| POST | `/api/banking/transactions/review` | Bulk approve/reject |
| POST | `/api/banking/transactions/:id/match` | Match with expense |
| DELETE | `/api/banking/transactions/:id/match` | Unmatch transaction |
| POST | `/api/banking/transactions/convert` | Convert to expenses |
| POST | `/api/banking/transactions/categorize` | Bulk categorize |

### Institutions & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/banking/institutions/search` | Search institutions |
| GET | `/api/banking/stats` | Get import statistics |
| GET | `/api/banking/reports/summary` | Get import summary |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/banking/webhook/:provider` | Handle provider webhooks |

## Data Models

### BankConnection
Stores the connection to a bank institution including encrypted access tokens, institution details, sync configuration, and health monitoring.

### LinkedAccount
Represents individual bank accounts (checking, savings, credit, etc.) with balance tracking, preferences, and sync status.

### ImportedTransaction
Stores imported transactions with merchant enrichment, categorization, matching status, and review workflow.

## Security Features

### Credential Encryption
- Access tokens encrypted using AES-256-CBC
- Encryption keys stored in environment variables
- Tokens never exposed in API responses

### Audit Logging
- All connection events logged
- User actions tracked for compliance
- Connection health history maintained

### Webhook Verification
- Signature verification for provider webhooks
- IP validation for webhook endpoints
- Rate limiting on webhook processing

## Configuration

### Environment Variables
```env
# Plaid Configuration
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox|development|production
PLAID_WEBHOOK_SECRET=your_webhook_secret

# Encryption
BANK_ENCRYPTION_KEY=32_character_key

# Yodlee (optional)
YODLEE_CLIENT_ID=your_client_id
YODLEE_SECRET=your_secret

# TrueLayer (optional)
TRUELAYER_CLIENT_ID=your_client_id
TRUELAYER_SECRET=your_secret
```

## Scheduled Jobs

| Schedule | Job | Description |
|----------|-----|-------------|
| Every 15 min | Realtime Sync | Sync connections with realtime preference |
| Every 4 hours | Daily Sync | Sync connections with daily preference |
| Monday 6 AM | Weekly Sync | Sync connections with weekly preference |
| Daily 7 AM | Health Check | Check and alert on unhealthy connections |

## Usage Examples

### Connect a Bank
```javascript
// 1. Get link token
const { linkToken } = await fetch('/api/banking/link/token', {
  method: 'POST',
  body: JSON.stringify({ provider: 'plaid' })
});

// 2. Open Plaid Link
const handler = Plaid.create({
  token: linkToken,
  onSuccess: async (publicToken, metadata) => {
    // 3. Exchange token
    await fetch('/api/banking/link/exchange', {
      method: 'POST',
      body: JSON.stringify({ publicToken, metadata })
    });
  }
});
handler.open();
```

### Get Account Summary
```javascript
const response = await fetch('/api/banking/accounts/summary');
const { netWorth, totalAssets, totalLiabilities, byType } = await response.json();
```

### Review Transactions
```javascript
// Approve multiple transactions
await fetch('/api/banking/transactions/review', {
  method: 'POST',
  body: JSON.stringify({
    transactionIds: ['id1', 'id2', 'id3'],
    status: 'approved',
    notes: 'Verified batch'
  })
});
```

### Convert to Expenses
```javascript
// Convert imported transactions to expense entries
await fetch('/api/banking/transactions/convert', {
  method: 'POST',
  body: JSON.stringify({
    transactionIds: ['id1', 'id2'],
    defaultCategory: 'categoryId'
  })
});
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional details"
}
```

Common error codes:
- `400`: Validation error
- `401`: Unauthorized
- `404`: Resource not found
- `500`: Server error

## Related Issues
- Issue #247: Open Banking Integration & Automatic Transaction Import
