const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const advancedAnalyticsService = require('../services/advancedAnalyticsService');
const analyticsService = require('../services/analyticsService');
const budgetIntelligenceService = require('../services/budgetIntelligenceService');
const budgetService = require('../services/budgetService');
const DataWarehouse = require('../models/DataWarehouse');
const CustomDashboard = require('../models/CustomDashboard');
const FinancialHealthScore = require('../models/FinancialHealthScore');
const Budget = require('../models/Budget');

// Get data warehouse analytics
router.get('/warehouse', auth, [
  query('workspaceId').optional().isMongoId(),
  query('granularity').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('metrics').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      workspaceId,
      granularity = 'monthly',
      startDate,
      endDate,
      metrics
    } = req.query;

    const query = {
      userId: req.user.id,
      granularity
    };

    if (workspaceId) query.workspaceId = workspaceId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let projection = {};
    if (metrics) {
      const requestedMetrics = metrics.split(',');
      requestedMetrics.forEach(metric => {
        projection[`metrics.${metric}`] = 1;
        projection[`trends.${metric}`] = 1;
        projection[`kpis.${metric}`] = 1;
      });
      projection.period = 1;
      projection.granularity = 1;
    }

    const warehouseData = await DataWarehouse.find(query, projection)
      .sort({ 'period.year': -1, 'period.month': -1 })
      .limit(100);

    res.json({
      success: true,
      data: warehouseData
    });
  } catch (error) {
    console.error('Get warehouse data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get warehouse data'
    });
  }
});

// Update data warehouse for user
router.post('/warehouse/update', auth, [
  body('workspaceId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await advancedAnalyticsService.updateDataWarehouse(req.user.id, req.body.workspaceId);

    res.json({
      success: true,
      message: 'Data warehouse updated successfully'
    });
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update data warehouse'
    });
  }
});

// Get KPI dashboard
router.get('/kpis', auth, [
  query('workspaceId').optional().isMongoId(),
  query('period').optional().isString()
], async (req, res) => {
  try {
    const { workspaceId, period = 'current' } = req.query;
    
    const query = {
      userId: req.user.id,
      granularity: 'monthly'
    };

    if (workspaceId) query.workspaceId = workspaceId;

    if (period === 'current') {
      const now = new Date();
      query['period.year'] = now.getFullYear();
      query['period.month'] = now.getMonth() + 1;
    }

    const warehouseData = await DataWarehouse.findOne(query);
    
    if (!warehouseData) {
      // Update warehouse if no data exists
      await advancedAnalyticsService.updateDataWarehouse(req.user.id, workspaceId);
      const updatedData = await DataWarehouse.findOne(query);
      
      return res.json({
        success: true,
        data: updatedData?.kpis || {}
      });
    }

    res.json({
      success: true,
      data: warehouseData.kpis
    });
  } catch (error) {
    console.error('Get KPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KPIs'
    });
  }
});

// Get predictive analytics
router.get('/predictions', auth, [
  query('workspaceId').optional().isMongoId(),
  query('type').optional().isIn(['expense_forecast', 'income_forecast', 'budget_forecast']),
  query('periods').optional().isInt({ min: 1, max: 12 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      workspaceId,
      type = 'expense_forecast',
      periods = 3
    } = req.query;

    let predictions;
    switch (type) {
      case 'expense_forecast':
        predictions = await advancedAnalyticsService.forecastExpenses(req.user.id, workspaceId, periods);
        break;
      case 'income_forecast':
        predictions = await advancedAnalyticsService.forecastIncome(req.user.id, workspaceId, periods);
        break;
      case 'budget_forecast':
        predictions = await advancedAnalyticsService.forecastBudget(req.user.id, workspaceId, periods);
        break;
      default:
        predictions = await advancedAnalyticsService.forecastExpenses(req.user.id, workspaceId, periods);
    }

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get predictions'
    });
  }
});

// Get financial health score
router.get('/health-score', auth, [
  query('workspaceId').optional().isMongoId()
], async (req, res) => {
  try {
    const healthScore = await advancedAnalyticsService.calculateFinancialHealthScore(
      req.user.id,
      req.query.workspaceId
    );

    res.json({
      success: true,
      data: healthScore
    });
  } catch (error) {
    console.error('Get health score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial health score'
    });
  }
});

// Create custom dashboard
router.post('/dashboards', auth, [
  body('name').notEmpty().isString().trim().isLength({ max: 100 }),
  body('description').optional().isString().trim().isLength({ max: 500 }),
  body('workspaceId').optional().isMongoId(),
  body('widgets').isArray(),
  body('layout').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dashboard = await CustomDashboard.create({
      userId: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Create dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dashboard'
    });
  }
});

// Get user dashboards
router.get('/dashboards', auth, [
  query('workspaceId').optional().isMongoId(),
  query('isTemplate').optional().isBoolean()
], async (req, res) => {
  try {
    const query = { userId: req.user.id };
    
    if (req.query.workspaceId) query.workspaceId = req.query.workspaceId;
    if (req.query.isTemplate !== undefined) query.isTemplate = req.query.isTemplate === 'true';

    const dashboards = await CustomDashboard.find(query)
      .sort({ lastAccessed: -1, createdAt: -1 });

    res.json({
      success: true,
      data: dashboards
    });
  } catch (error) {
    console.error('Get dashboards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboards'
    });
  }
});

// Update dashboard
router.put('/dashboards/:dashboardId', auth, [
  body('name').optional().isString().trim().isLength({ max: 100 }),
  body('description').optional().isString().trim().isLength({ max: 500 }),
  body('widgets').optional().isArray(),
  body('layout').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dashboard = await CustomDashboard.findOneAndUpdate(
      { _id: req.params.dashboardId, userId: req.user.id },
      { ...req.body, lastAccessed: new Date() },
      { new: true }
    );

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Update dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dashboard'
    });
  }
});

// Delete dashboard
router.delete('/dashboards/:dashboardId', auth, async (req, res) => {
  try {
    const dashboard = await CustomDashboard.findOneAndDelete({
      _id: req.params.dashboardId,
      userId: req.user.id
    });

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    res.json({
      success: true,
      message: 'Dashboard deleted successfully'
    });
  } catch (error) {
    console.error('Delete dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete dashboard'
    });
  }
});

// Get dashboard data for widgets
router.get('/dashboards/:dashboardId/data', auth, async (req, res) => {
  try {
    const dashboard = await CustomDashboard.findOne({
      _id: req.params.dashboardId,
      userId: req.user.id
    });

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    const widgetData = {};
    
    for (const widget of dashboard.widgets) {
      try {
        widgetData[widget.id] = await this.getWidgetData(widget, req.user.id, dashboard.workspaceId);
      } catch (error) {
        console.error(`Failed to get data for widget ${widget.id}:`, error);
        widgetData[widget.id] = { error: 'Failed to load data' };
      }
    }

    // Update last accessed
    dashboard.lastAccessed = new Date();
    await dashboard.save();

    res.json({
      success: true,
      data: widgetData
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
});

// Get analytics insights
router.get('/insights', auth, [
  query('workspaceId').optional().isMongoId(),
  query('type').optional().isIn(['anomalies', 'trends', 'recommendations', 'all'])
], async (req, res) => {
  try {
    const { workspaceId, type = 'all' } = req.query;
    
    const query = {
      userId: req.user.id,
      granularity: 'monthly'
    };

    if (workspaceId) query.workspaceId = workspaceId;

    const recentData = await DataWarehouse.find(query)
      .sort({ 'period.year': -1, 'period.month': -1 })
      .limit(3);

    const insights = {
      anomalies: [],
      trends: [],
      recommendations: []
    };

    recentData.forEach(data => {
      if (data.anomalies) insights.anomalies.push(...data.anomalies);
      if (data.trends) insights.trends.push(data.trends);
    });

    // Get financial health insights
    const healthScore = await FinancialHealthScore.findOne({
      userId: req.user.id,
      workspaceId
    }).sort({ createdAt: -1 });

    if (healthScore && healthScore.insights) {
      insights.recommendations.push(...healthScore.insights);
    }

    const result = type === 'all' ? insights : { [type]: insights[type] };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get insights'
    });
  }
});

// Export analytics data
router.post('/export', auth, [
  body('type').isIn(['warehouse', 'kpis', 'predictions', 'health_score']),
  body('format').isIn(['json', 'csv', 'excel']),
  body('dateRange').optional().isObject(),
  body('workspaceId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, format, dateRange, workspaceId } = req.body;
    
    let data;
    let filename;

    switch (type) {
      case 'warehouse':
        data = await DataWarehouse.find({
          userId: req.user.id,
          workspaceId,
          ...(dateRange && {
            createdAt: {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end)
            }
          })
        });
        filename = `warehouse-data-${Date.now()}`;
        break;
      case 'health_score':
        data = await FinancialHealthScore.find({
          userId: req.user.id,
          workspaceId
        });
        filename = `health-scores-${Date.now()}`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    let exportData;
    let contentType;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        filename += '.json';
        break;
      case 'csv':
        exportData = this.convertToCSV(data);
        contentType = 'text/csv';
        filename += '.csv';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export format'
        });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
    });
  }
});

// ============================================
// AI-DRIVEN BUDGET INTELLIGENCE ROUTES
// Z-Score Anomaly Detection & Self-Healing
// ============================================

// Get Z-Score based anomaly analysis
router.get('/intelligence/anomalies', auth, [
  query('months').optional().isInt({ min: 1, max: 12 }),
  query('threshold').optional().isFloat({ min: 1, max: 4 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { months = 6, threshold = 2.0 } = req.query;

    const anomalies = await analyticsService.getZScoreAnomalies(req.user.id, {
      months: parseInt(months),
      threshold: parseFloat(threshold)
    });

    res.json({
      success: true,
      data: anomalies
    });
  } catch (error) {
    console.error('Get anomalies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get anomaly analysis'
    });
  }
});

// Get spending volatility analysis
router.get('/intelligence/volatility', auth, [
  query('months').optional().isInt({ min: 1, max: 12 })
], async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const volatility = await analyticsService.getVolatilityAnalysis(req.user.id, {
      months: parseInt(months)
    });

    res.json({
      success: true,
      data: volatility
    });
  } catch (error) {
    console.error('Get volatility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get volatility analysis'
    });
  }
});

// Get comprehensive intelligence dashboard
router.get('/intelligence/dashboard', auth, async (req, res) => {
  try {
    const dashboard = await budgetIntelligenceService.getIntelligenceDashboard(req.user.id);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Get intelligence dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get intelligence dashboard'
    });
  }
});

// Update budget intelligence statistics
router.post('/intelligence/update', auth, async (req, res) => {
  try {
    // Sync spending history first
    await budgetIntelligenceService.syncSpendingHistory(req.user.id);
    
    // Update intelligence
    const result = await budgetIntelligenceService.updateBudgetIntelligence(req.user.id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Update intelligence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget intelligence'
    });
  }
});

// Analyze a specific transaction for anomaly
router.post('/intelligence/analyze-transaction', auth, [
  body('amount').isFloat({ min: 0.01 }),
  body('category').notEmpty().isString(),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, category, description } = req.body;

    const analysis = await budgetIntelligenceService.analyzeTransaction(req.user.id, {
      amount: parseFloat(amount),
      category,
      description: description || 'Manual analysis'
    });

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Analyze transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze transaction'
    });
  }
});

// Get reallocation suggestions
router.get('/intelligence/reallocations', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ 
      user: req.user.id, 
      isActive: true 
    });

    const suggestions = [];
    
    for (const budget of budgets) {
      const pending = budget.intelligence.reallocations.filter(r => r.status === 'pending');
      pending.forEach(suggestion => {
        suggestions.push({
          ...suggestion,
          fromBudgetId: budget._id,
          fromCategory: budget.category,
          fromBudgetName: budget.name,
          fromBudgetSurplus: budget.surplus
        });
      });
    }

    // Sort by suggested amount (highest first)
    suggestions.sort((a, b) => b.suggestedAmount - a.suggestedAmount);

    res.json({
      success: true,
      data: {
        suggestions,
        totalPending: suggestions.length
      }
    });
  } catch (error) {
    console.error('Get reallocations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reallocation suggestions'
    });
  }
});

// Generate reallocation suggestions for a specific deficit
router.post('/intelligence/reallocations/generate', auth, [
  body('category').notEmpty().isString(),
  body('deficitAmount').isFloat({ min: 0.01 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, deficitAmount } = req.body;

    const suggestions = await budgetIntelligenceService.generateReallocationSuggestions(
      req.user.id,
      category,
      parseFloat(deficitAmount)
    );

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Generate reallocations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reallocation suggestions'
    });
  }
});

// Apply a reallocation (move funds between budgets)
router.post('/intelligence/reallocations/apply', auth, [
  body('fromBudgetId').isMongoId(),
  body('toBudgetId').isMongoId(),
  body('amount').isFloat({ min: 0.01 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fromBudgetId, toBudgetId, amount } = req.body;

    const result = await budgetIntelligenceService.applyReallocation(
      req.user.id,
      fromBudgetId,
      toBudgetId,
      parseFloat(amount)
    );

    res.json({
      success: true,
      data: result,
      message: 'Funds reallocated successfully'
    });
  } catch (error) {
    console.error('Apply reallocation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to apply reallocation'
    });
  }
});

// Reject a reallocation suggestion
router.post('/intelligence/reallocations/reject', auth, [
  body('budgetId').isMongoId(),
  body('toCategory').notEmpty().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { budgetId, toCategory } = req.body;

    const budget = await Budget.findOne({
      _id: budgetId,
      user: req.user.id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    const suggestion = budget.intelligence.reallocations.find(
      r => r.toCategory === toCategory && r.status === 'pending'
    );

    if (suggestion) {
      suggestion.status = 'rejected';
      await budget.save();
    }

    res.json({
      success: true,
      message: 'Reallocation suggestion rejected'
    });
  } catch (error) {
    console.error('Reject reallocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject reallocation'
    });
  }
});

// Batch analyze recent transactions for anomalies
router.post('/intelligence/batch-analyze', auth, [
  body('since').optional().isISO8601()
], async (req, res) => {
  try {
    const { since } = req.body;

    const results = await budgetIntelligenceService.batchAnalyzeTransactions(
      req.user.id,
      since ? new Date(since) : null
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Batch analyze error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch analyze transactions'
    });
  }
});

// Get budgets with intelligence data
router.get('/intelligence/budgets', auth, async (req, res) => {
  try {
    const budgets = await budgetService.getBudgetsWithIntelligence(req.user.id);

    res.json({
      success: true,
      data: budgets
    });
  } catch (error) {
    console.error('Get budgets with intelligence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get budgets with intelligence'
    });
  }
});

// Get budget alerts including AI-driven alerts
router.get('/intelligence/alerts', auth, async (req, res) => {
  try {
    const alerts = await budgetService.checkBudgetAlerts(req.user.id);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get budget alerts'
    });
  }
});

// Recalculate all budgets and update intelligence
router.post('/intelligence/recalculate', auth, async (req, res) => {
  try {
    const result = await budgetService.recalculateBudgets(req.user.id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Recalculate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate budgets'
    });
  }
});

module.exports = router;