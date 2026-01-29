# Invoice & Payment Tracking for Freelancers

## Overview
Comprehensive invoicing and payment management system designed for freelancers and small businesses. Automates invoice generation, tracks payments, sends automated reminders, and provides detailed financial insights.

## Features
- ✅ Professional invoice generation with customizable templates
- ✅ Multi-currency support
- ✅ Automatic invoice numbering
- ✅ Client database management
- ✅ Project and service tracking
- ✅ Recurring invoice automation
- ✅ Payment status tracking
- ✅ Automated payment reminder emails
- ✅ Late payment fee calculation
- ✅ Multiple payment method support
- ✅ Invoice PDF generation and email delivery
- ✅ Payment receipt generation
- ✅ Client payment history
- ✅ Outstanding balance tracking
- ✅ Revenue forecasting
- ✅ Tax calculation per invoice
- ✅ Time tracking integration for hourly billing
- ✅ Expense linking to projects
- ✅ Partial payment recording
- ✅ Payment reconciliation

## Table of Contents
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
5. [Service Layer](#service-layer)
6. [Automated Tasks](#automated-tasks)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)

## Installation

### Prerequisites
- Node.js >= 14.0.0
- MongoDB >= 4.4
- SMTP server for email delivery

### Required Packages
```bash
npm install pdfkit nodemailer express-validator
```

### Environment Variables
Add to your `.env` file:
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

## Configuration

### Email Setup (Gmail)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail" application
3. Use this app password in `SMTP_PASS` environment variable

### PDF Storage
PDFs are stored in:
- Invoices: `uploads/invoices/`
- Receipts: `uploads/receipts/`

Ensure these directories exist or are created automatically.

## Data Models

### Client Model
Manages client information and tracks billing history.

```javascript
{
  user: ObjectId,              // Reference to User
  client_type: String,         // 'individual' | 'company'
  name: String,                // Client name
  company_name: String,
  email: String,
  phone: String,
  website: String,
  address: {
    street: String,
    city: String,
    state: String,
    postal_code: String,
    country: String
  },
  tax_id: String,
  currency: String,            // Default: 'USD'
  payment_terms: Number,       // Days, Default: 30
  total_billed: Number,
  total_paid: Number,
  outstanding_balance: Number,
  invoice_count: Number,
  last_invoice_date: Date,
  last_payment_date: Date,
  average_payment_time: Number, // Days
  billing_rate: {
    hourly_rate: Number,
    daily_rate: Number,
    project_rate: Number
  },
  late_fee: {
    enabled: Boolean,
    type: String,              // 'percentage' | 'fixed'
    amount: Number,
    days_after_due: Number
  },
  status: String,              // 'active' | 'inactive' | 'blacklisted'
  notes: String,
  tags: [String],
  contacts: [{
    name: String,
    email: String,
    phone: String,
    role: String,
    is_primary: Boolean
  }],
  preferences: {
    send_invoice_copy: Boolean,
    send_payment_reminders: Boolean,
    invoice_template: String,
    custom_fields: Mixed
  }
}
```

### Invoice Model
Tracks invoices with items, payments, and status.

```javascript
{
  user: ObjectId,
  client: ObjectId,
  invoice_number: String,      // Auto-generated, e.g., 'INV-2024-0001'
  invoice_date: Date,
  due_date: Date,
  items: [{
    description: String,
    quantity: Number,
    unit_price: Number,
    discount: Number,
    discount_type: String,     // 'percentage' | 'fixed'
    tax_rate: Number,
    amount: Number             // Calculated
  }],
  currency: String,
  subtotal: Number,
  tax_amount: Number,
  tax_rate: Number,
  discount_amount: Number,
  late_fee: Number,
  total: Number,
  amount_paid: Number,
  amount_due: Number,
  status: String,              // 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
  paid_date: Date,
  is_recurring: Boolean,
  recurring_config: {
    frequency: String,         // 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
    next_invoice_date: Date,
    end_date: Date,
    auto_send: Boolean,
    occurrences_remaining: Number,
    parent_invoice: ObjectId
  },
  project_name: String,
  project_description: String,
  time_entries: [ObjectId],
  expenses: [ObjectId],
  terms: String,
  notes: String,
  internal_notes: String,
  payment_methods_accepted: [String],
  payment_instructions: String,
  reminders_sent: [{
    date: Date,
    type: String,
    days_overdue: Number
  }],
  pdf_url: String,
  pdf_generated_at: Date,
  sent_at: Date,
  viewed_at: Date,
  template_id: String,
  custom_fields: Mixed,
  tags: [String]
}
```

### Payment Model
Records all payments made against invoices.

```javascript
{
  user: ObjectId,
  invoice: ObjectId,
  client: ObjectId,
  amount: Number,
  currency: String,
  payment_method: String,      // 'bank_transfer' | 'paypal' | 'stripe' | 'cash' | 'check' | 'credit_card' | 'debit_card' | 'other'
  transaction_id: String,
  payment_date: Date,
  payment_details: {
    bank_name: String,
    account_number: String,
    reference_number: String,
    check_number: String,
    gateway: String,
    gateway_transaction_id: String,
    gateway_fee: Number
  },
  status: String,              // 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  reconciled: Boolean,
  reconciled_date: Date,
  notes: String,
  internal_notes: String,
  receipt_number: String,      // Auto-generated, e.g., 'RCP-2024-0001'
  receipt_url: String,
  receipt_sent_at: Date,
  refund: {
    is_refunded: Boolean,
    refund_amount: Number,
    refund_date: Date,
    refund_reason: String,
    refund_transaction_id: String
  },
  attachments: [{
    filename: String,
    url: String,
    uploaded_at: Date
  }]
}
```

### TimeEntry Model
Tracks billable hours for hourly billing.

```javascript
{
  user: ObjectId,
  client: ObjectId,
  invoice: ObjectId,
  project_name: String,
  task_description: String,
  start_time: Date,
  end_time: Date,
  duration: Number,            // Minutes
  hourly_rate: Number,
  billable_amount: Number,
  is_billable: Boolean,
  is_billed: Boolean,
  billed_at: Date,
  status: String,              // 'in_progress' | 'stopped' | 'completed' | 'billed'
  tags: [String],
  category: String,
  notes: String
}
```

## API Endpoints

### Clients API

#### Get All Clients
```http
GET /api/clients
Authorization: Bearer <token>

Query Parameters:
- status: String (optional) - Filter by status
- search: String (optional) - Search by name/email
- sort: String (optional) - Sort field (default: 'name')

Response:
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

#### Get Client by ID
```http
GET /api/clients/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "client": {...},
    "recent_invoices": [...]
  }
}
```

#### Create Client
```http
POST /api/clients
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "company_name": "Acme Corp",
  "payment_terms": 30,
  "currency": "USD",
  "billing_rate": {
    "hourly_rate": 100
  }
}

Response:
{
  "success": true,
  "data": {...}
}
```

#### Update Client
```http
PUT /api/clients/:id
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "payment_terms": 45,
  "notes": "VIP client"
}

Response:
{
  "success": true,
  "data": {...}
}
```

#### Delete Client
```http
DELETE /api/clients/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Client deleted successfully"
}
```

#### Get Top Clients
```http
GET /api/clients/top?limit=10
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

#### Get Clients with Outstanding Balance
```http
GET /api/clients/outstanding
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 5,
  "data": [...]
}
```

#### Get Client Statistics
```http
GET /api/clients/:id/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total_billed": 50000,
    "total_paid": 45000,
    "outstanding_balance": 5000,
    "invoice_count": 25,
    "average_payment_time": 28,
    "invoice_breakdown": [...]
  }
}
```

### Invoices API

#### Get All Invoices
```http
GET /api/invoices
Authorization: Bearer <token>

Query Parameters:
- status: String (optional) - Filter by status (comma-separated for multiple)
- client: String (optional) - Filter by client ID
- page: Number (default: 1)
- limit: Number (default: 50)
- sort: String (default: '-invoice_date')

Response:
{
  "success": true,
  "count": 25,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "pages": 1
  }
}
```

#### Get Invoice by ID
```http
GET /api/invoices/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    ...invoice data,
    "client": {...},
    "time_entries": [...],
    "expenses": [...]
  }
}
```

#### Create Invoice
```http
POST /api/invoices
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "client": "client_id",
  "items": [
    {
      "description": "Website Development",
      "quantity": 1,
      "unit_price": 5000,
      "tax_rate": 10
    }
  ],
  "due_date": "2024-03-15",
  "notes": "Thank you for your business",
  "payment_instructions": "Bank transfer to Account #12345"
}

Response:
{
  "success": true,
  "data": {...}
}
```

#### Create Invoice from Time Entries
```http
POST /api/invoices/from-time-entries
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "client": "client_id",
  "time_entry_ids": ["entry1_id", "entry2_id"],
  "project_name": "Q1 2024 Development",
  "default_tax_rate": 10
}

Response:
{
  "success": true,
  "data": {...}
}
```

#### Update Invoice
```http
PUT /api/invoices/:id
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "notes": "Updated payment instructions",
  "due_date": "2024-03-20"
}

Response:
{
  "success": true,
  "data": {...}
}
```

#### Delete Invoice
```http
DELETE /api/invoices/:id
Authorization: Bearer <token>

Note: Only draft invoices can be deleted

Response:
{
  "success": true,
  "message": "Invoice deleted successfully"
}
```

#### Send Invoice via Email
```http
POST /api/invoices/:id/send
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Invoice sent successfully"
}
```

#### Record Payment
```http
POST /api/invoices/:id/payment
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "amount": 5000,
  "payment_method": "bank_transfer",
  "transaction_id": "TXN123456",
  "notes": "Payment received via bank transfer"
}

Response:
{
  "success": true,
  "data": {
    "invoice": {...},
    "payment": {...}
  }
}
```

#### Cancel Invoice
```http
POST /api/invoices/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "reason": "Client requested cancellation"
}

Response:
{
  "success": true,
  "data": {...}
}
```

#### Generate Invoice PDF
```http
GET /api/invoices/:id/pdf
Authorization: Bearer <token>

Response: PDF file download
```

#### Apply Late Fee
```http
POST /api/invoices/:id/apply-late-fee
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {...}
}
```

#### Get Overdue Invoices
```http
GET /api/invoices/overdue
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 5,
  "data": [...]
}
```

#### Get Upcoming Invoices
```http
GET /api/invoices/upcoming?days=7
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 3,
  "data": [...]
}
```

#### Get Invoice Statistics
```http
GET /api/invoices/stats?start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total_invoices": 50,
    "total_amount": 250000,
    "paid_amount": 220000,
    "outstanding_amount": 30000,
    "overdue_count": 5,
    "upcoming_count": 3,
    "by_status": {
      "paid": { "count": 40, "amount": 220000 },
      "overdue": { "count": 5, "amount": 20000 },
      ...
    }
  }
}
```

### Payments API

#### Get All Payments
```http
GET /api/payments
Authorization: Bearer <token>

Query Parameters:
- client: String (optional)
- invoice: String (optional)
- status: String (optional)
- payment_method: String (optional)
- start_date: String (optional)
- end_date: String (optional)
- page: Number (default: 1)
- limit: Number (default: 50)

Response:
{
  "success": true,
  "count": 20,
  "data": [...],
  "pagination": {...}
}
```

#### Get Payment by ID
```http
GET /api/payments/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {...}
}
```

#### Create Payment
```http
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "invoice": "invoice_id",
  "amount": 5000,
  "payment_method": "bank_transfer",
  "transaction_id": "TXN123456",
  "payment_date": "2024-02-15",
  "notes": "Payment received"
}

Response:
{
  "success": true,
  "data": {...}
}
```

#### Process Refund
```http
POST /api/payments/:id/refund
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "refund_amount": 500,
  "reason": "Client requested partial refund"
}

Response:
{
  "success": true,
  "data": {...}
}
```

#### Reconcile Payment
```http
POST /api/payments/:id/reconcile
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {...}
}
```

#### Bulk Reconcile Payments
```http
POST /api/payments/reconcile/bulk
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "payment_ids": ["payment1_id", "payment2_id", "payment3_id"]
}

Response:
{
  "success": true,
  "message": "3 payment(s) reconciled",
  "data": {...}
}
```

#### Get Unreconciled Payments
```http
GET /api/payments/unreconciled
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 5,
  "data": [...]
}
```

#### Get Payment Statistics
```http
GET /api/payments/stats?start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total_payments": 45,
    "total_amount": 220000,
    "unreconciled_count": 5,
    "by_method": {
      "bank_transfer": {
        "count": 30,
        "total": 150000,
        "average": 5000
      },
      ...
    }
  }
}
```

#### Get Monthly Revenue
```http
GET /api/payments/revenue/monthly?year=2024
Authorization: Bearer <token>

Response:
{
  "success": true,
  "year": 2024,
  "data": [
    { "month": 1, "total": 20000, "count": 5 },
    { "month": 2, "total": 25000, "count": 6 },
    ...
  ]
}
```

#### Get Payment Forecast
```http
GET /api/payments/forecast
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "next_7_days": 15000,
    "next_30_days": 45000,
    "next_90_days": 120000,
    "total_outstanding": 150000,
    "by_client": {
      "client_id": {
        "name": "Acme Corp",
        "outstanding": 20000,
        "invoice_count": 3
      },
      ...
    }
  }
}
```

#### Generate Receipt PDF
```http
GET /api/payments/:id/receipt
Authorization: Bearer <token>

Response: PDF file download
```

#### Get Client Payment History
```http
GET /api/payments/client/:clientId/history?page=1&limit=50
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [...],
  "summary": {
    "total_paid": 50000,
    "payment_count": 15,
    "avg_payment": 3333.33
  },
  "pagination": {...}
}
```

## Service Layer

### InvoiceService
Core business logic for invoice management.

#### Methods:
- `createInvoice(userId, invoiceData)` - Create new invoice
- `createInvoiceFromTimeEntries(userId, clientId, timeEntryIds, invoiceData)` - Generate invoice from time entries
- `createInvoiceFromExpenses(userId, clientId, expenseIds, invoiceData)` - Generate invoice from expenses
- `updateInvoice(userId, invoiceId, updateData)` - Update existing invoice
- `deleteInvoice(userId, invoiceId)` - Delete draft invoice
- `recordPayment(userId, invoiceId, paymentData)` - Record payment for invoice
- `applyLateFees(userId)` - Apply late fees to overdue invoices
- `generateRecurringInvoices()` - Generate recurring invoices
- `getInvoiceStatistics(userId, startDate, endDate)` - Get invoice stats
- `getInvoicesNeedingReminders()` - Get invoices requiring reminders
- `markReminderSent(invoiceId, daysOverdue)` - Mark reminder as sent

### PaymentService
Payment processing and tracking.

#### Methods:
- `createPayment(userId, paymentData)` - Create new payment
- `getPayment(userId, paymentId)` - Get single payment
- `getPayments(userId, filters, page, limit)` - Get all payments with filters
- `updatePayment(userId, paymentId, updateData)` - Update payment
- `processRefund(userId, paymentId, refundAmount, reason)` - Process refund
- `reconcilePayment(userId, paymentId)` - Mark payment as reconciled
- `reconcilePayments(userId, paymentIds)` - Bulk reconcile payments
- `getUnreconciledPayments(userId)` - Get unreconciled payments
- `getPaymentStatistics(userId, startDate, endDate)` - Get payment stats
- `getMonthlyRevenue(userId, year)` - Get monthly revenue breakdown
- `getClientPaymentHistory(userId, clientId, page, limit)` - Get client payment history
- `getPaymentForecast(userId)` - Get payment forecast

### PDFService
PDF generation for invoices and receipts.

#### Methods:
- `generateInvoicePDF(invoiceId, userId)` - Generate invoice PDF
- `generateReceiptPDF(paymentId, userId)` - Generate receipt PDF

### ReminderService
Automated email reminders for overdue invoices.

#### Methods:
- `sendPaymentReminder(invoiceId)` - Send single payment reminder
- `sendInvoiceEmail(invoiceId)` - Send invoice via email
- `processAllReminders()` - Process all pending reminders

## Automated Tasks

### Cron Jobs
Automated tasks run on schedule:

1. **Generate Recurring Invoices** - Daily at 6 AM
   - Generates invoices for recurring billing
   - Updates next invoice dates
   - Auto-sends if configured

2. **Send Payment Reminders** - Daily at 10 AM
   - Sends reminders at 3, 7, 14, and 30 days overdue
   - Customizes email based on overdue period
   - Respects client reminder preferences

3. **Apply Late Fees** - Daily at midnight
   - Applies late fees to overdue invoices
   - Based on client late fee configuration
   - Only applies once per invoice

## Usage Examples

### Example 1: Create Client and Invoice
```javascript
// 1. Create client
const clientResponse = await fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    company_name: 'Acme Corp',
    payment_terms: 30,
    currency: 'USD',
    billing_rate: {
      hourly_rate: 100
    },
    late_fee: {
      enabled: true,
      type: 'percentage',
      amount: 5,
      days_after_due: 7
    }
  })
});

const client = await clientResponse.json();

// 2. Create invoice
const invoiceResponse = await fetch('/api/invoices', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client: client.data._id,
    items: [
      {
        description: 'Website Development',
        quantity: 1,
        unit_price: 5000,
        tax_rate: 10
      },
      {
        description: 'Logo Design',
        quantity: 1,
        unit_price: 1000,
        tax_rate: 10
      }
    ],
    notes: 'Thank you for your business!',
    payment_instructions: 'Bank transfer to Account #12345'
  })
});

const invoice = await invoiceResponse.json();

// 3. Send invoice
await fetch(`/api/invoices/${invoice.data._id}/send`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

### Example 2: Time Tracking and Billing
```javascript
// 1. Start timer
const timeEntry = await fetch('/api/time-entries/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client: clientId,
    project_name: 'Q1 Development',
    task_description: 'Frontend development',
    hourly_rate: 100
  })
});

// 2. Stop timer after work is done
await fetch(`/api/time-entries/${timeEntry._id}/stop`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

// 3. Get unbilled time entries
const unbilledEntries = await fetch(`/api/time-entries/unbilled?client=${clientId}`, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

// 4. Create invoice from time entries
const invoice = await fetch('/api/invoices/from-time-entries', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client: clientId,
    time_entry_ids: unbilledEntries.data.map(e => e._id),
    project_name: 'Q1 Development',
    default_tax_rate: 10
  })
});
```

### Example 3: Set Up Recurring Invoice
```javascript
const invoice = await fetch('/api/invoices', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client: clientId,
    items: [
      {
        description: 'Monthly Retainer',
        quantity: 1,
        unit_price: 5000,
        tax_rate: 10
      }
    ],
    is_recurring: true,
    recurring_config: {
      frequency: 'monthly',
      next_invoice_date: '2024-03-01',
      auto_send: true,
      occurrences_remaining: 12  // 1 year
    },
    notes: 'Monthly retainer for ongoing support'
  })
});
```

### Example 4: Record Partial Payment
```javascript
// Record first partial payment
await fetch(`/api/invoices/${invoiceId}/payment`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 2500,  // Half of total
    payment_method: 'bank_transfer',
    transaction_id: 'TXN123',
    notes: 'First installment'
  })
});

// Record second partial payment
await fetch(`/api/invoices/${invoiceId}/payment`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 2500,  // Remaining balance
    payment_method: 'bank_transfer',
    transaction_id: 'TXN456',
    notes: 'Final installment'
  })
});
```

### Example 5: Payment Forecast
```javascript
const forecast = await fetch('/api/payments/forecast', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

console.log(forecast.data);
// {
//   next_7_days: 15000,
//   next_30_days: 45000,
//   next_90_days: 120000,
//   total_outstanding: 150000,
//   by_client: {...}
// }
```

## Best Practices

### Invoice Management
1. **Always set payment terms** - Define clear payment terms for each client
2. **Use templates** - Create invoice templates for consistency
3. **Track time accurately** - Use time tracking for hourly billing
4. **Send promptly** - Send invoices immediately after work completion
5. **Follow up** - Set up automated reminders for overdue payments

### Payment Tracking
1. **Record immediately** - Record payments as soon as received
2. **Reconcile regularly** - Reconcile payments with bank statements
3. **Document everything** - Include transaction IDs and notes
4. **Use proper methods** - Select accurate payment methods
5. **Generate receipts** - Send receipts for all payments

### Client Management
1. **Maintain accurate records** - Keep client information up to date
2. **Set late fees** - Configure late fees to encourage timely payment
3. **Track payment patterns** - Monitor average payment time
4. **Communication** - Document all client communications
5. **Segment clients** - Use tags to organize clients

### Financial Reporting
1. **Review regularly** - Check payment forecasts weekly
2. **Monitor cash flow** - Track outstanding balances
3. **Analyze trends** - Review payment patterns by client
4. **Export data** - Use API for custom reports
5. **Set goals** - Track revenue goals vs. actuals

### Security
1. **Protect sensitive data** - Never expose client financial information
2. **Use HTTPS** - Always use secure connections
3. **Audit trail** - Maintain logs of all financial transactions
4. **Backup regularly** - Ensure data is backed up
5. **Access control** - Restrict access to financial data

## Troubleshooting

### Common Issues

**Emails not sending:**
- Check SMTP credentials in .env file
- Verify SMTP port is not blocked by firewall
- Enable "Less secure app access" or use app password for Gmail

**PDFs not generating:**
- Ensure pdfkit is installed: `npm install pdfkit`
- Check uploads directory exists and has write permissions
- Verify font files are accessible

**Late fees not applying:**
- Ensure client has late fee enabled
- Check invoice is past due date
- Verify cron jobs are running

**Recurring invoices not generating:**
- Check recurring_config.next_invoice_date is set
- Verify cron jobs are initialized
- Check for errors in cron job logs

## Support and Contributing

For issues, questions, or contributions, please refer to the main project repository.

## License

Part of ExpenseFlow - See main project LICENSE for details.
