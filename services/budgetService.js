const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const Expense = require('../models/Expense');
const emailService = require('./emailService');

class BudgetService {
  
  // Calculate spent amount for budget
  async calculateBudgetSpent(budget) {
    const query = {
      user: budget.user,
      type: 'expense',
      date: {
        $gte: budget.startDate,
        $lte: budget.endDate
      }
    };

    if (budget.category !== 'all') {
      query.category = budget.category;
    }

    const expenses = await Expense.find(query);
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Update budget spent amount
    budget.spent = totalSpent;
    budget.lastCalculated = new Date();
    await budget.save();

    return totalSpent;
  }

  // Check budget alerts
  async checkBudgetAlerts(userId) {
    const activeBudgets = await Budget.find({ 
      user: userId, 
      isActive: true,
      endDate: { $gte: new Date() }
    });

    const alerts = [];

    for (const budget of activeBudgets) {
      await this.calculateBudgetSpent(budget);
      
      const spentPercentage = (budget.spent / budget.amount) * 100;
      
      if (spentPercentage >= budget.alertThreshold) {
        alerts.push({
          budgetId: budget._id,
          budgetName: budget.name,
          category: budget.category,
          spent: budget.spent,
          amount: budget.amount,
          percentage: spentPercentage,
          isOverBudget: spentPercentage > 100
        });

        // Send email alert if over threshold
        try {
          const user = await require('../models/User').findById(userId);
          await emailService.sendBudgetAlert(user, budget.category, budget.spent, budget.amount);
        } catch (error) {
          console.error('Budget alert email failed:', error);
        }
      }
    }

    return alerts;
  }

  // Update goal progress
  async updateGoalProgress(userId, amount, category = null) {
    const activeGoals = await Goal.find({ 
      user: userId, 
      status: 'active' 
    });

    for (const goal of activeGoals) {
      if (goal.goalType === 'savings' && amount > 0) {
        goal.currentAmount += amount;
      } else if (goal.goalType === 'expense_reduction' && amount < 0 && 
                 (goal.category === 'general' || goal.category === category)) {
        // Track expense reduction
        const reduction = Math.abs(amount);
        goal.currentAmount += reduction;
      }

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
    }
  }

  // Get budget summary
  async getBudgetSummary(userId, period = 'monthly') {
    const now = new Date();
    let startDate, endDate;

    if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }

    const budgets = await Budget.find({
      user: userId,
      isActive: true,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });

    const summary = {
      totalBudget: 0,
      totalSpent: 0,
      budgetCount: budgets.length,
      categories: {}
    };

    for (const budget of budgets) {
      await this.calculateBudgetSpent(budget);
      
      summary.totalBudget += budget.amount;
      summary.totalSpent += budget.spent;
      
      summary.categories[budget.category] = {
        budgeted: budget.amount,
        spent: budget.spent,
        remaining: budget.amount - budget.spent,
        percentage: (budget.spent / budget.amount) * 100
      };
    }

    summary.remainingBudget = summary.totalBudget - summary.totalSpent;
    summary.overallPercentage = (summary.totalSpent / summary.totalBudget) * 100;

    return summary;
  }

  // Get goals summary
  async getGoalsSummary(userId) {
    const goals = await Goal.find({ user: userId });
    
    const summary = {
      total: goals.length,
      active: goals.filter(g => g.status === 'active').length,
      completed: goals.filter(g => g.status === 'completed').length,
      overdue: goals.filter(g => g.isOverdue).length,
      totalTargetAmount: goals.reduce((sum, g) => sum + g.targetAmount, 0),
      totalCurrentAmount: goals.reduce((sum, g) => sum + g.currentAmount, 0)
    };

    summary.overallProgress = summary.totalTargetAmount > 0 ? 
      (summary.totalCurrentAmount / summary.totalTargetAmount) * 100 : 0;

    return summary;
  }

  // Create monthly budgets automatically
  async createMonthlyBudgets(userId, budgetData) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budgets = [];

    for (const [category, amount] of Object.entries(budgetData)) {
      const budget = new Budget({
        user: userId,
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Budget - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        category,
        amount,
        period: 'monthly',
        startDate,
        endDate
      });

      budgets.push(await budget.save());
    }

    return budgets;
  }
}

module.exports = new BudgetService();