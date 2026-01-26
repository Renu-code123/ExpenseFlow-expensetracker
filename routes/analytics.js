const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const User = require('../models/User');

// Get analytics summary
router.get('/summary', auth, async (req, res) => {
    try {
        const { timeRange = 30 } = req.query;
        const userId = req.user.id;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));
        
        const expenses = await Expense.find({
            userId,
            date: { $gte: startDate }
        });
        
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalIncome = expenses
            .filter(exp => exp.type === 'income')
            .reduce((sum, exp) => sum + exp.amount, 0);
        
        const netSavings = totalIncome - totalExpenses;
        const avgDaily = totalExpenses / parseInt(timeRange);
        
        res.json({
            totalIncome,
            totalExpenses,
            netSavings,
            avgDaily,
            transactionCount: expenses.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get spending trends
router.get('/trends', auth, async (req, res) => {
    try {
        const { period = 'daily', timeRange = 30 } = req.query;
        const userId = req.user.id;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));
        
        const expenses = await Expense.aggregate([
            {
                $match: {
                    userId: userId,
                    date: { $gte: startDate },
                    type: 'expense'
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: period === 'monthly' ? '%Y-%m' : '%Y-%m-%d',
                            date: '$date'
                        }
                    },
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
        
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get category breakdown
router.get('/categories', auth, async (req, res) => {
    try {
        const { timeRange = 30 } = req.query;
        const userId = req.user.id;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));
        
        const categoryData = await Expense.aggregate([
            {
                $match: {
                    userId: userId,
                    date: { $gte: startDate },
                    type: 'expense'
                }
            },
            {
                $group: {
                    _id: '$category',
                    totalAmount: { $sum: '$amount' },
                    transactionCount: { $sum: 1 },
                    avgAmount: { $avg: '$amount' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);
        
        const totalExpenses = categoryData.reduce((sum, cat) => sum + cat.totalAmount, 0);
        
        const categoriesWithPercentage = categoryData.map(cat => ({
            category: cat._id,
            amount: cat.totalAmount,
            transactions: cat.transactionCount,
            percentage: ((cat.totalAmount / totalExpenses) * 100).toFixed(1),
            avgPerTransaction: Math.round(cat.avgAmount)
        }));
        
        res.json(categoriesWithPercentage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get top merchants
router.get('/merchants', auth, async (req, res) => {
    try {
        const { timeRange = 30, limit = 10 } = req.query;
        const userId = req.user.id;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));
        
        const merchants = await Expense.aggregate([
            {
                $match: {
                    userId: userId,
                    date: { $gte: startDate },
                    type: 'expense',
                    merchant: { $exists: true, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$merchant',
                    totalAmount: { $sum: '$amount' },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: parseInt(limit) }
        ]);
        
        res.json(merchants.map(merchant => ({
            name: merchant._id,
            amount: merchant.totalAmount,
            transactions: merchant.transactionCount
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get income vs expenses comparison
router.get('/income-expense', auth, async (req, res) => {
    try {
        const { months = 6 } = req.query;
        const userId = req.user.id;
        
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));
        
        const monthlyData = await Expense.aggregate([
            {
                $match: {
                    userId: userId,
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $dateToString: { format: '%Y-%m', date: '$date' } },
                        type: '$type'
                    },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.month': 1 } }
        ]);
        
        const formattedData = {};
        monthlyData.forEach(item => {
            const month = item._id.month;
            if (!formattedData[month]) {
                formattedData[month] = { month, income: 0, expense: 0 };
            }
            formattedData[month][item._id.type] = item.totalAmount;
        });
        
        res.json(Object.values(formattedData));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate detailed report
router.get('/report/:type', auth, async (req, res) => {
    try {
        const { type } = req.params;
        const { timeRange = 30 } = req.query;
        const userId = req.user.id;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));
        
        let reportData = [];
        
        switch (type) {
            case 'category':
                reportData = await Expense.aggregate([
                    {
                        $match: {
                            userId: userId,
                            date: { $gte: startDate },
                            type: 'expense'
                        }
                    },
                    {
                        $group: {
                            _id: '$category',
                            totalAmount: { $sum: '$amount' },
                            transactionCount: { $sum: 1 },
                            avgAmount: { $avg: '$amount' }
                        }
                    },
                    { $sort: { totalAmount: -1 } }
                ]);
                break;
                
            case 'monthly':
                reportData = await Expense.aggregate([
                    {
                        $match: {
                            userId: userId,
                            type: 'expense'
                        }
                    },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
                            totalAmount: { $sum: '$amount' },
                            transactionCount: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id': -1 } },
                    { $limit: 12 }
                ]);
                break;
                
            case 'yearly':
                reportData = await Expense.aggregate([
                    {
                        $match: {
                            userId: userId,
                            type: 'expense'
                        }
                    },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y', date: '$date' } },
                            totalAmount: { $sum: '$amount' },
                            transactionCount: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id': -1 } },
                    { $limit: 5 }
                ]);
                break;
        }
        
        res.json(reportData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get financial insights
router.get('/insights', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const insights = [];
        
        // Weekend vs weekday spending
        const weekendSpending = await Expense.aggregate([
            {
                $match: {
                    userId: userId,
                    type: 'expense',
                    date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: '$date' },
                    avgAmount: { $avg: '$amount' }
                }
            }
        ]);
        
        const weekdayAvg = weekendSpending
            .filter(day => day._id >= 2 && day._id <= 6)
            .reduce((sum, day) => sum + day.avgAmount, 0) / 5;
        const weekendAvg = weekendSpending
            .filter(day => day._id === 1 || day._id === 7)
            .reduce((sum, day) => sum + day.avgAmount, 0) / 2;
        
        if (weekendAvg > weekdayAvg * 1.2) {
            insights.push({
                type: 'spending_pattern',
                title: 'Weekend Spending',
                message: `You spend ${Math.round(((weekendAvg / weekdayAvg - 1) * 100))}% more on weekends. Consider setting weekend budgets.`,
                icon: '🎯'
            });
        }
        
        // Budget performance (mock for now)
        insights.push({
            type: 'budget_performance',
            title: 'Budget Performance',
            message: 'You\'re 15% under budget this month. Great job on controlling expenses!',
            icon: '📊'
        });
        
        // Savings opportunity
        const foodExpenses = await Expense.aggregate([
            {
                $match: {
                    userId: userId,
                    category: 'Food & Dining',
                    type: 'expense',
                    date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);
        
        if (foodExpenses.length > 0) {
            const monthlySavings = Math.round(foodExpenses[0].totalAmount * 0.2);
            insights.push({
                type: 'savings_opportunity',
                title: 'Savings Opportunity',
                message: `Reduce food delivery by 20% to save ₹${monthlySavings} monthly.`,
                icon: '💰'
            });
        }
        
        res.json(insights);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;