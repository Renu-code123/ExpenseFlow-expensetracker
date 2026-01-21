const express = require('express');
const Joi = require('joi');
const Expense = require('../models/Expense');
const budgetService = require('../services/budgetService');
const categorizationService = require('../services/categorizationService');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

const expenseSchema = Joi.object({
  description: Joi.string().trim().max(100).required(),
  amount: Joi.number().min(0.01).required(),
  category: Joi.string().valid('food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other').required(),
  type: Joi.string().valid('income', 'expense').required(),
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
    
    // Prepare response object with expense and optional warning
    const responseData = {
      ...expense.toObject(),
      monthlyBudgetWarning: null
    };
    
    // Update budget and goal progress
    if (value.type === 'expense') {
      await budgetService.checkBudgetAlerts(req.user._id);
      
      // Check monthly spending limit
      try {
        const budgetStatus = await budgetService.checkMonthlyBudgetLimit(req.user._id);
        
        if (budgetStatus.isLimitSet && budgetStatus.isExceeded) {
          responseData.monthlyBudgetWarning = {
            isExceeded: true,
            message: `Monthly spending limit exceeded! You have spent $${budgetStatus.currentMonthTotal.toFixed(2)} of your $${budgetStatus.limit.toFixed(2)} limit.`,
            limit: budgetStatus.limit,
            currentMonthTotal: budgetStatus.currentMonthTotal,
            overAmount: (budgetStatus.currentMonthTotal - budgetStatus.limit).toFixed(2),
            percentageUsed: budgetStatus.percentageUsed.toFixed(2)
          };
        }
      } catch (limitError) {
        console.error('Monthly budget limit check failed:', limitError.message);
        // Non-critical error, continue without warning
      }
    }
    
    await budgetService.updateGoalProgress(req.user._id, value.type === 'expense' ? -value.amount : value.amount, value.category);
    
    // Emit real-time update to all user's connected devices
    const io = req.app.get('io');
    io.to(`user_${req.user._id}`).emit('expense_created', expense);
    
    res.status(201).json(responseData);
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

module.exports = router;