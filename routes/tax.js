const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const taxService = require('../services/taxService');
const TaxProfile = require('../models/TaxProfile');
const TaxCategory = require('../models/TaxCategory');
const Deduction = require('../models/Deduction');
const TaxEstimate = require('../models/TaxEstimate');
const { validateRequest, taxSchemas } = require('../middleware/taxValidator');

// ==================== TAX PROFILE ROUTES ====================

/**
 * @route   POST /api/tax/profile
 * @desc    Create or update tax profile
 * @access  Private
 */
router.post('/profile', auth, validateRequest(taxSchemas.createProfile), async (req, res) => {
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
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tax/profile
 * @desc    Get user's tax profile
 * @access  Private
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const profile = await TaxProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tax profile not found. Please set up your tax profile.'
      });
    }
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/tax/profile
 * @desc    Update tax profile
 * @access  Private
 */
router.put('/profile', auth, validateRequest(taxSchemas.updateProfile), async (req, res) => {
  try {
    const profile = await taxService.createOrUpdateProfile(req.user.id, req.body);
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== TAX CATEGORY ROUTES ====================

/**
 * @route   GET /api/tax/categories
 * @desc    Get all tax categories
 * @access  Private
 */
router.get('/categories', auth, async (req, res) => {
  try {
    const { jurisdiction, type } = req.query;
    const query = { isActive: true };
    
    if (jurisdiction) {
      query.$or = [{ jurisdiction }, { jurisdiction: 'ALL' }];
    }
    if (type) {
      query.categoryType = type;
    }
    
    // Include system categories and user's custom categories
    query.$or = query.$or || [];
    query.$or.push({ isSystem: true }, { user: req.user.id });
    
    const categories = await TaxCategory.find(query).sort({ displayOrder: 1, name: 1 });
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/tax/categories
 * @desc    Create custom tax category
 * @access  Private
 */
router.post('/categories', auth, validateRequest(taxSchemas.createCategory), async (req, res) => {
  try {
    const category = new TaxCategory({
      ...req.body,
      user: req.user.id,
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
      message: error.message
    });
  }
});

// ==================== DEDUCTION ROUTES ====================

/**
 * @route   POST /api/tax/deductions
 * @desc    Create a new deduction
 * @access  Private
 */
router.post('/deductions', auth, validateRequest(taxSchemas.createDeduction), async (req, res) => {
  try {
    const deduction = await taxService.createDeduction(req.user.id, req.body);
    res.status(201).json({
      success: true,
      data: deduction
    });
  } catch (error) {
    console.error('Create deduction error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/tax/deductions/from-expense/:expenseId
 * @desc    Create deduction from existing expense
 * @access  Private
 */
router.post('/deductions/from-expense/:expenseId', auth, validateRequest(taxSchemas.deductionFromExpense), async (req, res) => {
  try {
    const deduction = await taxService.createDeductionFromExpense(
      req.user.id,
      req.params.expenseId,
      req.body.taxCategoryId,
      req.body
    );
    res.status(201).json({
      success: true,
      data: deduction
    });
  } catch (error) {
    console.error('Create deduction from expense error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tax/deductions
 * @desc    Get all deductions for a tax year
 * @access  Private
 */
router.get('/deductions', auth, async (req, res) => {
  try {
    const { taxYear, category, status, page = 1, limit = 50 } = req.query;
    const year = taxYear || new Date().getFullYear();
    
    const query = {
      user: req.user.id,
      taxYear: parseInt(year),
      isDeleted: false
    };
    
    if (category) query.taxCategory = category;
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [deductions, total] = await Promise.all([
      Deduction.find(query)
        .populate('taxCategory', 'name code categoryType')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Deduction.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        deductions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get deductions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tax/deductions/summary
 * @desc    Get deductions summary by category
 * @access  Private
 */
router.get('/deductions/summary', auth, async (req, res) => {
  try {
    const { taxYear } = req.query;
    const summary = await taxService.getDeductionsSummary(req.user.id, taxYear ? parseInt(taxYear) : undefined);
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get deductions summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tax/deductions/:id
 * @desc    Get single deduction
 * @access  Private
 */
router.get('/deductions/:id', auth, async (req, res) => {
  try {
    const deduction = await Deduction.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('taxCategory expense');
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    res.json({
      success: true,
      data: deduction
    });
  } catch (error) {
    console.error('Get deduction error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/tax/deductions/:id
 * @desc    Update deduction
 * @access  Private
 */
router.put('/deductions/:id', auth, validateRequest(taxSchemas.updateDeduction), async (req, res) => {
  try {
    const deduction = await Deduction.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    const previousValues = deduction.toObject();
    Object.assign(deduction, req.body);
    deduction.addAuditEntry('updated', previousValues, req.body, 'user', 'User update');
    
    await deduction.save();
    
    res.json({
      success: true,
      data: deduction
    });
  } catch (error) {
    console.error('Update deduction error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/tax/deductions/:id
 * @desc    Delete (soft) deduction
 * @access  Private
 */
router.delete('/deductions/:id', auth, async (req, res) => {
  try {
    const deduction = await Deduction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { 
        isDeleted: true, 
        deletedAt: new Date(),
        deletedReason: req.body.reason || 'User deleted'
      },
      { new: true }
    );
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Deduction deleted successfully'
    });
  } catch (error) {
    console.error('Delete deduction error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== AI CATEGORIZATION ROUTES ====================

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
      message: error.message
    });
  }
});

/**
 * @route   POST /api/tax/categorize/bulk
 * @desc    Bulk categorize expenses for tax
 * @access  Private
 */
router.post('/categorize/bulk', auth, async (req, res) => {
  try {
    const { startDate, endDate, minAmount } = req.body;
    const results = await taxService.bulkCategorizeExpenses(req.user.id, {
      startDate,
      endDate,
      minAmount
    });
    res.json({
      success: true,
      data: {
        deductibleCount: results.deductible.length,
        nonDeductibleCount: results.nonDeductible.length,
        alreadyTrackedCount: results.alreadyTracked.length,
        deductible: results.deductible.slice(0, 50),
        potentialSavings: results.deductible.reduce((sum, d) => sum + d.expense.amount, 0)
      }
    });
  } catch (error) {
    console.error('Bulk categorize error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== TAX ESTIMATE ROUTES ====================

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
      message: error.message
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
      message: error.message
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
    const estimate = await taxService.calculateTaxEstimate(req.user.id, {
      includeOptimizations: true
    });
    res.json({
      success: true,
      data: {
        optimizations: estimate.optimizations,
        potentialSavings: estimate.optimizations.reduce((sum, o) => sum + (o.potentialSavings || 0), 0),
        currentTax: estimate.finalTax.totalTax,
        effectiveRate: estimate.finalTax.effectiveRate
      }
    });
  } catch (error) {
    console.error('Get optimization error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== TAX REPORT ROUTES ====================

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
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tax/export/:year
 * @desc    Export deductions for tax software
 * @access  Private
 */
router.get('/export/:year', auth, async (req, res) => {
  try {
    const { software = 'generic' } = req.query;
    const exportData = await taxService.exportForTaxSoftware(
      req.user.id,
      parseInt(req.params.year),
      software
    );
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/tax/compare
 * @desc    Compare tax years
 * @access  Private
 */
router.get('/compare', auth, async (req, res) => {
  try {
    const { year1, year2 } = req.query;
    const comparison = await TaxEstimate.compareYears(
      req.user.id,
      parseInt(year1),
      parseInt(year2)
    );
    
    if (!comparison) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient data for comparison'
      });
    }
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Compare years error:', error);
    res.status(500).json({
      success: false,
      message: error.message
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
      message: error.message
    });
  }
});

/**
 * @route   POST /api/tax/estimate/payment
 * @desc    Record an estimated tax payment
 * @access  Private
 */
router.post('/estimate/payment', auth, validateRequest(taxSchemas.recordPayment), async (req, res) => {
  try {
    const { quarter, amount, taxYear, paymentDate } = req.body;
    const year = taxYear || new Date().getFullYear();
    
    let estimate = await TaxEstimate.findOne({
      user: req.user.id,
      taxYear: year,
      estimateType: 'annual'
    });
    
    if (!estimate) {
      estimate = await taxService.calculateTaxEstimate(req.user.id, { taxYear: year });
    }
    
    estimate.payments.estimatedPayments[`q${quarter}`] = amount;
    await estimate.save();
    
    res.json({
      success: true,
      data: {
        quarter,
        amount,
        totalPaid: estimate.payments.totalPayments,
        remainingTax: estimate.finalTax.totalTax - estimate.payments.totalPayments
      }
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
