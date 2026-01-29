const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const advancedAnalyticsService = require('../services/advancedAnalyticsService');
const gamificationService = require('../services/scoreService');
const DataWarehouse = require('../models/DataWarehouse');
const CustomDashboard = require('../models/CustomDashboard');
const FinancialHealthScore = require('../models/FinancialHealthScore');

// ========================
// Gamification & Health Score Routes (Issue #421)
// ========================

/**
 * GET /api/analytics/gamification/health-score
 * Calculate and return complete Financial Health Score
 */
router.get('/gamification/health-score', auth, [
  query('workspaceId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const healthScore = await gamificationService.calculateHealthScore(
      req.user.id,
      req.query.workspaceId
    );

    res.json({
      success: true,
      data: healthScore
    });
  } catch (error) {
    console.error('Get gamification health score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate financial health score'
    });
  }
});

/**
 * GET /api/analytics/gamification/profile
 * Get user's gamification profile (level, XP, badges)
 */
router.get('/gamification/profile', auth, async (req, res) => {
  try {
    const profile = await gamificationService.getUserGamificationProfile(req.user.id);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get gamification profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gamification profile'
    });
  }
});

/**
 * GET /api/analytics/gamification/badges
 * Get all available badges with user's progress
 */
router.get('/gamification/badges', auth, async (req, res) => {
  try {
    const badges = await gamificationService.getAllBadges(req.user.id);

    res.json({
      success: true,
      data: badges
    });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get badges'
    });
  }
});

/**
 * GET /api/analytics/gamification/leaderboard
 * Get community leaderboard
 */
router.get('/gamification/leaderboard', auth, [
  query('limit').optional().isInt({ min: 5, max: 50 }),
  query('type').optional().isIn(['points', 'health'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type || 'points';

    const leaderboard = await gamificationService.getLeaderboard(limit, type);

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard'
    });
  }
});

/**
 * PUT /api/analytics/gamification/financial-profile
 * Update user's financial profile for score calculation
 */
router.put('/gamification/financial-profile', auth, [
  body('monthlyIncome').optional().isFloat({ min: 0 }),
  body('monthlyDebtPayment').optional().isFloat({ min: 0 }),
  body('emergencyFundTarget').optional().isFloat({ min: 0 }),
  body('emergencyFundCurrent').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const profile = await gamificationService.updateFinancialProfile(req.user.id, req.body);

    res.json({
      success: true,
      message: 'Financial profile updated',
      data: profile
    });
  } catch (error) {
    console.error('Update financial profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update financial profile'
    });
  }
});

/**
 * POST /api/analytics/gamification/recalculate
 * Force recalculation of health score
 */
router.post('/gamification/recalculate', auth, [
  body('workspaceId').optional().isMongoId()
], async (req, res) => {
  try {
    const healthScore = await gamificationService.calculateHealthScore(
      req.user.id,
      req.body.workspaceId
    );

    res.json({
      success: true,
      message: 'Health score recalculated',
      data: healthScore
    });
  } catch (error) {
    console.error('Recalculate health score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate health score'
    });
  }
});

// ========================
// Existing Analytics Routes
// ========================

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

module.exports = router;