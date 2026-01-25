const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const taxService = require('../services/taxService');
const {
  validateTaxProfile,
  validateTaxCalculation,
  validateDeductionCategory,
  validateExpenseTaxTag
} = require('../middleware/taxValidator');

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
        totalDeductible: expenses.reduce((sum, e) => sum + e.deductibleAmount, 0)
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

/**
 * @route   POST /api/tax/initialize-categories
 * @desc    Initialize default tax categories (admin only)
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

module.exports = router;
