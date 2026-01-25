const PDFDocument = require('pdfkit');
const FinancialReport = require('../models/FinancialReport');

class PDFService {
  /**
   * Generate PDF from report
   */
  async generatePDF(report) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: report.title,
            Author: 'ExpenseFlow',
            Subject: 'Financial Report',
            Creator: 'ExpenseFlow Report Generator'
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate content based on report type
        this.addHeader(doc, report);
        
        switch (report.reportType) {
          case 'income_statement':
            this.addIncomeStatement(doc, report);
            break;
          case 'expense_summary':
            this.addExpenseSummary(doc, report);
            break;
          case 'profit_loss':
            this.addProfitLoss(doc, report);
            break;
          case 'tax_report':
            this.addTaxReport(doc, report);
            break;
          case 'category_breakdown':
            this.addCategoryBreakdown(doc, report);
            break;
          case 'monthly_comparison':
            this.addMonthlyComparison(doc, report);
            break;
          case 'annual_summary':
            this.addAnnualSummary(doc, report);
            break;
          default:
            this.addGenericReport(doc, report);
        }

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header to PDF
   */
  addHeader(doc, report) {
    // Logo/Brand area
    doc.fontSize(24)
       .fillColor('#2563eb')
       .text('ExpenseFlow', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Report title
    doc.fontSize(18)
       .fillColor('#1f2937')
       .text(report.title, { align: 'center' });
    
    // Date range
    const startDate = new Date(report.dateRange.startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const endDate = new Date(report.dateRange.endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.fontSize(10)
       .fillColor('#6b7280')
       .text(`Period: ${startDate} - ${endDate}`, { align: 'center' });
    
    doc.moveDown();
    this.addDivider(doc);
    doc.moveDown();
  }

  /**
   * Add footer to PDF
   */
  addFooter(doc) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(50, doc.page.height - 50)
         .lineTo(doc.page.width - 50, doc.page.height - 50)
         .stroke();
      
      // Page number
      doc.fontSize(8)
         .fillColor('#9ca3af')
         .text(
           `Page ${i + 1} of ${pages.count}`,
           50,
           doc.page.height - 35,
           { align: 'center' }
         );
      
      // Generated timestamp
      doc.text(
        `Generated on ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })} by ExpenseFlow`,
        50,
        doc.page.height - 35,
        { align: 'right' }
      );
    }
  }

  /**
   * Add income statement content
   */
  addIncomeStatement(doc, report) {
    // Summary section
    this.addSectionTitle(doc, 'Financial Summary');
    
    const summaryData = [
      ['Gross Income', this.formatCurrency(report.totalIncome, report.currency)],
      ['Total Expenses', this.formatCurrency(report.totalExpenses, report.currency)],
      ['Net Income', this.formatCurrency(report.netIncome, report.currency)],
      ['Savings Rate', `${report.savingsRate}%`]
    ];
    
    this.addTable(doc, summaryData);
    doc.moveDown();
    
    // Income breakdown
    if (report.incomeBreakdown && report.incomeBreakdown.length > 0) {
      this.addSectionTitle(doc, 'Income Breakdown');
      const incomeData = report.incomeBreakdown.map(i => [
        this.capitalize(i.category),
        this.formatCurrency(i.amount, report.currency),
        `${i.count} transactions`
      ]);
      this.addTable(doc, incomeData, ['Category', 'Amount', 'Transactions']);
      doc.moveDown();
    }
    
    // Expense breakdown
    if (report.expenseBreakdown && report.expenseBreakdown.length > 0) {
      this.addSectionTitle(doc, 'Expense Breakdown');
      const expenseData = report.expenseBreakdown.map(e => [
        this.capitalize(e.category),
        this.formatCurrency(e.amount, report.currency),
        `${e.count} transactions`
      ]);
      this.addTable(doc, expenseData, ['Category', 'Amount', 'Transactions']);
    }
  }

  /**
   * Add expense summary content
   */
  addExpenseSummary(doc, report) {
    // Summary stats
    this.addSectionTitle(doc, 'Expense Overview');
    
    const summaryData = [
      ['Total Expenses', this.formatCurrency(report.totalExpenses, report.currency)],
      ['Average Monthly', this.formatCurrency(report.averageMonthlyExpense || 0, report.currency)]
    ];
    
    this.addTable(doc, summaryData);
    doc.moveDown();
    
    // Category breakdown
    if (report.expenseBreakdown && report.expenseBreakdown.length > 0) {
      this.addSectionTitle(doc, 'Expense by Category');
      const categoryData = report.expenseBreakdown.map(e => [
        this.capitalize(e.category),
        this.formatCurrency(e.amount, report.currency),
        `${e.percentage || 0}%`,
        `${e.count} txns`
      ]);
      this.addTable(doc, categoryData, ['Category', 'Amount', '% of Total', 'Count']);
      doc.moveDown();
    }
    
    // Top expenses
    if (report.topExpenses && report.topExpenses.length > 0) {
      this.addSectionTitle(doc, 'Top 10 Expenses');
      const topData = report.topExpenses.map(e => [
        e.description.substring(0, 30),
        this.capitalize(e.category),
        this.formatCurrency(e.amount, report.currency)
      ]);
      this.addTable(doc, topData, ['Description', 'Category', 'Amount']);
    }
  }

  /**
   * Add profit/loss content
   */
  addProfitLoss(doc, report) {
    // P&L Summary
    this.addSectionTitle(doc, 'Profit & Loss Statement');
    
    doc.fontSize(12)
       .fillColor('#1f2937');
    
    // Revenue section
    doc.font('Helvetica-Bold').text('REVENUE');
    doc.font('Helvetica');
    
    if (report.incomeBreakdown) {
      for (const income of report.incomeBreakdown) {
        doc.text(`  ${this.capitalize(income.category)}`, { continued: true })
           .text(this.formatCurrency(income.amount, report.currency), { align: 'right' });
      }
    }
    
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold')
       .text('Total Revenue', { continued: true })
       .text(this.formatCurrency(report.totalIncome, report.currency), { align: 'right' });
    
    doc.moveDown();
    this.addDivider(doc);
    doc.moveDown();
    
    // Expenses section
    doc.font('Helvetica-Bold').text('EXPENSES');
    doc.font('Helvetica');
    
    if (report.summary) {
      if (report.summary.operatingExpenses > 0) {
        doc.text('  Operating Expenses', { continued: true })
           .text(this.formatCurrency(report.summary.operatingExpenses, report.currency), { align: 'right' });
      }
      if (report.summary.discretionaryExpenses > 0) {
        doc.text('  Discretionary Expenses', { continued: true })
           .text(this.formatCurrency(report.summary.discretionaryExpenses, report.currency), { align: 'right' });
      }
      if (report.summary.essentialExpenses > 0) {
        doc.text('  Essential Expenses', { continued: true })
           .text(this.formatCurrency(report.summary.essentialExpenses, report.currency), { align: 'right' });
      }
      if (report.summary.otherExpenses > 0) {
        doc.text('  Other Expenses', { continued: true })
           .text(this.formatCurrency(report.summary.otherExpenses, report.currency), { align: 'right' });
      }
    }
    
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold')
       .text('Total Expenses', { continued: true })
       .text(this.formatCurrency(report.totalExpenses, report.currency), { align: 'right' });
    
    doc.moveDown();
    this.addDivider(doc, '#2563eb', 2);
    doc.moveDown();
    
    // Net Income
    const netColor = report.netIncome >= 0 ? '#059669' : '#dc2626';
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(netColor)
       .text('NET INCOME', { continued: true })
       .text(this.formatCurrency(report.netIncome, report.currency), { align: 'right' });
    
    doc.fillColor('#1f2937');
    
    if (report.summary?.profitMargin) {
      doc.moveDown()
         .fontSize(10)
         .fillColor('#6b7280')
         .text(`Profit Margin: ${report.summary.profitMargin}%`, { align: 'right' });
    }
  }

  /**
   * Add tax report content
   */
  addTaxReport(doc, report) {
    this.addSectionTitle(doc, 'Tax Summary');
    
    if (report.taxSummary) {
      const taxData = [
        ['Gross Income', this.formatCurrency(report.taxSummary.grossIncome, report.currency)],
        ['Total Deductions', this.formatCurrency(report.taxSummary.totalDeductions, report.currency)],
        ['Taxable Income', this.formatCurrency(report.taxSummary.taxableIncome, report.currency)],
        ['Tax Liability', this.formatCurrency(report.taxSummary.taxLiability, report.currency)],
        ['Effective Tax Rate', `${report.taxSummary.effectiveRate}%`],
        ['Tax Regime', this.capitalize(report.taxSummary.regime)]
      ];
      
      this.addTable(doc, taxData);
      doc.moveDown();
    }
    
    // Tax deductions
    if (report.taxDeductions && report.taxDeductions.length > 0) {
      this.addSectionTitle(doc, 'Tax Deductions');
      const deductionData = report.taxDeductions.map(d => [
        this.capitalize(d.category),
        d.section || 'N/A',
        this.formatCurrency(d.amount, report.currency),
        this.formatCurrency(d.deductible, report.currency)
      ]);
      this.addTable(doc, deductionData, ['Category', 'Section', 'Total', 'Deductible']);
    }
    
    // Disclaimer
    doc.moveDown(2);
    doc.fontSize(8)
       .fillColor('#6b7280')
       .text('Disclaimer: This report is for informational purposes only and should not be considered as professional tax advice. Please consult a qualified tax professional for accurate tax planning and filing.', {
         align: 'justify'
       });
  }

  /**
   * Add category breakdown content
   */
  addCategoryBreakdown(doc, report) {
    // Income categories
    if (report.incomeBreakdown && report.incomeBreakdown.length > 0) {
      this.addSectionTitle(doc, 'Income by Category');
      const incomeData = report.incomeBreakdown.map(i => [
        this.capitalize(i.category),
        this.formatCurrency(i.amount, report.currency),
        `${i.percentage || 0}%`
      ]);
      this.addTable(doc, incomeData, ['Category', 'Amount', '% of Total']);
      doc.moveDown();
    }
    
    // Expense categories
    if (report.expenseBreakdown && report.expenseBreakdown.length > 0) {
      this.addSectionTitle(doc, 'Expenses by Category');
      const expenseData = report.expenseBreakdown.map(e => [
        this.capitalize(e.category),
        this.formatCurrency(e.amount, report.currency),
        `${e.percentage || 0}%`,
        `Avg: ${this.formatCurrency(e.avgAmount || 0, report.currency)}`
      ]);
      this.addTable(doc, expenseData, ['Category', 'Amount', '% of Total', 'Average']);
    }
    
    // Summary
    doc.moveDown();
    this.addDivider(doc);
    doc.moveDown();
    
    doc.font('Helvetica-Bold')
       .text('Total Income: ', { continued: true })
       .font('Helvetica')
       .text(this.formatCurrency(report.totalIncome, report.currency));
    
    doc.font('Helvetica-Bold')
       .text('Total Expenses: ', { continued: true })
       .font('Helvetica')
       .text(this.formatCurrency(report.totalExpenses, report.currency));
    
    const netColor = report.netIncome >= 0 ? '#059669' : '#dc2626';
    doc.font('Helvetica-Bold')
       .fillColor(netColor)
       .text('Net Income: ', { continued: true })
       .font('Helvetica')
       .text(this.formatCurrency(report.netIncome, report.currency));
  }

  /**
   * Add monthly comparison content
   */
  addMonthlyComparison(doc, report) {
    this.addSectionTitle(doc, 'Monthly Financial Overview');
    
    if (report.monthlyTrends && report.monthlyTrends.length > 0) {
      const monthlyData = report.monthlyTrends.map(m => [
        m.month,
        this.formatCurrency(m.income, report.currency),
        this.formatCurrency(m.expenses, report.currency),
        this.formatCurrency(m.netSavings, report.currency)
      ]);
      this.addTable(doc, monthlyData, ['Month', 'Income', 'Expenses', 'Net Savings']);
    }
    
    doc.moveDown();
    
    // Summary stats
    this.addSectionTitle(doc, 'Period Summary');
    const summaryData = [
      ['Total Income', this.formatCurrency(report.totalIncome, report.currency)],
      ['Total Expenses', this.formatCurrency(report.totalExpenses, report.currency)],
      ['Net Income', this.formatCurrency(report.netIncome, report.currency)],
      ['Avg Monthly Income', this.formatCurrency(report.averageMonthlyIncome || 0, report.currency)],
      ['Avg Monthly Expense', this.formatCurrency(report.averageMonthlyExpense || 0, report.currency)]
    ];
    this.addTable(doc, summaryData);
  }

  /**
   * Add annual summary content
   */
  addAnnualSummary(doc, report) {
    // Key metrics
    this.addSectionTitle(doc, 'Annual Financial Summary');
    
    const summaryData = [
      ['Total Income', this.formatCurrency(report.totalIncome, report.currency)],
      ['Total Expenses', this.formatCurrency(report.totalExpenses, report.currency)],
      ['Net Savings', this.formatCurrency(report.netIncome, report.currency)],
      ['Savings Rate', `${report.savingsRate}%`]
    ];
    this.addTable(doc, summaryData);
    doc.moveDown();
    
    // Monthly averages
    if (report.summary) {
      this.addSectionTitle(doc, 'Monthly Averages');
      const avgData = [
        ['Average Monthly Income', this.formatCurrency(report.summary.averageMonthlyIncome || 0, report.currency)],
        ['Average Monthly Expense', this.formatCurrency(report.summary.averageMonthlyExpense || 0, report.currency)],
        ['Highest Expense Month', `${report.summary.highestExpenseMonth || 'N/A'} (${this.formatCurrency(report.summary.highestExpenseAmount || 0, report.currency)})`],
        ['Lowest Expense Month', `${report.summary.lowestExpenseMonth || 'N/A'} (${this.formatCurrency(report.summary.lowestExpenseAmount || 0, report.currency)})`]
      ];
      this.addTable(doc, avgData);
      doc.moveDown();
    }
    
    // Category breakdown
    if (report.expenseBreakdown && report.expenseBreakdown.length > 0) {
      this.addSectionTitle(doc, 'Top Expense Categories');
      const top5 = report.expenseBreakdown.slice(0, 5);
      const categoryData = top5.map(e => [
        this.capitalize(e.category),
        this.formatCurrency(e.amount, report.currency),
        `${e.percentage || 0}%`
      ]);
      this.addTable(doc, categoryData, ['Category', 'Amount', '% of Total']);
    }
  }

  /**
   * Add generic report content
   */
  addGenericReport(doc, report) {
    doc.fontSize(12)
       .text(`Report Type: ${report.reportType}`);
    doc.moveDown();
    
    if (report.totalIncome !== undefined) {
      doc.text(`Total Income: ${this.formatCurrency(report.totalIncome, report.currency)}`);
    }
    if (report.totalExpenses !== undefined) {
      doc.text(`Total Expenses: ${this.formatCurrency(report.totalExpenses, report.currency)}`);
    }
    if (report.netIncome !== undefined) {
      doc.text(`Net Income: ${this.formatCurrency(report.netIncome, report.currency)}`);
    }
  }

  /**
   * Helper: Add section title
   */
  addSectionTitle(doc, title) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text(title);
    doc.moveDown(0.5);
    doc.font('Helvetica');
  }

  /**
   * Helper: Add divider line
   */
  addDivider(doc, color = '#e5e7eb', width = 1) {
    doc.strokeColor(color)
       .lineWidth(width)
       .moveTo(50, doc.y)
       .lineTo(doc.page.width - 50, doc.y)
       .stroke();
  }

  /**
   * Helper: Add table
   */
  addTable(doc, rows, headers = null) {
    const startX = 50;
    const colWidth = (doc.page.width - 100) / (headers ? headers.length : rows[0]?.length || 2);
    let y = doc.y;
    
    // Headers
    if (headers) {
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor('#4b5563');
      
      headers.forEach((header, i) => {
        doc.text(header, startX + (i * colWidth), y, {
          width: colWidth,
          align: i === 0 ? 'left' : 'right'
        });
      });
      
      y = doc.y + 5;
      doc.strokeColor('#e5e7eb')
         .lineWidth(0.5)
         .moveTo(startX, y)
         .lineTo(doc.page.width - 50, y)
         .stroke();
      y += 10;
    }
    
    // Rows
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#1f2937');
    
    for (const row of rows) {
      const rowY = y;
      row.forEach((cell, i) => {
        doc.text(String(cell), startX + (i * colWidth), rowY, {
          width: colWidth,
          align: i === 0 ? 'left' : 'right'
        });
      });
      y = doc.y + 5;
      
      // Check for page break
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }
    }
    
    doc.y = y;
  }

  /**
   * Helper: Format currency
   */
  formatCurrency(amount, currency = 'INR') {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || currency;
    const formatted = Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  }

  /**
   * Helper: Capitalize string
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Generate PDF for report ID
   */
  async generatePDFForReport(reportId, userId) {
    const report = await FinancialReport.findOne({
      _id: reportId,
      user: userId,
      status: 'ready'
    });

    if (!report) {
      throw new Error('Report not found or not ready');
    }

    return this.generatePDF(report);
  }
}

module.exports = new PDFService();
