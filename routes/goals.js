const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const Goal = require('../models/Goal');
const budgetService = require('../services/budgetService');
const router = express.Router();

const goalSchema = Joi.object({
  title: Joi.string().trim().max(100).required(),
  description: Joi.string().trim().max(500).optional(),
  targetAmount: Joi.number().min(0).required(),
  currentAmount: Joi.number().min(0).default(0),
  goalType: Joi.string().valid('savings', 'expense_reduction', 'income_increase', 'debt_payoff').required(),
  category: Joi.string().valid('food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other', 'general').default('general'),
  targetDate: Joi.date().required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  reminderFrequency: Joi.string().valid('daily', 'weekly', 'monthly', 'none').default('weekly'),
  milestones: Joi.array().items(
    Joi.object({
      amount: Joi.number().min(0).required(),
      date: Joi.date().required()
    })
  ).optional()
});

// Create goal
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = goalSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const goal = new Goal({ ...value, user: req.user._id });
    await goal.save();

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all goals
router.get('/', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = { user: req.user._id };
    
    if (status) query.status = status;
    if (type) query.goalType = type;

    const goals = await Goal.find(query).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get goals summary
router.get('/summary', auth, async (req, res) => {
  try {
    const summary = await budgetService.getGoalsSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update goal progress
router.patch('/:id/progress', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    goal.currentAmount += amount;
    
    // Check milestones
    goal.milestones.forEach(milestone => {
      if (!milestone.achieved && goal.currentAmount >= milestone.amount) {
        milestone.achieved = true;
        milestone.achievedDate = new Date();
      }
    });

    // Check if goal is completed
    if (goal.currentAmount >= goal.targetAmount && goal.status === 'active') {
      goal.status = 'completed';
    }

    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update goal
router.put('/:id', auth, async (req, res) => {
  try {
    const { error, value } = goalSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      value,
      { new: true }
    );

    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update goal status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'completed', 'paused', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status },
      { new: true }
    );

    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;