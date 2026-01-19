# ExpenseFlow Budget Management & Goals System

## Features Implemented

### 💰 Budget Management System
- Monthly/category-wise budget limits
- Real-time budget tracking and calculations
- Budget vs actual spending comparison
- Automated overspending alerts
- Budget progress visualization

### 🎯 Financial Goals System
- Savings targets and financial goals
- Goal progress tracking with milestones
- Multiple goal types (savings, expense reduction, income increase, debt payoff)
- Goal completion notifications
- Priority-based goal management

## New Files Created

### Backend Files:
1. **`models/Budget.js`** - Budget model with category and period support
2. **`models/Goal.js`** - Financial goals model with progress tracking
3. **`services/budgetService.js`** - Budget calculations and alert management
4. **`routes/budgets.js`** - Budget CRUD operations and summary APIs
5. **`routes/goals.js`** - Goals management and progress tracking APIs

### Frontend Files:
1. **`budget-goals.js`** - Complete budget and goals dashboard UI

### Updated Files:
1. **`routes/expenses.js`** - Integrated budget tracking with expense operations
2. **`server.js`** - Added budget and goals routes

## Key Features

### ✅ Budget Management
- **Category Budgets** - Set limits for food, transport, entertainment, etc.
- **Period Support** - Monthly, weekly, yearly budget cycles
- **Alert Thresholds** - Customizable warning levels (default 80%)
- **Real-time Tracking** - Automatic spent amount calculations
- **Overspending Alerts** - Email notifications when limits exceeded
- **Budget Summary** - Dashboard with total budget vs spent analysis

### ✅ Goals System
- **Multiple Goal Types**:
  - 💰 Savings Target
  - 📉 Expense Reduction
  - 📈 Income Increase
  - 💳 Debt Payoff
- **Progress Tracking** - Visual progress bars and percentages
- **Milestones** - Set intermediate targets with achievement tracking
- **Priority Levels** - Low, medium, high priority classification
- **Status Management** - Active, completed, paused, cancelled states

### ✅ Smart Integration
- **Automatic Updates** - Budget and goal progress update with each expense
- **Real-time Alerts** - Instant notifications for budget breaches
- **Email Notifications** - Budget alerts sent via email system
- **Dashboard Analytics** - Comprehensive overview of financial health

## API Endpoints

### Budget Routes:
- **POST /api/budgets** - Create new budget
- **GET /api/budgets** - Get all user budgets
- **GET /api/budgets/summary** - Get budget summary and analytics
- **GET /api/budgets/alerts** - Get current budget alerts
- **PUT /api/budgets/:id** - Update budget
- **DELETE /api/budgets/:id** - Delete budget
- **POST /api/budgets/monthly** - Create monthly budgets for all categories

### Goals Routes:
- **POST /api/goals** - Create new goal
- **GET /api/goals** - Get all user goals
- **GET /api/goals/summary** - Get goals summary and progress
- **PATCH /api/goals/:id/progress** - Update goal progress
- **PUT /api/goals/:id** - Update goal details
- **PATCH /api/goals/:id/status** - Update goal status
- **DELETE /api/goals/:id** - Delete goal

## Usage Examples

### Create Monthly Budget:
```javascript
const budgetData = {
  name: "Food Budget - January 2024",
  category: "food",
  amount: 10000,
  period: "monthly",
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  alertThreshold: 80
};
```

### Create Savings Goal:
```javascript
const goalData = {
  title: "Emergency Fund",
  description: "Build 6 months emergency fund",
  targetAmount: 300000,
  goalType: "savings",
  targetDate: "2024-12-31",
  priority: "high"
};
```

### Budget Summary Response:
```javascript
{
  totalBudget: 50000,
  totalSpent: 32000,
  remainingBudget: 18000,
  overallPercentage: 64,
  categories: {
    food: { budgeted: 10000, spent: 8500, remaining: 1500, percentage: 85 },
    transport: { budgeted: 5000, spent: 3200, remaining: 1800, percentage: 64 }
  }
}
```

## Frontend Dashboard

### Budget & Goals Dashboard Features:
- **Visual Overview** - Cards showing budget and goals summaries
- **Progress Bars** - Visual representation of budget usage and goal progress
- **Alert System** - Color-coded warnings for budget overruns
- **Quick Actions** - Easy budget and goal creation modals
- **Real-time Updates** - Live data refresh with expense changes

### Dashboard Components:
1. **Summary Cards** - Total budget, spent, remaining amounts
2. **Budget List** - All active budgets with progress indicators
3. **Goals List** - Active goals with completion percentages
4. **Alerts Section** - Budget warnings and overspending notifications
5. **Creation Modals** - Forms for adding new budgets and goals

## Automated Features

### Budget Tracking:
- **Expense Integration** - Every expense automatically updates relevant budgets
- **Alert Checking** - Real-time budget threshold monitoring
- **Email Notifications** - Automatic alerts when budgets exceed thresholds
- **Progress Calculation** - Live budget usage percentage updates

### Goal Progress:
- **Automatic Updates** - Goals progress with income/expense changes
- **Milestone Tracking** - Achievement notifications for intermediate targets
- **Completion Detection** - Automatic status change when goals achieved
- **Progress Analytics** - Overall goal completion percentage

## Benefits

💰 **Financial Control** - Set and track spending limits across categories  
🎯 **Goal Achievement** - Structured approach to financial objectives  
⚠️ **Proactive Alerts** - Early warnings prevent overspending  
📊 **Visual Analytics** - Clear progress visualization and insights  
🔄 **Automated Tracking** - Seamless integration with expense management  
📧 **Smart Notifications** - Email alerts for important budget events  

The Budget Management & Goals system transforms ExpenseFlow into a comprehensive financial planning platform with intelligent tracking and goal-oriented money management.

**Resolves: #49**