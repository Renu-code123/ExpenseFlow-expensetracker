const Expense = require('../models/Expense');
const RecurringExpense = require('../models/RecurringExpense');
const Goal = require('../models/Goal');
const mongoose = require('mongoose');

class ForecastingService {
    /**
     * Get detailed cash flow forecast for the next 30 days
     */
    async getForecast(userId) {
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const daysInMonth = endOfMonth.getDate();
        const currentDay = now.getDate();
        const remainingDays = Math.max(1, daysInMonth - currentDay + 1);

        // 1. Get current balance (simplified calculation)
        const balanceData = await Expense.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
                    expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
                }
            }
        ]);

        const currentBalance = balanceData.length > 0 ? (balanceData[0].income - balanceData[0].expense) : 0;

        // 2. Get upcoming recurring expenses for the rest of the month
        const upcomingRecurring = await RecurringExpense.find({
            user: userId,
            isActive: true,
            isPaused: false,
            nextDueDate: { $gte: now, $lte: endOfMonth }
        });

        const totalUpcomingRecurring = upcomingRecurring.reduce((sum, item) => {
            return item.type === 'expense' ? sum + item.amount : sum - item.amount;
        }, 0);

        // 3. Get monthly goal allocations
        const activeGoals = await Goal.find({
            user: userId,
            status: 'active',
            targetDate: { $gt: now }
        });

        const monthlyGoalTargets = activeGoals.reduce((sum, goal) => {
            const monthsLeft = Math.max(1, (goal.targetDate.getFullYear() - now.getFullYear()) * 12 + (goal.targetDate.getMonth() - now.getMonth()));
            const monthlyTarget = (goal.targetAmount - goal.currentAmount) / monthsLeft;
            return sum + Math.max(0, monthlyTarget);
        }, 0);

        // 4. Calculate Safe-to-Spend
        // (Current Balance - Total Future Recurring Expenses - Pro-rated Goal Targets)
        const totalCommitments = totalUpcomingRecurring + monthlyGoalTargets;
        const safeToSpendTotal = Math.max(0, currentBalance - totalCommitments);
        const safeToSpendDaily = safeToSpendTotal / remainingDays;

        // 5. Generate daily projection data for the next 30 days
        const projectionData = await this.generateProjection(userId, currentBalance, upcomingRecurring, activeGoals);

        // 6. Anomaly Detection (recent vs historical average)
        const anomalies = await this.detectAnomalies(userId);

        return {
            safeToSpend: {
                daily: Math.round(safeToSpendDaily * 100) / 100,
                total: Math.round(safeToSpendTotal * 100) / 100,
                remainingDays,
                commitments: {
                    recurring: Math.round(totalUpcomingRecurring * 100) / 100,
                    goals: Math.round(monthlyGoalTargets * 100) / 100
                }
            },
            projection: projectionData,
            anomalies,
            currentBalance: Math.round(currentBalance * 100) / 100,
            generatedAt: now
        };
    }

    /**
     * Generate daily balance projection for next 30 days
     */
    async generateProjection(userId, startBalance, recurring, goals) {
        const projection = [];
        let runningBalance = startBalance;
        const now = new Date();

        // Get average daily spending from last 90 days to include in projection
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

        const historicalStats = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: threeMonthsAgo },
                    type: 'expense'
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const avgDailySpend = historicalStats.length > 0 ? (historicalStats[0].total / 90) : 0;

        for (let i = 0; i <= 30; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() + i);
            date.setHours(0, 0, 0, 0);

            // Subtract average daily spend
            if (i > 0) runningBalance -= avgDailySpend;

            // Apply recurring items that fall on this day
            recurring.forEach(item => {
                const itemDate = new Date(item.nextDueDate);
                itemDate.setHours(0, 0, 0, 0);
                if (itemDate.getTime() === date.getTime()) {
                    runningBalance += (item.type === 'income' ? item.amount : -item.amount);
                }
            });

            projection.push({
                date: date.toISOString().split('T')[0],
                balance: Math.round(runningBalance * 100) / 100,
                isPredicted: i > 0
            });
        }

        return projection;
    }

    /**
     * Detect spending anomalies
     */
    async detectAnomalies(userId) {
        const anomalies = [];
        const now = new Date();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

        // 1. Get spending by category for the current week
        const currentWeekSpending = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    type: 'expense',
                    date: { $gte: startOfWeek }
                }
            },
            { $group: { _id: '$category', total: { $sum: '$amount' } } }
        ]);

        // 2. Get average weekly spending by category (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const historicalSpending = await Expense.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    type: 'expense',
                    date: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        category: '$category',
                        week: { $week: '$date' },
                        year: { $year: '$date' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.category',
                    avgWeekly: { $avg: '$total' }
                }
            }
        ]);

        // 3. Compare and flag anomalies (> 20% increase)
        currentWeekSpending.forEach(current => {
            const historical = historicalSpending.find(h => h._id === current._id);
            if (historical && historical.avgWeekly > 0) {
                const increase = ((current.total - historical.avgWeekly) / historical.avgWeekly) * 100;
                if (increase > 20) {
                    anomalies.push({
                        category: current._id,
                        currentAmount: Math.round(current.total * 100) / 100,
                        avgAmount: Math.round(historical.avgWeekly * 100) / 100,
                        increasePercent: Math.round(increase * 10) / 10,
                        message: `Spending in ${current._id} is ${Math.round(increase)}% higher than your weekly average.`
                    });
                }
            }
        });

        return anomalies;
    }
}

module.exports = new ForecastingService();
