const FinancialReport = require('../models/FinancialReport');
const Expense = require('../models/Expense');
const TaxProfile = require('../models/TaxProfile');
const taxService = require('./taxService');
const mongoose = require('mongoose');

class ReportService {
  /**
   * Generate financial report
   */
  async generateReport(userId, reportType, options = {}) {
    const {
      startDate = new Date(new Date().getFullYear(), 0, 1),
      endDate = new Date(),
      currency = 'INR',
      includeForecasts = false,
      workspaceId = null
    } = options;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for existing report
    const existingReport = await FinancialReport.findOne({
      user: userId,
      reportType,
      'dateRange.startDate': start,
      'dateRange.endDate': end,
      status: { $in: ['ready', 'processing'] }
    });

    if (existingReport && existingReport.status === 'ready') {
      return existingReport;
    }

    // Create new report
    const report = new FinancialReport({
      user: userId,
      reportType,
      title: this.generateTitle(reportType, start, end),
      dateRange: { startDate: start, endDate: end },
      currency,
      workspace: workspaceId,
      status: 'processing'
    });

    await report.save();

    try {
      // Generate report data based on type
      let reportData;
      switch (reportType) {
        case 'income_statement':
          reportData = await this.generateIncomeStatement(userId, start, end);
          break;
        case 'expense_summary':
          reportData = await this.generateExpenseSummary(userId, start, end);
          break;
        case 'profit_loss':
          reportData = await this.generateProfitLoss(userId, start, end);
          break;
        case 'tax_report':
          reportData = await this.generateTaxReport(userId, start, end);
          break;
        case 'category_breakdown':
          reportData = await this.generateCategoryBreakdown(userId, start, end);
          break;
        case 'monthly_comparison':
          reportData = await this.generateMonthlyComparison(userId, start, end);
          break;
        case 'annual_summary':
          reportData = await this.generateAnnualSummary(userId, start, end);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      // Update report with data
      Object.assign(report, reportData);
      report.status = 'ready';
      report.generatedAt = new Date();
      
      await report.save();
      return report;
    } catch (error) {
      report.status = 'failed';
      report.error = error.message;
      await report.save();
      throw error;
    }
  }

  /**
   * Generate income statement
   */
  async generateIncomeStatement(userId, startDate, endDate) {
    const [income, expenses] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            type: 'income',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Expense.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            type: 'expense',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalIncome = income.reduce((sum, i) => sum + i.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.total, 0);

    return {
      incomeBreakdown: income.map(i => ({
        category: i._id || 'Other',
        amount: i.total,
        count: i.count
      })),
      expenseBreakdown: expenses.map(e => ({
        category: e._id || 'Other',
        amount: e.total,
        count: e.count
      })),
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(2) : 0,
      summary: {
        grossIncome: totalIncome,
        operatingExpenses: totalExpenses,
        netProfit: totalIncome - totalExpenses,
        profitMargin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(2) : 0
      }
    };
  }

  /**
   * Generate expense summary
   */
  async generateExpenseSummary(userId, startDate, endDate) {
    const [categoryBreakdown, monthlyTrends, topExpenses] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            type: 'expense',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        },
        { $sort: { total: -1 } }
      ]),
      Expense.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            type: 'expense',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Expense.find({
        user: userId,
        type: 'expense',
        date: { $gte: startDate, $lte: endDate }
      })
        .sort({ amount: -1 })
        .limit(10)
        .select('description amount category date')
    ]);

    const totalExpenses = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);

    return {
      expenseBreakdown: categoryBreakdown.map(c => ({
        category: c._id || 'Other',
        amount: c.total,
        count: c.count,
        avgAmount: Math.round(c.avgAmount),
        percentage: totalExpenses > 0 ? ((c.total / totalExpenses) * 100).toFixed(2) : 0
      })),
      totalExpenses,
      monthlyTrends: monthlyTrends.map(m => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        income: 0,
        expenses: m.total,
        netSavings: -m.total,
        transactionCount: m.count
      })),
      topExpenses: topExpenses.map(e => ({
        description: e.description,
        amount: e.amount,
        category: e.category,
        date: e.date
      })),
      averageMonthlyExpense: monthlyTrends.length > 0 
        ? totalExpenses / monthlyTrends.length 
        : 0
    };
  }

  /**
   * Generate profit/loss statement
   */
  async generateProfitLoss(userId, startDate, endDate) {
    const data = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            category: '$category'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const income = data.filter(d => d._id.type === 'income');
    const expenses = data.filter(d => d._id.type === 'expense');

    const totalIncome = income.reduce((sum, i) => sum + i.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.total, 0);
    const netIncome = totalIncome - totalExpenses;

    // Categorize expenses
    const operatingExpenses = expenses
      .filter(e => ['utilities', 'transport', 'food'].includes(e._id.category))
      .reduce((sum, e) => sum + e.total, 0);
    
    const discretionaryExpenses = expenses
      .filter(e => ['shopping', 'entertainment'].includes(e._id.category))
      .reduce((sum, e) => sum + e.total, 0);

    const essentialExpenses = expenses
      .filter(e => ['healthcare'].includes(e._id.category))
      .reduce((sum, e) => sum + e.total, 0);

    return {
      incomeBreakdown: income.map(i => ({
        category: i._id.category || 'Other',
        amount: i.total,
        count: i.count
      })),
      expenseBreakdown: expenses.map(e => ({
        category: e._id.category || 'Other',
        amount: e.total,
        count: e.count
      })),
      totalIncome,
      totalExpenses,
      netIncome,
      summary: {
        grossIncome: totalIncome,
        operatingExpenses,
        discretionaryExpenses,
        essentialExpenses,
        otherExpenses: totalExpenses - operatingExpenses - discretionaryExpenses - essentialExpenses,
        netProfit: netIncome,
        profitMargin: totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(2) : 0
      }
    };
  }

  /**
   * Generate tax report
   */
  async generateTaxReport(userId, startDate, endDate) {
    const taxYear = startDate.getFullYear();
    
    // Get tax calculation
    const taxCalc = await taxService.calculateTax(userId, taxYear);
    
    // Get deductible expenses
    const deductibleExpenses = await taxService.getDeductibleExpenses(userId, startDate, endDate);
    
    return {
      totalIncome: taxCalc.grossIncome,
      totalExpenses: 0, // Will be filled from expense data
      netIncome: taxCalc.taxableIncome,
      taxDeductions: deductibleExpenses.map(d => ({
        category: d.category,
        section: d.section,
        amount: d.totalAmount,
        deductible: d.deductibleAmount
      })),
      taxSummary: {
        grossIncome: taxCalc.grossIncome,
        totalDeductions: taxCalc.totalDeductions,
        taxableIncome: taxCalc.taxableIncome,
        taxLiability: taxCalc.totalTax,
        effectiveRate: taxCalc.effectiveRate,
        regime: taxCalc.regime
      }
    };
  }

  /**
   * Generate category breakdown
   */
  async generateCategoryBreakdown(userId, startDate, endDate) {
    const breakdown = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            category: '$category'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          minAmount: { $min: '$amount' },
          maxAmount: { $max: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const incomeData = breakdown.filter(b => b._id.type === 'income');
    const expenseData = breakdown.filter(b => b._id.type === 'expense');

    const totalIncome = incomeData.reduce((sum, i) => sum + i.total, 0);
    const totalExpenses = expenseData.reduce((sum, e) => sum + e.total, 0);

    return {
      incomeBreakdown: incomeData.map(i => ({
        category: i._id.category || 'Other',
        amount: i.total,
        count: i.count,
        percentage: totalIncome > 0 ? ((i.total / totalIncome) * 100).toFixed(2) : 0
      })),
      expenseBreakdown: expenseData.map(e => ({
        category: e._id.category || 'Other',
        amount: e.total,
        count: e.count,
        avgAmount: Math.round(e.avgAmount),
        minAmount: e.minAmount,
        maxAmount: e.maxAmount,
        percentage: totalExpenses > 0 ? ((e.total / totalExpenses) * 100).toFixed(2) : 0
      })),
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses
    };
  }

  /**
   * Generate monthly comparison
   */
  async generateMonthlyComparison(userId, startDate, endDate) {
    const monthlyData = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Transform into monthly trends
    const monthlyMap = new Map();
    
    for (const data of monthlyData) {
      const key = `${data._id.year}-${String(data._id.month).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: key,
          income: 0,
          expenses: 0,
          netSavings: 0,
          transactionCount: 0
        });
      }
      
      const entry = monthlyMap.get(key);
      if (data._id.type === 'income') {
        entry.income = data.total;
      } else {
        entry.expenses = data.total;
      }
      entry.transactionCount += data.count;
      entry.netSavings = entry.income - entry.expenses;
    }

    const monthlyTrends = Array.from(monthlyMap.values());
    
    const totalIncome = monthlyTrends.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = monthlyTrends.reduce((sum, m) => sum + m.expenses, 0);

    // Calculate growth rates
    for (let i = 1; i < monthlyTrends.length; i++) {
      const prev = monthlyTrends[i - 1];
      const curr = monthlyTrends[i];
      
      curr.incomeGrowth = prev.income > 0 
        ? ((curr.income - prev.income) / prev.income * 100).toFixed(2) 
        : 0;
      curr.expenseGrowth = prev.expenses > 0 
        ? ((curr.expenses - prev.expenses) / prev.expenses * 100).toFixed(2) 
        : 0;
    }

    return {
      monthlyTrends,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      averageMonthlyIncome: monthlyTrends.length > 0 ? totalIncome / monthlyTrends.length : 0,
      averageMonthlyExpense: monthlyTrends.length > 0 ? totalExpenses / monthlyTrends.length : 0
    };
  }

  /**
   * Generate annual summary
   */
  async generateAnnualSummary(userId, startDate, endDate) {
    const [incomeStatement, categoryBreakdown, monthlyComp] = await Promise.all([
      this.generateIncomeStatement(userId, startDate, endDate),
      this.generateCategoryBreakdown(userId, startDate, endDate),
      this.generateMonthlyComparison(userId, startDate, endDate)
    ]);

    // Find highest and lowest months
    const months = monthlyComp.monthlyTrends;
    const highestExpenseMonth = months.reduce((max, m) => m.expenses > max.expenses ? m : max, months[0] || { expenses: 0 });
    const lowestExpenseMonth = months.reduce((min, m) => m.expenses < min.expenses ? m : min, months[0] || { expenses: 0 });

    return {
      totalIncome: incomeStatement.totalIncome,
      totalExpenses: incomeStatement.totalExpenses,
      netIncome: incomeStatement.netIncome,
      savingsRate: incomeStatement.savingsRate,
      incomeBreakdown: incomeStatement.incomeBreakdown,
      expenseBreakdown: categoryBreakdown.expenseBreakdown,
      monthlyTrends: monthlyComp.monthlyTrends,
      summary: {
        ...incomeStatement.summary,
        averageMonthlyIncome: monthlyComp.averageMonthlyIncome,
        averageMonthlyExpense: monthlyComp.averageMonthlyExpense,
        highestExpenseMonth: highestExpenseMonth?.month,
        highestExpenseAmount: highestExpenseMonth?.expenses || 0,
        lowestExpenseMonth: lowestExpenseMonth?.month,
        lowestExpenseAmount: lowestExpenseMonth?.expenses || 0
      }
    };
  }

  /**
   * Get user's reports
   */
  async getUserReports(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      reportType,
      status = 'ready'
    } = options;

    const query = { user: userId };
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const [reports, total] = await Promise.all([
      FinancialReport.find(query)
        .sort({ generatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      FinancialReport.countDocuments(query)
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId, userId) {
    const report = await FinancialReport.findOne({
      _id: reportId,
      user: userId
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return report;
  }

  /**
   * Delete report
   */
  async deleteReport(reportId, userId) {
    const result = await FinancialReport.deleteOne({
      _id: reportId,
      user: userId
    });

    if (result.deletedCount === 0) {
      throw new Error('Report not found');
    }

    return { success: true };
  }

  /**
   * Generate report title
   */
  generateTitle(reportType, startDate, endDate) {
    const typeNames = {
      income_statement: 'Income Statement',
      expense_summary: 'Expense Summary',
      profit_loss: 'Profit & Loss Statement',
      tax_report: 'Tax Report',
      category_breakdown: 'Category Breakdown',
      monthly_comparison: 'Monthly Comparison',
      annual_summary: 'Annual Summary'
    };

    const formatDate = (date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });

    return `${typeNames[reportType] || reportType} - ${formatDate(startDate)} to ${formatDate(endDate)}`;
  }
}

module.exports = new ReportService();
