const mongoose = require('mongoose');
const TaxProfile = require('../models/TaxProfile');
const TaxCategory = require('../models/TaxCategory');
const Deduction = require('../models/Deduction');
const TaxEstimate = require('../models/TaxEstimate');
const Expense = require('../models/Expense');
const notificationService = require('./notificationService');

/**
 * Tax Optimization Engine Service
 * Provides tax calculations, deduction tracking, and optimization recommendations
 */
class TaxService {

  // ==================== TAX PROFILE MANAGEMENT ====================

  /**
   * Create or update tax profile
   */
  async createOrUpdateProfile(userId, profileData) {
    let profile = await TaxProfile.findOne({ user: userId });
    
    if (profile) {
      Object.assign(profile, profileData);
    } else {
      profile = new TaxProfile({
        user: userId,
        ...profileData
      });
      
      // Initialize default tax categories if needed
      await this.initializeDefaultCategories();
    }
    
    // Calculate tax bracket based on estimated income
    if (profile.estimatedAnnualIncome) {
      profile.estimatedTaxBracket = profile.calculateTaxBracket(profile.estimatedAnnualIncome);
    }
    
    await profile.save();
    return profile;
  }

  /**
   * Get user's tax profile
   */
  async getProfile(userId) {
    const profile = await TaxProfile.findOne({ user: userId });
    if (!profile) {
      throw new Error('Tax profile not found. Please set up your tax profile first.');
    }
    return profile;
  }

  /**
   * Initialize default tax categories
   */
  async initializeDefaultCategories() {
    const existingCount = await TaxCategory.countDocuments({ isSystem: true });
    if (existingCount > 0) return;
    
    const defaults = TaxCategory.getDefaultCategories();
    await TaxCategory.insertMany(defaults.map(cat => ({ ...cat, isSystem: true })));
  }

  // ==================== DEDUCTION MANAGEMENT ====================

  /**
   * Create a new deduction
   */
  async createDeduction(userId, deductionData) {
    const profile = await this.getProfile(userId);
    
    // Validate tax category
    const category = await TaxCategory.findById(deductionData.taxCategory);
    if (!category) {
      throw new Error('Invalid tax category');
    }
    
    // Check eligibility
    if (category.eligibility.requiresSelfEmployment && 
        !['self_employed', 'freelancer', 'business_owner'].includes(profile.employmentType)) {
      throw new Error('This deduction category requires self-employment status');
    }
    
    const deduction = new Deduction({
      user: userId,
      taxYear: deductionData.taxYear || new Date().getFullYear(),
      ...deductionData,
      formMapping: {
        form: category.formReferences[0]?.form,
        line: category.formReferences[0]?.line
      }
    });
    
    // Add audit entry
    deduction.addAuditEntry('created', null, deductionData, 'user', 'Initial creation');
    
    await deduction.save();
    
    // Check for documentation requirements
    if (category.documentation.receiptRequired && 
        deduction.amount >= category.documentation.minimumAmountForReceipt &&
        !deduction.documentation.hasReceipt) {
      deduction.flag('missing_receipt', `Receipt required for deductions over $${category.documentation.minimumAmountForReceipt}`);
      await deduction.save();
    }
    
    return deduction;
  }

  /**
   * Create deduction from existing expense
   */
  async createDeductionFromExpense(userId, expenseId, taxCategoryId, options = {}) {
    const expense = await Expense.findOne({ _id: expenseId, user: userId });
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    // Check if deduction already exists for this expense
    const existing = await Deduction.findOne({ expense: expenseId, isDeleted: false });
    if (existing) {
      throw new Error('Deduction already exists for this expense');
    }
    
    const category = await TaxCategory.findById(taxCategoryId);
    if (!category) {
      throw new Error('Invalid tax category');
    }
    
    const deduction = await this.createDeduction(userId, {
      taxCategory: taxCategoryId,
      expense: expenseId,
      description: expense.description,
      merchant: expense.merchant,
      amount: expense.amount,
      currency: expense.currency || 'USD',
      date: expense.date,
      deductiblePercentage: options.deductiblePercentage || 100,
      businessPurpose: options.businessPurpose,
      documentation: {
        hasReceipt: expense.receipt ? true : false,
        receiptUrls: expense.receipt ? [expense.receipt] : []
      }
    });
    
    return deduction;
  }

  /**
   * AI-powered expense categorization for tax purposes
   */
  async categorizeExpenseForTax(userId, expenseId) {
    const expense = await Expense.findOne({ _id: expenseId, user: userId });
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    const profile = await this.getProfile(userId);
    const match = await TaxCategory.findMatchingCategory(expense, profile.jurisdiction);
    
    if (match && match.confidence >= 0.5) {
      return {
        expense,
        suggestedCategory: match.category,
        confidence: match.confidence,
        isDeductible: true,
        recommendation: `This expense may be deductible as "${match.category.name}" (${Math.round(match.confidence * 100)}% confidence)`
      };
    }
    
    return {
      expense,
      suggestedCategory: null,
      confidence: 0,
      isDeductible: false,
      recommendation: 'This expense does not appear to be tax-deductible'
    };
  }

  /**
   * Bulk categorize expenses for tax
   */
  async bulkCategorizeExpenses(userId, options = {}) {
    const { startDate, endDate, minAmount = 0 } = options;
    const profile = await this.getProfile(userId);
    
    const query = {
      user: userId,
      type: 'expense'
    };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (minAmount > 0) {
      query.amount = { $gte: minAmount };
    }
    
    const expenses = await Expense.find(query).sort({ date: -1 }).limit(500);
    
    const results = {
      deductible: [],
      nonDeductible: [],
      alreadyTracked: []
    };
    
    for (const expense of expenses) {
      // Check if already tracked
      const existing = await Deduction.findOne({ expense: expense._id, isDeleted: false });
      if (existing) {
        results.alreadyTracked.push({ expense, deduction: existing });
        continue;
      }
      
      const match = await TaxCategory.findMatchingCategory(expense, profile.jurisdiction);
      
      if (match && match.confidence >= 0.5) {
        results.deductible.push({
          expense,
          suggestedCategory: match.category,
          confidence: match.confidence
        });
      } else {
        results.nonDeductible.push({ expense });
      }
    }
    
    return results;
  }

  /**
   * Get deductions summary
   */
  async getDeductionsSummary(userId, taxYear) {
    const year = taxYear || new Date().getFullYear();
    
    const [byCategory, byQuarter, missingDocs, totals] = await Promise.all([
      Deduction.getSummaryByCategory(userId, year),
      Deduction.getQuarterlyTotals(userId, year),
      Deduction.findMissingDocumentation(userId, year),
      Deduction.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            taxYear: year,
            isDeleted: false
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalDeductible: { $sum: '$deductibleAmount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    const profile = await this.getProfile(userId);
    const standardDeduction = TaxProfile.getStandardDeduction(
      profile.jurisdiction, 
      profile.filingStatus, 
      year
    );
    
    const total = totals[0] || { totalAmount: 0, totalDeductible: 0, count: 0 };
    
    return {
      taxYear: year,
      byCategory,
      byQuarter,
      totals: {
        ...total,
        standardDeduction,
        shouldItemize: total.totalDeductible > standardDeduction,
        itemizeBenefit: total.totalDeductible - standardDeduction
      },
      missingDocumentation: {
        count: missingDocs.length,
        totalAmount: missingDocs.reduce((sum, d) => sum + d.amount, 0),
        items: missingDocs.slice(0, 10)
      }
    };
  }

  // ==================== TAX ESTIMATION ====================

  /**
   * Calculate comprehensive tax estimate
   */
  async calculateTaxEstimate(userId, options = {}) {
    const { taxYear = new Date().getFullYear(), includeOptimizations = true } = options;
    
    const profile = await this.getProfile(userId);
    const deductionSummary = await this.getDeductionsSummary(userId, taxYear);
    
    // Get income data from expenses
    const incomeData = await this.getIncomeData(userId, taxYear);
    
    // Get existing estimate or create new
    let estimate = await TaxEstimate.findOne({
      user: userId,
      taxYear,
      estimateType: 'annual'
    });
    
    if (!estimate) {
      estimate = new TaxEstimate({
        user: userId,
        taxProfile: profile._id,
        taxYear,
        estimateType: 'annual'
      });
    }
    
    // Set income
    estimate.income.wages = incomeData.wages || profile.estimatedAnnualIncome || 0;
    estimate.income.selfEmployment = incomeData.selfEmployment || 0;
    estimate.income.freelance = incomeData.freelance || 0;
    estimate.income.investment.dividends = incomeData.dividends || 0;
    estimate.income.investment.interest = incomeData.interest || 0;
    estimate.income.rental = incomeData.rental || 0;
    
    // Set adjustments
    estimate.adjustments.iraContribution = profile.retirementAccounts
      .filter(a => a.type === 'traditional_ira')
      .reduce((sum, a) => sum + (a.contribution || 0), 0);
    estimate.adjustments.hsaContribution = profile.hsaAccount?.contribution || 0;
    estimate.adjustments.sepIraContribution = profile.retirementAccounts
      .filter(a => a.type === 'sep_ira')
      .reduce((sum, a) => sum + (a.contribution || 0), 0);
    
    // Calculate self-employment tax if applicable
    const seIncome = estimate.income.selfEmployment + estimate.income.freelance;
    if (seIncome > 0) {
      estimate.taxCalculation.selfEmploymentTax = estimate.calculateSelfEmploymentTax(seIncome);
      estimate.adjustments.selfEmploymentTax = estimate.taxCalculation.selfEmploymentTax;
    }
    
    // Set standard deduction
    estimate.deductions.standardDeduction = TaxProfile.getStandardDeduction(
      profile.jurisdiction,
      profile.filingStatus,
      taxYear
    );
    
    // Set itemized deductions from tracked deductions
    for (const category of deductionSummary.byCategory) {
      switch (category.categoryCode) {
        case 'HEALTH_MEDICAL':
          estimate.deductions.itemizedDeductions.medicalDental = category.totalDeductible;
          break;
        case 'SALT_INCOME':
        case 'PROP_TAX':
          estimate.deductions.itemizedDeductions.stateLocalTaxes += category.totalDeductible;
          break;
        case 'PROP_MORTGAGE':
          estimate.deductions.itemizedDeductions.mortgageInterest = category.totalDeductible;
          break;
        case 'CHAR_DONATION':
          estimate.deductions.itemizedDeductions.charitableContributions = category.totalDeductible;
          break;
      }
      
      // Business deductions
      if (category.categoryCode?.startsWith('BUS_') || category.categoryCode === 'HOME_OFFICE') {
        estimate.deductions.businessDeductions.other += category.totalDeductible;
      }
    }
    
    // Apply SALT cap ($10,000)
    if (estimate.deductions.itemizedDeductions.stateLocalTaxes > 10000) {
      estimate.deductions.itemizedDeductions.stateLocalTaxes = 10000;
    }
    
    // Calculate federal income tax
    estimate.taxCalculation.federalIncomeTax = estimate.calculateFederalTax(
      estimate.taxableIncome,
      profile.filingStatus
    );
    
    // Calculate state tax (simplified - 5% average)
    if (profile.state && profile.state !== 'FL' && profile.state !== 'TX' && 
        profile.state !== 'WA' && profile.state !== 'NV') {
      estimate.taxCalculation.stateIncomeTax = estimate.taxableIncome * 0.05;
    }
    
    // Calculate credits
    estimate.credits.childTaxCredit = profile.dependents
      .filter(d => d.qualifiesForChildTaxCredit)
      .length * 2000;
    
    // Generate optimizations
    if (includeOptimizations) {
      estimate.optimizations = await this.generateOptimizations(userId, estimate, profile);
    }
    
    // Calculate data completeness
    estimate.dataCompleteness = this.calculateDataCompleteness(estimate, profile);
    
    await estimate.save();
    
    return estimate;
  }

  /**
   * Get income data from tracked transactions
   */
  async getIncomeData(userId, taxYear) {
    const startOfYear = new Date(taxYear, 0, 1);
    const endOfYear = new Date(taxYear, 11, 31);
    
    const income = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'income',
          date: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const result = {};
    income.forEach(i => {
      switch (i._id) {
        case 'salary':
        case 'wages':
          result.wages = (result.wages || 0) + i.total;
          break;
        case 'freelance':
          result.freelance = i.total;
          break;
        case 'business':
          result.selfEmployment = i.total;
          break;
        case 'investment':
        case 'dividends':
          result.dividends = i.total;
          break;
        case 'interest':
          result.interest = i.total;
          break;
        case 'rental':
          result.rental = i.total;
          break;
      }
    });
    
    return result;
  }

  /**
   * Calculate quarterly estimated tax payment
   */
  async calculateQuarterlyEstimate(userId, quarter, taxYear) {
    const estimate = await this.calculateTaxEstimate(userId, { taxYear });
    
    // Safe harbor: Pay 100% of prior year's tax (or 110% if high income)
    const priorYearEstimate = await TaxEstimate.getLatestEstimate(userId, taxYear - 1);
    const safeHarborPrior = priorYearEstimate?.finalTax.totalTax || 0;
    
    // Calculate annualized income through current quarter
    const quarterMultiplier = { 1: 4, 2: 2, 3: 1.33, 4: 1 }[quarter];
    const annualizedTax = estimate.finalTax.totalTax;
    
    // Recommended payment is higher of current year pro-rata or safe harbor
    const currentYearPayment = annualizedTax / 4;
    const safeHarborPayment = safeHarborPrior / 4;
    const recommendedPayment = Math.max(currentYearPayment, safeHarborPayment);
    
    // Payment due dates
    const dueDates = {
      1: new Date(taxYear, 3, 15), // April 15
      2: new Date(taxYear, 5, 15), // June 15
      3: new Date(taxYear, 8, 15), // September 15
      4: new Date(taxYear + 1, 0, 15) // January 15
    };
    
    return {
      quarter,
      taxYear,
      estimatedAnnualTax: annualizedTax,
      quarterlyPayment: recommendedPayment,
      safeHarborAmount: safeHarborPayment,
      dueDate: dueDates[quarter],
      priorYearTax: safeHarborPrior,
      paidToDate: (estimate.payments.estimatedPayments[`q${quarter - 1}`] || 0) +
                  (quarter > 1 ? estimate.payments.estimatedPayments.q1 : 0) +
                  (quarter > 2 ? estimate.payments.estimatedPayments.q2 : 0) +
                  (quarter > 3 ? estimate.payments.estimatedPayments.q3 : 0),
      remainingForYear: annualizedTax - estimate.payments.totalPayments
    };
  }

  // ==================== TAX OPTIMIZATION ====================

  /**
   * Generate tax optimization recommendations
   */
  async generateOptimizations(userId, estimate, profile) {
    const optimizations = [];
    const remainingYear = 12 - new Date().getMonth();
    
    // 1. Retirement contribution opportunities
    const iraLimit = 7000; // 2024 limit
    const currentIRA = estimate.adjustments.iraContribution;
    if (currentIRA < iraLimit) {
      const potential = iraLimit - currentIRA;
      const marginalRate = estimate.finalTax.marginalRate / 100;
      optimizations.push({
        type: 'increase_retirement',
        title: 'Maximize IRA Contributions',
        description: `You can contribute $${potential.toLocaleString()} more to your Traditional IRA this year.`,
        potentialSavings: Math.round(potential * marginalRate),
        difficulty: 'easy',
        actionItems: [
          `Contribute additional $${Math.round(potential / remainingYear)} per month`,
          'Consider setting up automatic contributions',
          'Review investment options within your IRA'
        ]
      });
    }
    
    // 2. HSA optimization
    if (profile.hsaAccount?.enabled) {
      const hsaLimit = profile.hsaAccount.coverageType === 'family' ? 8300 : 4150;
      const currentHSA = estimate.adjustments.hsaContribution;
      if (currentHSA < hsaLimit) {
        const potential = hsaLimit - currentHSA;
        const marginalRate = estimate.finalTax.marginalRate / 100;
        optimizations.push({
          type: 'maximize_hsa',
          title: 'Maximize HSA Contributions',
          description: `You can contribute $${potential.toLocaleString()} more to your HSA.`,
          potentialSavings: Math.round(potential * (marginalRate + 0.0765)), // Including FICA
          difficulty: 'easy',
          actionItems: [
            'HSA contributions are triple-tax advantaged',
            'Can be invested for long-term growth',
            'No "use it or lose it" - funds carry over'
          ]
        });
      }
    }
    
    // 3. Itemization analysis
    const itemizedTotal = estimate.deductions.itemizedDeductions.total;
    const standardDed = estimate.deductions.standardDeduction;
    const difference = standardDed - itemizedTotal;
    
    if (difference > 0 && difference < 5000) {
      optimizations.push({
        type: 'bunch_deductions',
        title: 'Consider Bunching Deductions',
        description: `You're $${difference.toLocaleString()} away from itemizing. Consider bunching deductions.`,
        potentialSavings: Math.round(difference * (estimate.finalTax.marginalRate / 100)),
        difficulty: 'medium',
        actionItems: [
          'Prepay property taxes if allowed',
          'Make January mortgage payment in December',
          'Bunch two years of charitable giving into one'
        ]
      });
    }
    
    // 4. Charitable giving optimization
    if (estimate.deductions.itemizedDeductions.charitableContributions > 0) {
      optimizations.push({
        type: 'charitable_giving',
        title: 'Optimize Charitable Giving',
        description: 'Consider donating appreciated stock instead of cash.',
        potentialSavings: null,
        difficulty: 'medium',
        actionItems: [
          'Donate appreciated securities to avoid capital gains',
          'Consider a Donor Advised Fund for larger gifts',
          'Keep detailed records of all donations'
        ]
      });
    }
    
    // 5. Business expense tracking
    if (['self_employed', 'freelancer', 'business_owner'].includes(profile.employmentType)) {
      const businessDeductions = estimate.deductions.businessDeductions.total;
      const seIncome = estimate.income.selfEmployment + estimate.income.freelance;
      
      if (seIncome > 0 && businessDeductions / seIncome < 0.2) {
        optimizations.push({
          type: 'business_expense',
          title: 'Review Business Expenses',
          description: 'Your business deductions seem low. Ensure you\'re tracking all eligible expenses.',
          potentialSavings: Math.round(seIncome * 0.1 * (estimate.finalTax.marginalRate / 100 + 0.153)),
          difficulty: 'easy',
          actionItems: [
            'Review all software subscriptions',
            'Track professional development costs',
            'Document all business travel expenses'
          ]
        });
      }
      
      // Home office suggestion
      if (!profile.businessInfo?.homeOffice?.enabled) {
        optimizations.push({
          type: 'home_office',
          title: 'Claim Home Office Deduction',
          description: 'If you work from home, you may qualify for the home office deduction.',
          potentialSavings: 1500, // Simplified method max
          difficulty: 'easy',
          actionItems: [
            'Measure dedicated workspace square footage',
            'Simplified method: $5/sq ft up to 300 sq ft',
            'Keep records of home expenses for regular method'
          ]
        });
      }
    }
    
    // 6. Mileage tracking
    if (profile.vehicleTracking?.enabled === false && 
        ['self_employed', 'freelancer'].includes(profile.employmentType)) {
      optimizations.push({
        type: 'mileage_tracking',
        title: 'Track Business Mileage',
        description: 'Business mileage can be deducted at $0.67/mile for 2024.',
        potentialSavings: 3000, // Estimate for moderate driving
        difficulty: 'easy',
        actionItems: [
          'Use a mileage tracking app',
          'Log trips for client meetings, errands',
          'Keep a mileage log with dates and purposes'
        ]
      });
    }
    
    return optimizations.sort((a, b) => (b.potentialSavings || 0) - (a.potentialSavings || 0));
  }

  // ==================== TAX REPORTS ====================

  /**
   * Generate tax report for export
   */
  async generateTaxReport(userId, taxYear, format = 'summary') {
    const [estimate, deductions, profile] = await Promise.all([
      this.calculateTaxEstimate(userId, { taxYear }),
      Deduction.find({ user: userId, taxYear, isDeleted: false }).populate('taxCategory'),
      this.getProfile(userId)
    ]);
    
    if (format === 'summary') {
      return {
        profile: {
          jurisdiction: profile.jurisdiction,
          filingStatus: profile.filingStatus,
          taxYear
        },
        income: estimate.income,
        adjustments: estimate.adjustments,
        agi: estimate.agi,
        deductions: {
          type: estimate.deductions.type,
          amount: estimate.deductions.totalDeductions
        },
        taxableIncome: estimate.taxableIncome,
        taxCalculation: estimate.taxCalculation,
        credits: estimate.credits,
        finalTax: estimate.finalTax,
        payments: estimate.payments,
        balance: estimate.balance,
        generatedAt: new Date()
      };
    }
    
    if (format === 'scheduleC') {
      const businessDeductions = await Deduction.getFormData(userId, taxYear, 'Schedule C');
      return {
        taxYear,
        form: 'Schedule C',
        grossIncome: estimate.income.selfEmployment + estimate.income.freelance,
        deductions: businessDeductions,
        totalDeductions: estimate.deductions.businessDeductions.total,
        netProfit: (estimate.income.selfEmployment + estimate.income.freelance) - 
                   estimate.deductions.businessDeductions.total
      };
    }
    
    if (format === 'detailed') {
      return {
        profile,
        estimate,
        deductions: deductions.map(d => ({
          date: d.date,
          description: d.description,
          category: d.taxCategory?.name,
          amount: d.amount,
          deductibleAmount: d.deductibleAmount,
          hasReceipt: d.documentation.hasReceipt
        })),
        summary: await this.getDeductionsSummary(userId, taxYear)
      };
    }
    
    return { error: 'Invalid format' };
  }

  /**
   * Export deductions for tax software (CSV format data)
   */
  async exportForTaxSoftware(userId, taxYear, software = 'generic') {
    const deductions = await Deduction.find({ 
      user: userId, 
      taxYear, 
      isDeleted: false 
    }).populate('taxCategory').sort({ date: 1 });
    
    const rows = deductions.map(d => ({
      date: d.date.toISOString().split('T')[0],
      category: d.taxCategory?.name || 'Uncategorized',
      description: d.description,
      merchant: d.merchant || '',
      amount: d.amount,
      deductibleAmount: d.deductibleAmount,
      form: d.formMapping?.form || '',
      line: d.formMapping?.line || '',
      hasReceipt: d.documentation.hasReceipt ? 'Yes' : 'No'
    }));
    
    // Format for specific software
    if (software === 'turbotax') {
      return {
        format: 'TurboTax',
        columns: ['Date', 'Category', 'Description', 'Amount', 'Receipt'],
        data: rows.map(r => [r.date, r.category, r.description, r.deductibleAmount, r.hasReceipt])
      };
    }
    
    return {
      format: 'Generic CSV',
      columns: Object.keys(rows[0] || {}),
      data: rows
    };
  }

  // ==================== UTILITIES ====================

  /**
   * Calculate data completeness percentage
   */
  calculateDataCompleteness(estimate, profile) {
    let score = 0;
    const checks = [
      estimate.income.total > 0,
      profile.filingStatus !== undefined,
      profile.jurisdiction !== undefined,
      estimate.deductions.totalDeductions > 0,
      profile.dependents?.length >= 0,
      estimate.payments.federalWithholding > 0 || estimate.payments.estimatedPayments.q1 > 0
    ];
    
    checks.forEach(check => { if (check) score += (100 / checks.length); });
    return Math.round(score);
  }

  /**
   * Send quarterly tax reminder
   */
  async sendQuarterlyReminder(userId, quarter) {
    const estimate = await this.calculateQuarterlyEstimate(userId, quarter, new Date().getFullYear());
    
    await notificationService.sendNotification(userId, {
      title: `Q${quarter} Estimated Tax Payment Due`,
      message: `Your estimated payment of $${estimate.quarterlyPayment.toLocaleString()} is due ${estimate.dueDate.toLocaleDateString()}.`,
      type: 'tax_reminder',
      priority: 'high',
      data: { quarter, amount: estimate.quarterlyPayment, dueDate: estimate.dueDate }
    });
  }

  /**
   * Get year-end checklist
   */
  async getYearEndChecklist(userId) {
    const taxYear = new Date().getFullYear();
    const profile = await this.getProfile(userId);
    const summary = await this.getDeductionsSummary(userId, taxYear);
    
    const checklist = [
      {
        item: 'Maximize retirement contributions',
        completed: false,
        deadline: new Date(taxYear, 11, 31),
        details: 'IRA contributions due by April 15, 401k by Dec 31'
      },
      {
        item: 'Review and categorize all expenses',
        completed: summary.byCategory.length > 0,
        deadline: new Date(taxYear, 11, 31)
      },
      {
        item: 'Gather missing receipts',
        completed: summary.missingDocumentation.count === 0,
        deadline: new Date(taxYear, 11, 31),
        details: `${summary.missingDocumentation.count} receipts missing`
      },
      {
        item: 'Make final charitable donations',
        completed: false,
        deadline: new Date(taxYear, 11, 31)
      },
      {
        item: 'Review medical expenses',
        completed: false,
        deadline: new Date(taxYear, 11, 31)
      },
      {
        item: 'Verify W-4 withholdings',
        completed: false,
        deadline: new Date(taxYear, 11, 15)
      }
    ];
    
    if (profile.employmentType === 'self_employed') {
      checklist.push({
        item: 'Calculate Q4 estimated payment',
        completed: false,
        deadline: new Date(taxYear + 1, 0, 15)
      });
    }
    
    return checklist;
  }
}

module.exports = new TaxService();
