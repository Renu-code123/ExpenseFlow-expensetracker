const TaxProfile = require('../models/TaxProfile');
const TaxCategory = require('../models/TaxCategory');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

class TaxService {
  /**
   * Get or create tax profile for user
   */
  async getOrCreateProfile(userId, taxYear = new Date().getFullYear()) {
    let profile = await TaxProfile.findOne({ user: userId, taxYear });
    
    if (!profile) {
      const defaultBrackets = TaxProfile.getDefaultBrackets('IN', 'new');
      const defaultDeductions = TaxProfile.getDefaultDeductions('IN');
      
      profile = new TaxProfile({
        user: userId,
        taxYear,
        country: 'IN',
        regime: 'new',
        taxBrackets: defaultBrackets,
        availableDeductions: defaultDeductions
      });
      
      await profile.save();
    }
    
    return profile;
  }

  /**
   * Update tax profile
   */
  async updateProfile(userId, taxYear, updates) {
    const profile = await this.getOrCreateProfile(userId, taxYear);
    
    // If country or regime changes, update brackets and deductions
    if (updates.country && updates.country !== profile.country) {
      updates.taxBrackets = TaxProfile.getDefaultBrackets(updates.country, updates.regime || 'new');
      updates.availableDeductions = TaxProfile.getDefaultDeductions(updates.country);
    } else if (updates.regime && updates.regime !== profile.regime) {
      updates.taxBrackets = TaxProfile.getDefaultBrackets(profile.country, updates.regime);
    }
    
    Object.assign(profile, updates);
    await profile.save();
    
    return profile;
  }

  /**
   * Calculate tax liability
   */
  async calculateTax(userId, taxYear = new Date().getFullYear(), options = {}) {
    const profile = await this.getOrCreateProfile(userId, taxYear);
    
    // Get date range for tax year
    const startDate = new Date(taxYear, 3, 1); // April 1 (Indian FY)
    const endDate = new Date(taxYear + 1, 2, 31); // March 31
    
    // Get all income and expenses for the year
    const [incomeData, expenseData] = await Promise.all([
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
            _id: null,
            totalIncome: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      this.getDeductibleExpenses(userId, startDate, endDate)
    ]);
    
    const grossIncome = incomeData[0]?.totalIncome || 0;
    
    // Calculate deductions
    const deductions = this.calculateDeductions(profile, expenseData, options.customDeductions || []);
    
    // Calculate taxable income
    let taxableIncome = grossIncome - profile.standardDeduction - deductions.total;
    taxableIncome = Math.max(0, taxableIncome);
    
    // Calculate tax using brackets
    const taxCalculation = this.calculateTaxFromBrackets(taxableIncome, profile.taxBrackets);
    
    // Add surcharge and cess
    const surcharge = this.calculateSurcharge(taxCalculation.tax, taxableIncome, profile.country);
    const cess = (taxCalculation.tax + surcharge) * 0.04; // 4% Health and Education Cess
    
    const totalTax = taxCalculation.tax + surcharge + cess;
    
    // Calculate effective tax rate
    const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;
    
    // Calculate tax payable after TDS and advance tax
    const taxPayable = Math.max(0, totalTax - profile.tdsDeducted - profile.advanceTaxPaid);
    
    return {
      taxYear,
      country: profile.country,
      regime: profile.regime,
      grossIncome,
      standardDeduction: profile.standardDeduction,
      deductions: deductions.breakdown,
      totalDeductions: deductions.total + profile.standardDeduction,
      taxableIncome,
      taxCalculation: taxCalculation.breakdown,
      baseTax: taxCalculation.tax,
      surcharge,
      cess,
      totalTax,
      effectiveRate: Math.round(effectiveRate * 100) / 100,
      tdsDeducted: profile.tdsDeducted,
      advanceTaxPaid: profile.advanceTaxPaid,
      taxPayable,
      taxRefund: taxPayable < 0 ? Math.abs(taxPayable) : 0
    };
  }

  /**
   * Calculate tax from brackets
   */
  calculateTaxFromBrackets(taxableIncome, brackets) {
    let remainingIncome = taxableIncome;
    let totalTax = 0;
    const breakdown = [];
    
    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;
      
      const bracketMin = bracket.minIncome;
      const bracketMax = bracket.maxIncome || Infinity;
      
      if (taxableIncome > bracketMin) {
        const taxableInBracket = Math.min(
          remainingIncome,
          bracketMax - bracketMin + 1
        );
        
        if (taxableInBracket > 0) {
          const taxInBracket = (taxableInBracket * bracket.rate) / 100;
          totalTax += taxInBracket;
          
          breakdown.push({
            range: bracket.maxIncome 
              ? `₹${bracketMin.toLocaleString()} - ₹${bracket.maxIncome.toLocaleString()}`
              : `Above ₹${bracketMin.toLocaleString()}`,
            rate: bracket.rate,
            taxableAmount: taxableInBracket,
            tax: taxInBracket
          });
          
          remainingIncome -= taxableInBracket;
        }
      }
    }
    
    return { tax: totalTax, breakdown };
  }

  /**
   * Calculate surcharge based on income
   */
  calculateSurcharge(baseTax, taxableIncome, country) {
    if (country !== 'IN') return 0;
    
    if (taxableIncome > 50000000) return baseTax * 0.37; // 37% for > 5 Cr
    if (taxableIncome > 20000000) return baseTax * 0.25; // 25% for > 2 Cr
    if (taxableIncome > 10000000) return baseTax * 0.15; // 15% for > 1 Cr
    if (taxableIncome > 5000000) return baseTax * 0.10; // 10% for > 50L
    
    return 0;
  }

  /**
   * Get deductible expenses
   */
  async getDeductibleExpenses(userId, startDate, endDate) {
    const taxCategories = await TaxCategory.find({ 
      type: { $in: ['deductible', 'partially_deductible'] },
      isActive: true
    });
    
    const expenses = await Expense.aggregate([
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
          expenses: { $push: { description: '$description', amount: '$amount', date: '$date' } }
        }
      }
    ]);
    
    const deductibleExpenses = [];
    
    for (const expense of expenses) {
      // Find matching tax category
      const taxCategory = taxCategories.find(tc => 
        tc.categoryMappings.some(cm => cm.expenseCategory === expense._id)
      );
      
      if (taxCategory) {
        const mapping = taxCategory.categoryMappings.find(cm => cm.expenseCategory === expense._id);
        const deductibleAmount = (expense.total * (mapping?.deductiblePercentage || 0)) / 100;
        
        deductibleExpenses.push({
          category: expense._id,
          totalAmount: expense.total,
          deductibleAmount,
          deductiblePercentage: mapping?.deductiblePercentage || 0,
          taxCategory: taxCategory.name,
          section: taxCategory.section,
          count: expense.count
        });
      }
    }
    
    return deductibleExpenses;
  }

  /**
   * Calculate all deductions
   */
  calculateDeductions(profile, expenseData, customDeductions = []) {
    const breakdown = [];
    let total = 0;
    
    // Calculate deductions from expense categories
    for (const expense of expenseData) {
      if (expense.deductibleAmount > 0) {
        // Check if there's a limit for this deduction
        const deduction = profile.availableDeductions.find(d => d.code === expense.section);
        const limit = deduction?.maxLimit || Infinity;
        const actualDeduction = Math.min(expense.deductibleAmount, limit);
        
        breakdown.push({
          name: expense.taxCategory,
          section: expense.section,
          claimed: expense.deductibleAmount,
          limit: limit === Infinity ? null : limit,
          allowed: actualDeduction
        });
        
        total += actualDeduction;
      }
    }
    
    // Add custom deductions from profile
    for (const custom of profile.customDeductions || []) {
      const deduction = profile.availableDeductions.find(d => d.code === custom.section);
      const limit = deduction?.maxLimit || Infinity;
      const actualDeduction = Math.min(custom.amount, limit);
      
      breakdown.push({
        name: custom.name,
        section: custom.section,
        claimed: custom.amount,
        limit: limit === Infinity ? null : limit,
        allowed: actualDeduction
      });
      
      total += actualDeduction;
    }
    
    // Add additional custom deductions passed in options
    for (const custom of customDeductions) {
      breakdown.push({
        name: custom.name,
        section: custom.section || 'Custom',
        claimed: custom.amount,
        limit: null,
        allowed: custom.amount
      });
      
      total += custom.amount;
    }
    
    return { breakdown, total };
  }

  /**
   * Get tax-deductible expense categories for tagging
   */
  async getDeductibleCategories(country = 'IN') {
    const categories = await TaxCategory.find({ 
      country,
      type: { $in: ['deductible', 'partially_deductible'] },
      isActive: true
    }).select('code name description section maxDeductionLimit keywords categoryMappings');
    
    return categories;
  }

  /**
   * Auto-tag expense as tax-deductible
   */
  async autoTagExpense(expense) {
    const categories = await TaxCategory.find({ 
      isActive: true,
      type: { $in: ['deductible', 'partially_deductible'] }
    });
    
    const description = expense.description.toLowerCase();
    const category = expense.category;
    
    for (const taxCat of categories) {
      // Check keywords
      const keywordMatch = taxCat.keywords.some(kw => description.includes(kw));
      
      // Check category mapping
      const categoryMatch = taxCat.categoryMappings.some(cm => cm.expenseCategory === category);
      
      if (keywordMatch || categoryMatch) {
        return {
          isTaxDeductible: true,
          taxCategory: taxCat.code,
          taxCategoryName: taxCat.name,
          section: taxCat.section,
          deductiblePercentage: taxCat.categoryMappings.find(cm => cm.expenseCategory === category)?.deductiblePercentage || 100
        };
      }
    }
    
    return { isTaxDeductible: false };
  }

  /**
   * Get tax summary for dashboard
   */
  async getTaxSummary(userId, taxYear = new Date().getFullYear()) {
    const taxCalc = await this.calculateTax(userId, taxYear);
    
    return {
      taxYear,
      grossIncome: taxCalc.grossIncome,
      totalDeductions: taxCalc.totalDeductions,
      taxableIncome: taxCalc.taxableIncome,
      estimatedTax: taxCalc.totalTax,
      effectiveRate: taxCalc.effectiveRate,
      taxPaid: taxCalc.tdsDeducted + taxCalc.advanceTaxPaid,
      taxDue: taxCalc.taxPayable,
      topDeductions: taxCalc.deductions.slice(0, 5)
    };
  }

  /**
   * Compare tax between old and new regime
   */
  async compareRegimes(userId, taxYear = new Date().getFullYear()) {
    const profile = await this.getOrCreateProfile(userId, taxYear);
    const originalRegime = profile.regime;
    
    // Calculate for new regime
    profile.regime = 'new';
    profile.taxBrackets = TaxProfile.getDefaultBrackets('IN', 'new');
    const newRegimeTax = await this.calculateTax(userId, taxYear);
    
    // Calculate for old regime
    profile.regime = 'old';
    profile.taxBrackets = TaxProfile.getDefaultBrackets('IN', 'old');
    const oldRegimeTax = await this.calculateTax(userId, taxYear);
    
    // Restore original regime
    profile.regime = originalRegime;
    profile.taxBrackets = TaxProfile.getDefaultBrackets('IN', originalRegime);
    await profile.save();
    
    const savings = oldRegimeTax.totalTax - newRegimeTax.totalTax;
    
    return {
      newRegime: {
        taxableIncome: newRegimeTax.taxableIncome,
        totalTax: newRegimeTax.totalTax,
        effectiveRate: newRegimeTax.effectiveRate,
        deductions: newRegimeTax.totalDeductions
      },
      oldRegime: {
        taxableIncome: oldRegimeTax.taxableIncome,
        totalTax: oldRegimeTax.totalTax,
        effectiveRate: oldRegimeTax.effectiveRate,
        deductions: oldRegimeTax.totalDeductions
      },
      recommendation: savings > 0 ? 'new' : 'old',
      savings: Math.abs(savings),
      message: savings > 0 
        ? `New regime saves you ₹${Math.abs(savings).toLocaleString()}`
        : `Old regime saves you ₹${Math.abs(savings).toLocaleString()}`
    };
  }

  /**
   * Initialize default tax categories
   */
  async initializeDefaultCategories(country = 'IN') {
    const categories = TaxCategory.getDefaultCategories(country);
    
    for (const category of categories) {
      await TaxCategory.findOneAndUpdate(
        { code: category.code },
        category,
        { upsert: true, new: true }
      );
    }
    
    console.log(`Default tax categories initialized for ${country}`);
  }
}

module.exports = new TaxService();
