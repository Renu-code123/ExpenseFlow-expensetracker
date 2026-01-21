const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const Budget = require('../models/Budget');
const budgetService = require('../services/budgetService');
const router = express.Router();

const budgetSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  category: Joi.string().valid('food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other', 'all').required(),
  amount: Joi.number().min(0).required(),
  period: Joi.string().valid('monthly', 'weekly', 'yearly').default('monthly'),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  alertThreshold: Joi.number().min(0).max(100).default(80)
});

// Create budget
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = budgetSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const budget = new Budget({ ...value, user: req.user._id });
    await budget.save();

    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all budgets
router.get('/', auth, async (req, res) => {
  try {
    const { period, active } = req.query;
    const query = { user: req.user._id };
    
    if (period) query.period = period;
    if (active !== undefined) query.isActive = active === 'true';

    const budgets = await Budget.find(query).sort({ createdAt: -1 });
    
    // Calculate spent amounts
    for (const budget of budgets) {
      await budgetService.calculateBudgetSpent(budget);
    }

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const summary = await budgetService.getBudgetSummary(req.user._id, period);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget alerts
router.get('/alerts', auth, async (req, res) => {
  try {
    const alerts = await budgetService.checkBudgetAlerts(req.user._id);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update budget
router.put('/:id', auth, async (req, res) => {
  try {
    const { error, value } = budgetSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      value,
      { new: true }
    );

    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete budget
router.delete('/:id', auth, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create monthly budgets
router.post('/monthly', auth, async (req, res) => {
  try {
    const budgetData = req.body; // { food: 10000, transport: 5000, ... }
    const budgets = await budgetService.createMonthlyBudgets(req.user._id, budgetData);
    res.status(201).json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's monthly spending limit
router.get('/monthly-limit', auth, async (req, res) => {
  try {
    const budgetStatus = await budgetService.checkMonthlyBudgetLimit(req.user._id);
    res.json(budgetStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set or update user's monthly spending limit
router.post('/monthly-limit', auth, async (req, res) => {
  try {
    const { monthlyLimit } = req.body;
    
    // Validate input
    if (monthlyLimit === undefined) {
      return res.status(400).json({ error: 'monthlyLimit is required' });
    }
    
    if (monthlyLimit !== null && (typeof monthlyLimit !== 'number' || monthlyLimit < 0)) {
      return res.status(400).json({ error: 'monthlyLimit must be a non-negative number or null' });
    }

    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { monthlyLimit: monthlyLimit || null },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return updated limit status with current month's expenses
    const budgetStatus = await budgetService.checkMonthlyBudgetLimit(req.user._id);

    res.json({
      message: monthlyLimit ? `Monthly spending limit set to $${monthlyLimit.toFixed(2)}` : 'Monthly spending limit removed',
      user: {
        id: user._id,
        email: user.email,
        monthlyLimit: user.monthlyLimit
      },
      budgetStatus: budgetStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user's monthly spending limit (PUT alternative)
router.put('/monthly-limit', auth, async (req, res) => {
  try {
    const { monthlyLimit } = req.body;
    
    // Validate input
    if (monthlyLimit === undefined) {
      return res.status(400).json({ error: 'monthlyLimit is required' });
    }
    
    if (monthlyLimit !== null && (typeof monthlyLimit !== 'number' || monthlyLimit < 0)) {
      return res.status(400).json({ error: 'monthlyLimit must be a non-negative number or null' });
    }

    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { monthlyLimit: monthlyLimit || null },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return updated limit status with current month's expenses
    const budgetStatus = await budgetService.checkMonthlyBudgetLimit(req.user._id);

    res.json({
      message: monthlyLimit ? `Monthly spending limit updated to $${monthlyLimit.toFixed(2)}` : 'Monthly spending limit removed',
      user: {
        id: user._id,
        email: user.email,
        monthlyLimit: user.monthlyLimit
      },
      budgetStatus: budgetStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;