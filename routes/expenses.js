const express = require('express');
const Joi = require('joi');
const Expense = require('../models/Expense');
const budgetService = require('../services/budgetService');
const categorizationService = require('../services/categorizationService');
const exportService = require('../services/exportService');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

const expenseSchema = Joi.object({
  description: Joi.string().trim().max(100).required(),
  amount: Joi.number().min(0.01).required(),
  category: Joi.string().valid('food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other').required(),
  type: Joi.string().valid('income', 'expense').required(),
  merchant: Joi.string().trim().max(50).optional(),
  date: Joi.date().optional()
});

// GET all expenses for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new expense for authenticated user
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = expenseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const expense = new Expense({ ...value, user: req.user._id });
    await expense.save();
    
    // Auto-learn from user's category choice
    try {
      await categorizationService.autoLearnFromExpense(
        req.user._id,
        value.description,
        value.category
      );
    } catch (learnError) {
      console.error('Auto-learning failed:', learnError.message);
      // Non-critical error, continue
    }
    
    // Update budget and goal progress
    if (value.type === 'expense') {
      await budgetService.checkBudgetAlerts(req.user._id);
    }
    await budgetService.updateGoalProgress(req.user._id, value.type === 'expense' ? -value.amount : value.amount, value.category);
    
    // Emit real-time update to all user's connected devices
    const io = req.app.get('io');
    io.to(`user_${req.user._id}`).emit('expense_created', expense);
    
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update expense for authenticated user
router.put('/:id', auth, async (req, res) => {
  try {
    const { error, value } = expenseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      value,
      { new: true }
    );
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    
    // Update budget calculations
    await budgetService.checkBudgetAlerts(req.user._id);
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user._id}`).emit('expense_updated', expense);
    
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE expense for authenticated user
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    
    // Update budget calculations
    await budgetService.checkBudgetAlerts(req.user._id);
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user._id}`).emit('expense_deleted', { id: req.params.id });
    
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET export expenses to CSV
router.get('/export', auth, async (req, res) => {
  try {
    const { format, startDate, endDate, category } = req.query;

    // Validate format
    if (format && format !== 'csv') {
      return res.status(400).json({ error: 'Only CSV format is supported' });
    }

    // Get expenses using export service
    const expenses = await exportService.getExpensesForExport(req.user._id, {
      startDate,
      endDate,
      category,
      type: 'all' // Include both income and expenses
    });

    if (expenses.length === 0) {
      return res.status(404).json({ error: 'No expenses found for the selected filters' });
    }

    // Generate CSV using ExportService
    const csv = exportService.generateCSV(expenses);

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');

    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export expenses' });
  }
});

module.exports = router;