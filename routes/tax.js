const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const taxService = require('../services/taxService');
const TaxProfile = require('../models/TaxProfile');
const TaxCategory = require('../models/TaxCategory');
const {
  validateTaxProfile,
  validateTaxCalculation,
  validateDeductionCategory,
  validateExpenseTaxTag,
  validateRequest,
  taxSchemas
} = require('../middleware/taxValidator');

// ==================== TAX PROFILE ROUTES ====================

/**
 * @route   GET /api/tax/profile
 * @desc    Get user's tax profile for current year
 * @access  Private
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const taxYear = parseInt(req.query.taxYear) || new Date().getFullYear();
    const profile = await taxService.getOrCreateProfile(req.user.id, taxYear);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get tax profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax profile'
    });
  }
});

/**
 * @route   POST /api/tax/profile
 * @desc    Create or update tax profile
 * @access  Private
 */
router.post('/profile', auth, validateTaxProfile, async (req, res) => {
  try {
    const profile = await taxService.createOrUpdateProfile(req.user.id, req.body);
    res.status(201).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/tax/profile
 * @desc    Update tax profile
 * @access  Private
 */
router.put('/profile', auth, validateTaxProfile, async (req, res) => {
  try {
    const taxYear = parseInt(req.query.taxYear) || new Date().getFullYear();
    const profile = await taxService.updateProfile(req.user.id, taxYear, req.body);
    
    res.json({
      success: true,
      data: profile,
      message: 'Tax profile updated successfully'
    });
  } catch (error) {
    console.error('Update tax profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tax profile'
    });
  }
});

// ==================== TAX CALCULATION ROUTES ====================

/**
 * @route   GET /api/tax/calculate
 * @desc    Calculate tax liability
 * @access  Private
 */
router.get('/calculate', auth, async (req, res) => {
  try {
    const taxYear = parseInt(req.query.taxYear) || new Date().getFullYear();
    const options = {};
    
    if (req.query.customDeductions) {
      options.customDeductions = JSON.parse(req.query.customDeductions);
    }
    
    const calculation = await taxService.calculateTax(req.user.id, taxYear, options);
    
    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Tax calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate tax'
    });
  }
});

/**
 * @route   POST /api/tax/calculate
 * @desc    Calculate tax with custom deductions
 * @access  Private
 */
router.post('/calculate', auth, validateTaxCalculation, async (req, res) => {
  try {
    const { taxYear = new Date().getFullYear(), customDeductions = [] } = req.body;
    
    const calculation = await taxService.calculateTax(req.user.id, taxYear, {
      customDeductions
    });
    
    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Tax calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate tax'
    });
  }
});

/**
 * @route   GET /api/tax/estimate
 * @desc    Get current tax estimate
 * @access  Private
 */
router.get('/estimate', auth, async (req, res) => {
  try {
    const { taxYear } = req.query;
    const estimate = await taxService.calculateTaxEstimate(req.user.id, {
      taxYear: taxYear ? parseInt(taxYear) : undefined
    });
    res.json({
      success: true,
      data: estimate
    });
  } catch (error) {
    console.error('Get estimate error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/tax/quarterly
 * @desc    Get quarterly estimated tax payment info
 * @access  Private
 */
router.get('/quarterly', auth, async (req, res) => {
  try {
    const { quarter, taxYear } = req.query;
    const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);
    const year = taxYear || new Date().getFullYear();
    
    const estimate = await taxService.calculateQuarterlyEstimate(
      req.user.id,
      parseInt(currentQuarter),
      parseInt(year)
    );
    res.json({
      success: true,
      data: estimate
    });
  } catch (error) {
    console.error('Get quarterly estimate error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== TAX COMPARISON & OPTIMIZATION ====================

/**
 * @route   GET /api/tax/compare-regimes
 * @desc    Compare old vs new tax regime
 * @access  Private
 */
router.get('/compare-regimes', auth, async (req, res) => {
  try {
    const taxYear = parseInt(req.query.taxYear) || new Date().getFullYear();
    const comparison = await taxService.compareRegimes(req.user.id, taxYear);
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Regime comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare tax regimes'
    });
  }
});

/**
 * @route   GET /api/tax/optimization
 * @desc    Get tax optimization recommendations
 * @access  Private
 */
router.get('/optimization', auth, async (req, res) => {
  try {
    const optimizations = await taxService.generateOptimizations(req.user.id);
    res.json({
      success: true,
      data: optimizations
    });
  } catch (error) {
    console.error('Get optimization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== TAX SUMMARY & REPORTS ====================

/**
 * @route   GET /api/tax/summary
 * @desc    Get tax summary for dashboard
 * @access  Private
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const taxYear = parseInt(req.query.taxYear) || new Date().getFullYear();
    const summary = await taxService.getTaxSummary(req.user.id, taxYear);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Tax summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax summary'
    });
  }
});

/**
 * @route   GET /api/tax/report/:year
 * @desc    Generate tax report
 * @access  Private
 */
router.get('/report/:year', auth, async (req, res) => {
  try {
    const { format = 'summary' } = req.query;
    const report = await taxService.generateTaxReport(
      req.user.id,
      parseInt(req.params.year),
      format
    );
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/tax/checklist
 * @desc    Get year-end tax checklist
 * @access  Private
 */
router.get('/checklist', auth, async (req, res) => {
  try {
    const checklist = await taxService.getYearEndChecklist(req.user.id);
    res.json({
      success: true,
      data: checklist
    });
  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== TAX CATEGORIES ====================

/**
 * @route   GET /api/tax/categories
 * @desc    Get all tax categories
 * @access  Private
 */
router.get('/categories', auth, async (req, res) => {
  try {
    const { country, type } = req.query;
    const query = { isActive: true };
    
    if (country) {
      query.country = country;
    }
    if (type) {
      query.type = type;
    }
    
    const categories = await TaxCategory.find(query).sort({ name: 1 });
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/tax/deductible-categories
 * @desc    Get tax-deductible expense categories
 * @access  Private
 */
router.get('/deductible-categories', auth, async (req, res) => {
  try {
    const country = req.query.country || 'IN';
    const categories = await taxService.getDeductibleCategories(country);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get deductible categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deductible categories'
    });
  }
});

/**
 * @route   POST /api/tax/categories
 * @desc    Create custom tax category
 * @access  Private
 */
router.post('/categories', auth, validateDeductionCategory, async (req, res) => {
  try {
    const category = new TaxCategory({
      ...req.body,
      isSystem: false
    });
    await category.save();
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/tax/initialize-categories
 * @desc    Initialize default tax categories
 * @access  Private
 */
router.post('/initialize-categories', auth, async (req, res) => {
  try {
    const country = req.body.country || 'IN';
    await taxService.initializeDefaultCategories(country);
    
    res.json({
      success: true,
      message: `Default tax categories initialized for ${country}`
    });
  } catch (error) {
    console.error('Initialize categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize tax categories'
    });
  }
});

// ==================== EXPENSE TAX TAGGING ====================

/**
 * @route   POST /api/tax/auto-tag
 * @desc    Auto-tag expense as tax-deductible
 * @access  Private
 */
router.post('/auto-tag', auth, async (req, res) => {
  try {
    const { description, category, amount } = req.body;
    
    const expense = { description, category, amount };
    const taxInfo = await taxService.autoTagExpense(expense);
    
    res.json({
      success: true,
      data: taxInfo
    });
  } catch (error) {
    console.error('Auto-tag expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-tag expense'
    });
  }
});

/**
 * @route   POST /api/tax/categorize/:expenseId
 * @desc    AI categorize an expense for tax purposes
 * @access  Private
 */
router.post('/categorize/:expenseId', auth, async (req, res) => {
  try {
    const result = await taxService.categorizeExpenseForTax(req.user.id, req.params.expenseId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Categorize expense error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/tax/deductible-expenses
 * @desc    Get all tax-deductible expenses for a period
 * @access  Private
 */
router.get('/deductible-expenses', auth, async (req, res) => {
  try {
    const taxYear = parseInt(req.query.taxYear) || new Date().getFullYear();
    
    // Get date range for tax year (Indian FY: April to March)
    const startDate = new Date(taxYear, 3, 1); // April 1
    const endDate = new Date(taxYear + 1, 2, 31); // March 31
    
    const expenses = await taxService.getDeductibleExpenses(req.user.id, startDate, endDate);
    
    res.json({
      success: true,
      data: {
        taxYear,
        period: { startDate, endDate },
        expenses,
        totalDeductible: expenses.reduce((sum, e) => sum + (e.deductibleAmount || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get deductible expenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deductible expenses'
    });
  }
});

module.exports = router;
