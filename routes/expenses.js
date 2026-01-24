const express = require('express');
const Joi = require('joi');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const currencyService = require('../services/currencyService');
const router = express.Router();

const expenseSchema = Joi.object({
  description: Joi.string().trim().max(100).required(),
  amount: Joi.number().min(0.01).required(),
  category: Joi.string().valid('food', 'transport', 'shopping', 'entertainment', 'bills', 'healthcare', 'education', 'travel', 'salary', 'freelance', 'investment', 'other').required(),
  type: Joi.string().valid('income', 'expense').required(),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'AED', 'SGD', 'HKD', 'KRW', 'MXN', 'BRL').default('INR'),
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

// GET expense summary with currency conversion
router.get('/summary', auth, async (req, res) => {
  try {
    const baseCurrency = req.user.baseCurrency || 'INR';
    const expenses = await Expense.find({ user: req.user._id });

    let totalIncome = 0;
    let totalExpense = 0;
    const byCurrency = {};
    const byCategory = {};

    for (const expense of expenses) {
      // Convert to base currency if needed
      let amountInBase = expense.baseAmount || expense.amount;

      if (expense.currency !== baseCurrency) {
        const converted = await currencyService.convert(expense.amount, expense.currency, baseCurrency, baseCurrency);
        amountInBase = converted.amount;
      }

      // Aggregate totals
      if (expense.type === 'income') {
        totalIncome += amountInBase;
      } else {
        totalExpense += amountInBase;
      }

      // By currency
      if (!byCurrency[expense.currency]) {
        byCurrency[expense.currency] = { income: 0, expense: 0 };
      }
      if (expense.type === 'income') {
        byCurrency[expense.currency].income += expense.amount;
      } else {
        byCurrency[expense.currency].expense += expense.amount;
      }

      // By category
      if (!byCategory[expense.category]) {
        byCategory[expense.category] = 0;
      }
      byCategory[expense.category] += amountInBase;
    }

    res.json({
      baseCurrency,
      balance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      byCurrency,
      byCategory,
      transactionCount: expenses.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new expense for authenticated user
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = expenseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const baseCurrency = req.user.baseCurrency || 'INR';
    let exchangeRate = 1;
    let baseAmount = value.amount;

    // Calculate exchange rate if different currency
    if (value.currency && value.currency !== baseCurrency) {
      const conversion = await currencyService.convert(value.amount, value.currency, baseCurrency, baseCurrency);
      exchangeRate = conversion.rate;
      baseAmount = conversion.amount;
    }

    const expense = new Expense({
      ...value,
      user: req.user._id,
      exchangeRate,
      baseAmount
    });
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

    const baseCurrency = req.user.baseCurrency || 'INR';
    let exchangeRate = 1;
    let baseAmount = value.amount;

    // Calculate exchange rate if different currency
    if (value.currency && value.currency !== baseCurrency) {
      const conversion = await currencyService.convert(value.amount, value.currency, baseCurrency, baseCurrency);
      exchangeRate = conversion.rate;
      baseAmount = conversion.amount;
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...value, exchangeRate, baseAmount },
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