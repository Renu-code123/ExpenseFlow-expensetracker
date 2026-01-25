# Tax Calculator & Financial Report Generator

## Overview

The Tax Calculator & Financial Report Generator feature provides comprehensive tax estimation and financial reporting capabilities for ExpenseFlow users. It includes tax calculations for multiple countries (India, US), regime comparison, tax-deductible expense tracking, and PDF report generation.

## Features

### 1. Tax Calculator
- **Multi-country support**: India (Old & New Regime), US tax brackets
- **Automatic tax calculation**: Based on income and expenses
- **Deduction tracking**: Track tax-deductible expenses (80C, 80D, etc.)
- **Surcharge & Cess**: Automatic calculation for high-income earners
- **Regime comparison**: Compare old vs new tax regime to find optimal choice

### 2. Financial Reports
- **Income Statement**: Summary of income and expenses with savings rate
- **Expense Summary**: Detailed breakdown by category with trends
- **Profit & Loss Statement**: Traditional P&L format
- **Tax Report**: Tax liability with deductions breakdown
- **Category Breakdown**: In-depth category analysis
- **Monthly Comparison**: Month-over-month trends
- **Annual Summary**: Comprehensive yearly overview

### 3. PDF Export
- Professional PDF reports using PDFKit
- Branded headers with ExpenseFlow logo
- Detailed tables and breakdowns
- Download or share reports

## API Endpoints

### Tax Endpoints

#### GET /api/tax/profile
Get user's tax profile for a specific year.

Query Parameters:
- `taxYear` (optional): Tax year (default: current year)

Response:
```json
{
  "success": true,
  "data": {
    "country": "IN",
    "regime": "new",
    "taxBrackets": [...],
    "standardDeduction": 75000,
    "availableDeductions": [...]
  }
}
```

#### PUT /api/tax/profile
Update tax profile settings.

Request Body:
```json
{
  "country": "IN",
  "regime": "new",
  "tdsDeducted": 50000,
  "advanceTaxPaid": 25000,
  "customDeductions": [
    {
      "name": "PPF Investment",
      "section": "80C",
      "amount": 150000
    }
  ]
}
```

#### GET /api/tax/calculate
Calculate tax liability for a tax year.

Query Parameters:
- `taxYear` (optional): Tax year to calculate

Response:
```json
{
  "success": true,
  "data": {
    "grossIncome": 1500000,
    "standardDeduction": 75000,
    "totalDeductions": 225000,
    "taxableIncome": 1200000,
    "baseTax": 108000,
    "surcharge": 0,
    "cess": 4320,
    "totalTax": 112320,
    "effectiveRate": 7.49,
    "taxPayable": 37320
  }
}
```

#### GET /api/tax/compare-regimes
Compare old vs new tax regime.

Response:
```json
{
  "success": true,
  "data": {
    "newRegime": {
      "taxableIncome": 1200000,
      "totalTax": 112320,
      "effectiveRate": 7.49
    },
    "oldRegime": {
      "taxableIncome": 950000,
      "totalTax": 89180,
      "effectiveRate": 5.94
    },
    "recommendation": "old",
    "savings": 23140,
    "message": "Old regime saves you ₹23,140"
  }
}
```

#### GET /api/tax/summary
Get tax summary for dashboard display.

#### GET /api/tax/deductible-categories
Get list of tax-deductible expense categories.

#### POST /api/tax/auto-tag
Auto-tag an expense as tax-deductible.

Request Body:
```json
{
  "description": "Health insurance premium",
  "category": "healthcare",
  "amount": 25000
}
```

### Report Endpoints

#### POST /api/reports/generate
Generate a financial report.

Request Body:
```json
{
  "reportType": "expense_summary",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "currency": "INR"
}
```

Report Types:
- `income_statement`
- `expense_summary`
- `profit_loss`
- `tax_report`
- `category_breakdown`
- `monthly_comparison`
- `annual_summary`

#### GET /api/reports
Get list of user's reports.

Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `reportType` (optional): Filter by report type
- `status` (optional): Filter by status (ready, processing, failed)

#### GET /api/reports/:id
Get a specific report by ID.

#### GET /api/reports/:id/pdf
Download report as PDF.

#### DELETE /api/reports/:id
Delete a report.

#### POST /api/reports/quick/:type
Generate quick reports with preset date ranges.

Types:
- `this-month`
- `last-month`
- `this-quarter`
- `this-year`
- `last-year`
- `financial-year` (Indian FY: April to March)

## Tax Brackets

### India - New Regime (FY 2024-25)
| Income Slab | Rate |
|------------|------|
| ₹0 - ₹3,00,000 | 0% |
| ₹3,00,001 - ₹7,00,000 | 5% |
| ₹7,00,001 - ₹10,00,000 | 10% |
| ₹10,00,001 - ₹12,00,000 | 15% |
| ₹12,00,001 - ₹15,00,000 | 20% |
| Above ₹15,00,000 | 30% |

### India - Old Regime
| Income Slab | Rate |
|------------|------|
| ₹0 - ₹2,50,000 | 0% |
| ₹2,50,001 - ₹5,00,000 | 5% |
| ₹5,00,001 - ₹10,00,000 | 20% |
| Above ₹10,00,000 | 30% |

### Surcharge (India)
- 10% for income > ₹50 Lakhs
- 15% for income > ₹1 Crore
- 25% for income > ₹2 Crore
- 37% for income > ₹5 Crore

### Health & Education Cess
4% on total tax + surcharge

## Deduction Sections (India)

| Section | Description | Max Limit |
|---------|-------------|-----------|
| 80C | Investments (PPF, ELSS, LIC, etc.) | ₹1,50,000 |
| 80CCD(1B) | Additional NPS contribution | ₹50,000 |
| 80D | Health insurance premium | ₹25,000 - ₹1,00,000 |
| 80E | Education loan interest | No limit |
| 80G | Donations | Varies |
| 80TTA | Savings account interest | ₹10,000 |
| HRA | House Rent Allowance | As per rules |

## Data Models

### TaxProfile
Stores user's tax configuration including country, regime, brackets, and deductions.

### TaxCategory
Maps expense categories to tax-deductible sections with deduction percentages.

### FinancialReport
Stores generated reports with all breakdown data for quick retrieval.

## Usage Examples

### Calculate Tax
```javascript
// Client-side
const response = await fetch('/api/tax/calculate?taxYear=2024', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
console.log(`Tax payable: ₹${data.taxPayable}`);
```

### Generate Report
```javascript
const response = await fetch('/api/reports/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reportType: 'annual_summary',
    startDate: '2024-04-01',
    endDate: '2025-03-31'
  })
});
```

### Download PDF
```javascript
const response = await fetch(`/api/reports/${reportId}/pdf`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
// Trigger download
```

## Frontend Integration

Include the tax-reports.js script and use the TaxReportsManager class:

```html
<script src="tax-reports.js"></script>
<script>
  // Manager is auto-initialized as `taxReports`
  
  // Calculate tax
  await taxReports.calculateTax();
  
  // Compare regimes
  await taxReports.compareRegimes();
  
  // Generate report
  await taxReports.generateReport('expense_summary', '2024-01-01', '2024-12-31');
  
  // Download PDF
  await taxReports.downloadPDF(reportId);
</script>
```

## Files Created

### Models
- `models/TaxProfile.js` - Tax profile schema and default brackets
- `models/TaxCategory.js` - Tax category mappings
- `models/FinancialReport.js` - Report storage schema

### Services
- `services/taxService.js` - Tax calculation logic
- `services/reportService.js` - Report generation
- `services/pdfService.js` - PDF generation with PDFKit

### Routes
- `routes/tax.js` - Tax API endpoints
- `routes/reports.js` - Reports API endpoints

### Middleware
- `middleware/taxValidator.js` - Request validation

### Frontend
- `public/tax-reports.js` - Client-side manager
- `public/tax-reports.html` - Tax calculator UI

## Notes

1. **Tax Calculations**: This feature provides estimates only. Users should consult tax professionals for actual filing.

2. **Financial Year**: Indian financial year runs April to March. The system handles this automatically.

3. **PDF Generation**: Uses PDFKit library (already included in package.json).

4. **Currency Support**: Supports INR, USD, EUR, GBP for reports.

5. **Performance**: Reports are cached in MongoDB for quick retrieval. Regenerate for updated data.
