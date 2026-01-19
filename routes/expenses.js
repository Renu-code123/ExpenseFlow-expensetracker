const express = require('express');
const Joi = require('joi');
const Expense = require('../models/Expense');
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
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;