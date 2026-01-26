const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const AnalyticsCache = require('../models/AnalyticsCache');
const mongoose = require('mongoose');
const CACHE_KEYS = {
    SPENDING_TRENDS: CACHE_KEYS.SPENDING_TRENDS
    ,
    CATEGORY_BREAKDOWN: CACHE_KEYS.CATEGORY_BREAKDOWN,
    MONTHLY_COMPARISON: CACHE_KEYS.MONTHLY_COMPARISON,
    INSIGHTS: CACHE_KEYS.INSIGHTS,
    PREDICTIONS: CACHE_KEYS.PREDICTIONS
};

const CACHE_TTL = {
    SHORT: CACHE_TTL.SHORT,     // minutes
    MEDIUM: CACHE_TTL.MEDIUM,
    LONG: CACHE_TTL.LONG,
    XLONG: CACHE_TTL.XLONG
};

class AnalyticsService {
    constructor() {
        this.defaultCurrency = process.env.DEFAULT_CURRENCY || 'INR';
        this.defaultLocale = process.env.DEFAULT_LOCALE || 'en-US';
    }

    formatCurrency(amount, locale = this.defaultLocale, currency = this.defaultCurrency) {
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(amount) || 0);
        } catch (err) {
            return `${currency} ${Number(amount || 0).toFixed(2)}`;
        }
    }
    /**
     * Get spending trends over time (daily, weekly, monthly)
     */
    async getSpendingTrends(userId, options = {}) {
        const {
            period = 'monthly', // daily, weekly, monthly
            months = 6,
            useCache = true
        } = options;

        // Check cache
        if (useCache) {
            const cached = await AnalyticsCache.getCache(CACHE_KEYS.SPENDING_TRENDS
                , userId, { period, months });
            if (cached) return cached;
        }

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setHours(0, 0, 0, 0);

        let groupFormat;
        switch (period) {
            case 'daily':
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
                break;
            case 'weekly':
                groupFormat = {
                    $concat: [
                        { $toString: { $year: '$date' } },
                        '-W',
                        { $toString: { $week: '$date' } }
                    ]
                };
                break;
            case 'monthly':
            default:
                groupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        }

        const trends = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        period: groupFormat,
                        type: '$type'
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.period',
                    income: {
                        $sum: { $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0] }
                    },
                    expense: {
                        $sum: { $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0] }
                    },
                    incomeCount: {
                        $sum: { $cond: [{ $eq: ['$_id.type', 'income'] }, '$count', 0] }
                    },
                    expenseCount: {
                        $sum: { $cond: [{ $eq: ['$_id.type', 'expense'] }, '$count', 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Calculate moving averages and growth rates
        const result = {
            period,
            data: trends.map((item, index, arr) => {
                const prevItem = arr[index - 1];
                const expenseGrowth = prevItem
                    ? ((item.expense - prevItem.expense) / (prevItem.expense || 1)) * 100
                    : 0;
                const incomeGrowth = prevItem
                    ? ((item.income - prevItem.income) / (prevItem.income || 1)) * 100
                    : 0;

                return {
                    period: item._id,
                    income: Math.round(item.income * 100) / 100,
                    expense: Math.round(item.expense * 100) / 100,
                    net: Math.round((item.income - item.expense) * 100) / 100,
                    savingsRate: item.income > 0
                        ? Math.round(((item.income - item.expense) / item.income) * 100)
                        : 0,
                    transactionCount: item.incomeCount + item.expenseCount,
                    expenseGrowth: Math.round(expenseGrowth * 10) / 10,
                    incomeGrowth: Math.round(incomeGrowth * 10) / 10
                };
            }),
            summary: this.calculateTrendsSummary(trends)
        };

        // Cache result
        if (useCache) {
            await AnalyticsCache.setCache(CACHE_KEYS.SPENDING_TRENDS
                , userId, { period, months }, result, CACHE_TTL.MEDIUM);
        }

        return result;
    }

    /**
     * Calculate trends summary
     */
    calculateTrendsSummary(trends) {
        if (trends.length === 0) return null;

        const totalIncome = trends.reduce((sum, t) => sum + t.income, 0);
        const totalExpense = trends.reduce((sum, t) => sum + t.expense, 0);
        const avgIncome = totalIncome / trends.length;
        const avgExpense = totalExpense / trends.length;

        // Calculate trend direction
        const recentTrends = trends.slice(-3);
        const olderTrends = trends.slice(0, 3);
        const recentAvgExpense = recentTrends.reduce((sum, t) => sum + t.expense, 0) / recentTrends.length;
        const olderAvgExpense = olderTrends.reduce((sum, t) => sum + t.expense, 0) / olderTrends.length;
        const trendDirection = recentAvgExpense > olderAvgExpense ? 'increasing' : 'decreasing';

        return {
            totalIncome: Math.round(totalIncome * 100) / 100,
            totalExpense: Math.round(totalExpense * 100) / 100,
            netSavings: Math.round((totalIncome - totalExpense) * 100) / 100,
            avgMonthlyIncome: Math.round(avgIncome * 100) / 100,
            avgMonthlyExpense: Math.round(avgExpense * 100) / 100,
            avgSavingsRate: totalIncome > 0
                ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
                : 0,
            spendingTrend: trendDirection,
            periodsCovered: trends.length
        };
    }

    /**
     * Get category-wise breakdown
     */
    async getCategoryBreakdown(userId, options = {}) {
        const {
            startDate,
            endDate,
            type = 'expense',
            useCache = true
        } = options;

        const cacheParams = {
            startDate: startDate?.toString(),
            endDate: endDate?.toString(),
            type
        };

        if (useCache) {
            const cached = await AnalyticsCache.getCache(CACHE_KEYS.CATEGORY_BREAKDOWN, userId, cacheParams);
            if (cached) return cached;
        }

        const matchQuery = {
            user: new mongoose.Types.ObjectId(userId),
            type
        };

        if (startDate) matchQuery.date = { $gte: new Date(startDate) };
        if (endDate) {
            matchQuery.date = matchQuery.date || {};
            matchQuery.date.$lte = new Date(endDate);
        }

        const breakdown = await Expense.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    avgAmount: { $avg: '$amount' },
                    maxAmount: { $max: '$amount' },
                    minAmount: { $min: '$amount' }
                }
            },
            { $sort: { total: -1 } }
        ]);

        const grandTotal = breakdown.reduce((sum, cat) => sum + cat.total, 0);

        const result = {
            type,
            grandTotal: Math.round(grandTotal * 100) / 100,
            categories: breakdown.map(cat => ({
                category: cat._id,
                total: Math.round(cat.total * 100) / 100,
                percentage: Math.round((cat.total / grandTotal) * 1000) / 10,
                count: cat.count,
                avgAmount: Math.round(cat.avgAmount * 100) / 100,
                maxAmount: Math.round(cat.maxAmount * 100) / 100,
                minAmount: Math.round(cat.minAmount * 100) / 100
            })),
            topCategory: breakdown.length > 0 ? breakdown[0]._id : null
        };

        if (useCache) {
            await AnalyticsCache.setCache(CACHE_KEYS.CATEGORY_BREAKDOWN, userId, cacheParams, result, CACHE_TTL.SHORT);
        }

        return result;
    }

    /**
     * Get month-over-month comparison
     */
    async getMonthlyComparison(userId, options = {}) {
        const { months = 3, useCache = true } = options;

        if (useCache) {
            const cached = await AnalyticsCache.getCache(CACHE_KEYS.MONTHLY_COMPARISON, userId, { months });
            if (cached) return cached;
        }

        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
        
        // Optimize: Use a single aggregation to get all monthly stats instead of multiple queries in a loop
        const allStats = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" },
                        type: "$type"
                    },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        for (let i = 0; i < months; i++) {
            const { start: monthStart, end: monthEnd } = this.getMonthRange(i);
            const { start: prevMonthStart, end: prevMonthEnd } = this.getMonthRange(i + 1);

            const currentMonth = getMonthData(d.getFullYear(), d.getMonth());
            const previousMonth = getMonthData(pd.getFullYear(), pd.getMonth());

            const expenseChange = previousMonth.totalExpense > 0
                ? ((currentMonth.totalExpense - previousMonth.totalExpense) / previousMonth.totalExpense) * 100
                : 0;

            const incomeChange = previousMonth.totalIncome > 0
                ? ((currentMonth.totalIncome - previousMonth.totalIncome) / previousMonth.totalIncome) * 100
                : 0;

            comparisons.push({
                month: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
                monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                current: currentMonth,
                previous: previousMonth,
                changes: {
                    expense: Math.round(expenseChange * 10) / 10,
                    income: Math.round(incomeChange * 10) / 10,
                    expenseAmount: Math.round((currentMonth.totalExpense - previousMonth.totalExpense) * 100) / 100,
                    incomeAmount: Math.round((currentMonth.totalIncome - previousMonth.totalIncome) * 100) / 100
                }
            });
        }

        const result = { comparisons };

        if (useCache) {
            await AnalyticsCache.setCache(CACHE_KEYS.MONTHLY_COMPARISON, userId, { months }, result, CACHE_TTL.MEDIUM);
        }

        return result;
    }

    /**
     * Get stats for a specific month
     */
    async getMonthStats(userId, startDate, endDate) {
        const stats = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const income = stats.find(s => s._id === 'income');
        const expense = stats.find(s => s._id === 'expense');

        return {
            totalIncome: income?.total || 0,
            totalExpense: expense?.total || 0,
            incomeCount: income?.count || 0,
            expenseCount: expense?.count || 0,
            net: (income?.total || 0) - (expense?.total || 0),
            savingsRate: income?.total
                ? Math.round((((income?.total || 0) - (expense?.total || 0)) / income.total) * 100)
                : 0
        };
    }

    /**
     * Generate smart financial insights
     */
    async getInsights(userId, options = {}) {
        const { useCache = true } = options;

        if (useCache) {
            const cached = await AnalyticsCache.getCache(CACHE_KEYS.INSIGHTS, userId, {});
            if (cached) return cached;
        }

        const insights = [];
        const now = new Date();

        // Get last 3 months of data using aggregation for better performance
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

        const [aggregateData] = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: threeMonthsAgo }
                }
            },
            {
                $facet: {
                    byCategory: [
                        { $match: { type: 'expense' } },
                        { $group: { _id: '$category', total: { $sum: '$amount' } } }
                    ],
                    byMonth: [
                        {
                            $group: {
                                _id: {
                                    year: { $year: '$date' },
                                    month: { $month: '$date' },
                                    type: '$type'
                                },
                                total: { $sum: '$amount' }
                            }
                        }
                    ],
                    overall: [
                        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
                    ]
                }
            }
        ]);

        const totalExpense = aggregateData.overall.find(o => o._id === 'expense')?.total || 0;
        const totalIncome = aggregateData.overall.find(o => o._id === 'income')?.total || 0;
        const expenseCount = aggregateData.overall.find(o => o._id === 'expense')?.count || 0;

        if (expenseCount === 0 && totalIncome === 0) {
            return { insights: [{ type: 'info', message: 'Start adding expenses to get personalized insights!', priority: 1 }] };
        }

        // Analyze spending patterns
        const categoryTotals = {};
        aggregateData.byCategory.forEach(c => {
            categoryTotals[c._id] = c.total;
        });

        const monthlyExpenses = {};
        aggregateData.byMonth.forEach(m => {
            if (m._id.type === 'expense') {
                const monthKey = `${m._id.year}-${m._id.month - 1}`;
                monthlyExpenses[monthKey] = m.total;
            }
        });

        // Insight 1: Top spending category
        const topCategory = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])[0];

        if (topCategory) {
            const percentage = ((topCategory[1] / totalExpense) * 100).toFixed(1);
            insights.push({
                type: 'category',
                priority: 2,
                title: 'Top Spending Category',
                message: `${this.capitalizeFirst(topCategory[0])} accounts for ${percentage}% of your expenses (${this.formatCurrency(topCategory[1])})`,
                category: topCategory[0],
                amount: topCategory[1],
                suggestion: percentage > 40
                    ? 'Consider diversifying your spending or setting a budget for this category.'
                    : null
            });
        }

        // Insight 2: Savings rate
        if (totalIncome > 0) {
            const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
            let savingsInsight = {
                type: 'savings',
                priority: 1,
                title: 'Savings Rate',
                value: Math.round(savingsRate),
                income: totalIncome,
                expense: totalExpense
            };

            if (savingsRate < 0) {
                savingsInsight.message = `You're spending more than you earn! Consider reducing expenses.`;
                savingsInsight.status = 'critical';
            } else if (savingsRate < 10) {
                savingsInsight.message = `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20%.`;
                savingsInsight.status = 'warning';
            } else if (savingsRate < 20) {
                savingsInsight.message = `Good start! Your savings rate is ${savingsRate.toFixed(1)}%. Keep improving!`;
                savingsInsight.status = 'moderate';
            } else {
                savingsInsight.message = `Excellent! You're saving ${savingsRate.toFixed(1)}% of your income.`;
                savingsInsight.status = 'good';
            }

            insights.push(savingsInsight);
        }

        // Insight 3: Spending trend
        const monthKeys = Object.keys(monthlyExpenses).sort();
        if (monthKeys.length >= 2) {
            const lastMonth = monthlyExpenses[monthKeys[monthKeys.length - 1]] || 0;
            const prevMonth = monthlyExpenses[monthKeys[monthKeys.length - 2]] || 0;

            if (prevMonth > 0) {
                const change = ((lastMonth - prevMonth) / prevMonth) * 100;
                insights.push({
                    type: 'trend',
                    priority: 2,
                    title: 'Spending Trend',
                    message: change > 0
                        ? `Your spending increased by ${change.toFixed(1)}% compared to last month.`
                        : `Great! Your spending decreased by ${Math.abs(change).toFixed(1)}% compared to last month.`,
                    changePercent: Math.round(change * 10) / 10,
                    status: change > 20 ? 'warning' : change > 0 ? 'moderate' : 'good'
                });
            }
        }

        // Insight 4: Unusual expenses - fetch separately with limit to avoid fetching everything
        const avgExpense = totalExpense / expenseCount;
        const unusualExpenses = await Expense.find({
            user: userId,
            type: 'expense',
            date: { $gte: threeMonthsAgo },
            amount: { $gt: avgExpense * 3 }
        })
        .sort({ amount: -1 })
        .limit(3);

        if (unusualExpenses.length > 0) {
            insights.push({
                type: 'anomaly',
                priority: 3,
                title: 'Unusual Expenses Detected',
                message: `Found ${unusualExpenses.length} expense(s) significantly above your average.`,
                expenses: unusualExpenses.map(e => ({
                    description: e.description,
                    amount: e.amount,
                    category: e.category,
                    date: e.date
                }))
            });
        }

        // Sort by priority
        insights.sort((a, b) => a.priority - b.priority);

        const result = {
            insights,
            generatedAt: new Date(),
            periodAnalyzed: '3 months'
        };

        if (useCache) {
            await AnalyticsCache.setCache(CACHE_KEYS.INSIGHTS, userId, {}, result, CACHE_TTL.LONG);
        }

        return result;
    }

    /**
     * Get spending predictions based on historical data
     */
    async getSpendingPredictions(userId, options = {}) {
        const { useCache = true } = options;

        if (useCache) {
            const cached = await AnalyticsCache.getCache(CACHE_KEYS.PREDICTIONS, userId, {});
            if (cached) return cached;
        }

        // Get last 6 months of data for prediction
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyData = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: sixMonthsAgo },
                    type: 'expense'
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        if (monthlyData.length < 2) {
            return {
                message: 'Need at least 2 months of data for predictions',
                predictions: null
            };
        }

        // Calculate moving average for prediction
        const amounts = monthlyData.map(m => m.total);
        const movingAvg = this.calculateMovingAverage(amounts, 3);

        // Simple linear regression for trend
        const trend = this.calculateTrend(amounts);

        // Predict next month
        const lastAmount = amounts[amounts.length - 1];
        const predictedAmount = Math.max(0, lastAmount + trend);

        // Confidence based on variance
        const variance = this.calculateVariance(amounts);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const confidence = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / avgAmount) * 100));

        const result = {
            nextMonthPrediction: Math.round(predictedAmount * 100) / 100,
            confidence: Math.round(confidence),
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            trendAmount: Math.round(trend * 100) / 100,
            historicalAverage: Math.round(avgAmount * 100) / 100,
            movingAverage: Math.round(movingAvg * 100) / 100,
            basedOnMonths: monthlyData.length,
            categoryPredictions: await this.predictCategorySpending(userId, sixMonthsAgo)
        };

        if (useCache) {
            await AnalyticsCache.setCache(CACHE_KEYS.PREDICTIONS, userId, {}, result, CACHE_TTL.XLONG);
        }

        return result;
    }

    /**
     * Predict spending by category
     */
    async predictCategorySpending(userId, startDate) {
        const categoryData = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startDate },
                    type: 'expense'
                }
            },
            {
                $group: {
                    _id: '$category',
                    avgMonthly: { $avg: '$amount' },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const months = Math.ceil((new Date() - startDate) / (CACHE_TTL.SHORT * 24 * CACHE_TTL.MEDIUM * CACHE_TTL.MEDIUM * 1000));

        return categoryData.map(cat => ({
            category: cat._id,
            predictedMonthly: Math.round((cat.total / months) * 100) / 100,
            avgTransaction: Math.round(cat.avgMonthly * 100) / 100
        }));
    }

    /**
     * Get spending velocity (rate of spending)
     */
    async getSpendingVelocity(userId, options = {}) {
        const { useCache = true } = options;

        if (useCache) {
            const cached = await AnalyticsCache.getCache('velocity', userId, {});
            if (cached) return cached;
        }

        const now = new Date();
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const currentMonthExpenses = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: monthStart },
                    type: 'expense'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const spent = currentMonthExpenses[0]?.total || 0;
        const dailyRate = spent / dayOfMonth;
        const projectedMonthEnd = dailyRate * daysInMonth;

        const result = {
            currentSpent: Math.round(spent * 100) / 100,
            dailyAverage: Math.round(dailyRate * 100) / 100,
            projectedMonthEnd: Math.round(projectedMonthEnd * 100) / 100,
            dayOfMonth,
            daysRemaining: daysInMonth - dayOfMonth,
            transactionCount: currentMonthExpenses[0]?.count || 0,
            generatedAt: now
        };

        if (useCache) {
            await AnalyticsCache.setCache('velocity', userId, {}, result, 15);
        }

        return result;
    }

    /**
     * Helper: Calculate moving average
     */
    calculateMovingAverage(data, period) {
        if (data.length < period) return data[data.length - 1] || 0;
        const slice = data.slice(-period);
        return slice.reduce((a, b) => a + b, 0) / period;
    }

    /**
     * Helper: Calculate trend using linear regression
     */
    calculateTrend(data) {
        if (data.length < 2) return 0;

        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += data[i];
            sumXY += i * data[i];
            sumXX += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope || 0;
    }

    /**
     * Helper: Calculate variance
     */
    calculateVariance(data) {
        if (data.length < 2) return 0;
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    }

    /**
     * Helper: Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Invalidate user analytics cache
     */
    async invalidateCache(userId) {
        await AnalyticsCache.invalidateUserCache(userId);
    }
}

module.exports = new AnalyticsService();
