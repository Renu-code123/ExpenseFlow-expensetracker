const TaxConfig = require('../models/TaxConfig');

class TaxService {
  constructor() {
    this.taxCache = new Map();
    this.init();
  }

  async init() {
    await this.loadDefaultTaxConfigs();
    console.log('Tax service initialized');
  }

  async loadDefaultTaxConfigs() {
    const defaultConfigs = [
      {
        country: 'US',
        currency: 'USD',
        taxRules: [
          { category: 'food', rate: 0, type: 'SALES_TAX', isActive: true },
          { category: 'transport', rate: 8.25, type: 'SALES_TAX', isActive: true },
          { category: 'entertainment', rate: 8.25, type: 'SALES_TAX', isActive: true },
          { category: 'utilities', rate: 0, type: 'SALES_TAX', isActive: true },
          { category: 'healthcare', rate: 0, type: 'DEDUCTIBLE', isActive: true },
          { category: 'shopping', rate: 8.25, type: 'SALES_TAX', isActive: true }
        ]
      },
      {
        country: 'GB',
        currency: 'GBP',
        taxRules: [
          { category: 'food', rate: 0, type: 'VAT', isActive: true },
          { category: 'transport', rate: 20, type: 'VAT', isActive: true },
          { category: 'entertainment', rate: 20, type: 'VAT', isActive: true },
          { category: 'utilities', rate: 5, type: 'VAT', isActive: true },
          { category: 'healthcare', rate: 0, type: 'VAT', isActive: true },
          { category: 'shopping', rate: 20, type: 'VAT', isActive: true }
        ]
      },
      {
        country: 'DE',
        currency: 'EUR',
        taxRules: [
          { category: 'food', rate: 7, type: 'VAT', isActive: true },
          { category: 'transport', rate: 19, type: 'VAT', isActive: true },
          { category: 'entertainment', rate: 19, type: 'VAT', isActive: true },
          { category: 'utilities', rate: 19, type: 'VAT', isActive: true },
          { category: 'healthcare', rate: 7, type: 'VAT', isActive: true },
          { category: 'shopping', rate: 19, type: 'VAT', isActive: true }
        ]
      },
      {
        country: 'IN',
        currency: 'INR',
        taxRules: [
          { category: 'food', rate: 5, type: 'GST', isActive: true },
          { category: 'transport', rate: 18, type: 'GST', isActive: true },
          { category: 'entertainment', rate: 28, type: 'GST', isActive: true },
          { category: 'utilities', rate: 18, type: 'GST', isActive: true },
          { category: 'healthcare', rate: 12, type: 'GST', isActive: true },
          { category: 'shopping', rate: 18, type: 'GST', isActive: true }
        ]
      },
      {
        country: 'CA',
        currency: 'CAD',
        taxRules: [
          { category: 'food', rate: 0, type: 'GST', isActive: true },
          { category: 'transport', rate: 13, type: 'GST', isActive: true },
          { category: 'entertainment', rate: 13, type: 'GST', isActive: true },
          { category: 'utilities', rate: 13, type: 'GST', isActive: true },
          { category: 'healthcare', rate: 0, type: 'GST', isActive: true },
          { category: 'shopping', rate: 13, type: 'GST', isActive: true }
        ]
      }
    ];

    for (const config of defaultConfigs) {
      await TaxConfig.findOneAndUpdate(
        { country: config.country },
        config,
        { upsert: true, new: true }
      );
    }
  }

  async calculateTax(amount, category, country, region = null) {
    try {
      const taxConfig = await this.getTaxConfig(country, region);
      if (!taxConfig) {
        return {
          originalAmount: amount,
          taxAmount: 0,
          totalAmount: amount,
          taxRate: 0,
          taxType: 'NONE',
          breakdown: []
        };
      }

      const applicableRules = taxConfig.taxRules.filter(rule => 
        rule.category === category && rule.isActive
      );

      let totalTaxAmount = 0;
      const breakdown = [];

      for (const rule of applicableRules) {
        let taxableAmount = amount;
        
        // Apply threshold if exists
        if (rule.threshold && rule.threshold.amount) {
          if (amount < rule.threshold.amount) {
            continue; // Skip this rule if below threshold
          }
        }

        const taxAmount = (taxableAmount * rule.rate) / 100;
        totalTaxAmount += taxAmount;

        breakdown.push({
          type: rule.type,
          rate: rule.rate,
          taxableAmount,
          taxAmount: parseFloat(taxAmount.toFixed(2)),
          description: this.getTaxDescription(rule.type, rule.rate)
        });
      }

      return {
        originalAmount: amount,
        taxAmount: parseFloat(totalTaxAmount.toFixed(2)),
        totalAmount: parseFloat((amount + totalTaxAmount).toFixed(2)),
        taxRate: parseFloat(((totalTaxAmount / amount) * 100).toFixed(2)),
        taxType: applicableRules[0]?.type || 'NONE',
        breakdown,
        country,
        region
      };
    } catch (error) {
      console.error('Tax calculation error:', error);
      return {
        originalAmount: amount,
        taxAmount: 0,
        totalAmount: amount,
        taxRate: 0,
        taxType: 'ERROR',
        breakdown: [],
        error: error.message
      };
    }
  }

  async getTaxConfig(country, region = null) {
    const cacheKey = `${country}_${region || 'default'}`;
    
    if (this.taxCache.has(cacheKey)) {
      return this.taxCache.get(cacheKey);
    }

    const query = { country };
    if (region) {
      query.region = region;
    }

    const config = await TaxConfig.findOne(query);
    
    if (config) {
      this.taxCache.set(cacheKey, config);
    }

    return config;
  }

  getTaxDescription(taxType, rate) {
    const descriptions = {
      'VAT': `VAT (${rate}%)`,
      'GST': `GST (${rate}%)`,
      'SALES_TAX': `Sales Tax (${rate}%)`,
      'INCOME_TAX': `Income Tax (${rate}%)`,
      'DEDUCTIBLE': `Tax Deductible`
    };

    return descriptions[taxType] || `${taxType} (${rate}%)`;
  }

  async getDeductibleExpenses(userId, country, fiscalYear) {
    const Expense = require('../models/Expense');
    
    const taxConfig = await this.getTaxConfig(country);
    if (!taxConfig) return [];

    const deductibleCategories = taxConfig.taxRules
      .filter(rule => rule.type === 'DEDUCTIBLE' && rule.isActive)
      .map(rule => rule.category);

    const startDate = new Date(fiscalYear, taxConfig.fiscalYearStart.month - 1, taxConfig.fiscalYearStart.day);
    const endDate = new Date(fiscalYear + 1, taxConfig.fiscalYearStart.month - 1, taxConfig.fiscalYearStart.day - 1);

    const deductibleExpenses = await Expense.find({
      userId,
      category: { $in: deductibleCategories },
      date: { $gte: startDate, $lte: endDate }
    });

    const totalDeductible = deductibleExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    return {
      expenses: deductibleExpenses,
      totalAmount: totalDeductible,
      categories: deductibleCategories,
      fiscalYear,
      country
    };
  }

  async generateTaxReport(userId, country, fiscalYear) {
    const Expense = require('../models/Expense');
    
    const taxConfig = await this.getTaxConfig(country);
    if (!taxConfig) {
      throw new Error(`Tax configuration not found for country: ${country}`);
    }

    const startDate = new Date(fiscalYear, taxConfig.fiscalYearStart.month - 1, taxConfig.fiscalYearStart.day);
    const endDate = new Date(fiscalYear + 1, taxConfig.fiscalYearStart.month - 1, taxConfig.fiscalYearStart.day - 1);

    const expenses = await Expense.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const categoryTotals = {};
    const taxBreakdown = {};
    let totalTaxPaid = 0;
    let totalDeductible = 0;

    for (const expense of expenses) {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }
      categoryTotals[expense.category] += expense.amount;

      const taxCalc = await this.calculateTax(expense.amount, expense.category, country);
      
      if (!taxBreakdown[expense.category]) {
        taxBreakdown[expense.category] = {
          totalAmount: 0,
          totalTax: 0,
          taxType: taxCalc.taxType,
          taxRate: taxCalc.taxRate
        };
      }

      taxBreakdown[expense.category].totalAmount += expense.amount;
      taxBreakdown[expense.category].totalTax += taxCalc.taxAmount;

      if (taxCalc.taxType === 'DEDUCTIBLE') {
        totalDeductible += expense.amount;
      } else {
        totalTaxPaid += taxCalc.taxAmount;
      }
    }

    return {
      fiscalYear,
      country,
      period: { startDate, endDate },
      summary: {
        totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
        totalTaxPaid: parseFloat(totalTaxPaid.toFixed(2)),
        totalDeductible: parseFloat(totalDeductible.toFixed(2)),
        netTaxLiability: parseFloat((totalTaxPaid - totalDeductible).toFixed(2))
      },
      categoryBreakdown: taxBreakdown,
      expenses: expenses.length,
      currency: taxConfig.currency
    };
  }

  async updateTaxConfig(country, region, taxRules) {
    const query = { country };
    if (region) query.region = region;

    const config = await TaxConfig.findOneAndUpdate(
      query,
      { $set: { taxRules } },
      { new: true, upsert: true }
    );

    // Clear cache
    const cacheKey = `${country}_${region || 'default'}`;
    this.taxCache.delete(cacheKey);

    return config;
  }

  getSupportedCountries() {
    return [
      { code: 'US', name: 'United States', currency: 'USD', taxSystem: 'Sales Tax' },
      { code: 'GB', name: 'United Kingdom', currency: 'GBP', taxSystem: 'VAT' },
      { code: 'DE', name: 'Germany', currency: 'EUR', taxSystem: 'VAT' },
      { code: 'FR', name: 'France', currency: 'EUR', taxSystem: 'VAT' },
      { code: 'IN', name: 'India', currency: 'INR', taxSystem: 'GST' },
      { code: 'CA', name: 'Canada', currency: 'CAD', taxSystem: 'GST/HST' },
      { code: 'AU', name: 'Australia', currency: 'AUD', taxSystem: 'GST' },
      { code: 'JP', name: 'Japan', currency: 'JPY', taxSystem: 'Consumption Tax' }
    ];
  }

  validateTaxRule(rule) {
    const requiredFields = ['category', 'rate', 'type'];
    const validTypes = ['VAT', 'GST', 'SALES_TAX', 'INCOME_TAX', 'DEDUCTIBLE'];

    for (const field of requiredFields) {
      if (!rule[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!validTypes.includes(rule.type)) {
      throw new Error(`Invalid tax type: ${rule.type}`);
    }

    if (rule.rate < 0 || rule.rate > 100) {
      throw new Error('Tax rate must be between 0 and 100');
    }

    return true;
  }
}

module.exports = new TaxService();