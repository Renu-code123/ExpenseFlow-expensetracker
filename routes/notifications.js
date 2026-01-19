const express = require('express');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');
const User = require('../models/User');
const Expense = require('../models/Expense');
const router = express.Router();

// Send test email
router.post('/test', auth, async (req, res) => {
  try {
    await emailService.sendWelcomeEmail(req.user);
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send monthly report manually
router.post('/monthly-report', auth, async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyData = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const categoryData = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startOfMonth },
          type: 'expense'
        }
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { amount: -1 } },
      { $limit: 5 }
    ]);

    const totalExpenses = monthlyData.find(d => d._id === 'expense')?.total || 0;
    const totalIncome = monthlyData.find(d => d._id === 'income')?.total || 0;
    const balance = totalIncome - totalExpenses;

    const reportData = {
      totalExpenses,
      totalIncome,
      balance,
      topCategories: categoryData.map(cat => ({
        name: cat._id,
        amount: cat.amount
      }))
    };

    await emailService.sendMonthlyReport(req.user, reportData);
    res.json({ message: 'Monthly report sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send weekly report manually
router.post('/weekly-report', auth, async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyExpenses = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: oneWeekAgo },
          type: 'expense'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalSpent = weeklyExpenses.reduce((sum, day) => sum + day.amount, 0);
    const avgDaily = totalSpent / 7;

    const reportData = {
      weeklyExpenses: weeklyExpenses.map(day => ({
        date: day._id,
        amount: day.amount
      })),
      totalSpent,
      avgDaily
    };

    await emailService.sendWeeklyReport(req.user, reportData);
    res.json({ message: 'Weekly report sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;