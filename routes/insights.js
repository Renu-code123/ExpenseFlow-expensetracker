const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiInsightsService = require('../services/aiInsightsService');
const FinancialInsight = require('../models/FinancialInsight');
const { validateRequest, insightsSchemas } = require('../middleware/insightsValidator');

/**
 * @route   GET /api/insights/dashboard
 * @desc    Get comprehensive AI insights dashboard
 * @access  Private
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    const dashboard = await aiInsightsService.getComprehensiveDashboard(req.user.id);
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insights dashboard',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insights/forecast
 * @desc    Get ML-based expense forecast
 * @access  Private
 */
router.get('/forecast', auth, validateRequest(insightsSchemas.forecast, 'query'), async (req, res) => {
  try {
    const { months = 3, useCache = 'true' } = req.query;
    const forecast = await aiInsightsService.generateForecast(req.user.id, {
      months: parseInt(months),
      useCache: useCache === 'true'
    });
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating forecast',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insights/anomalies
 * @desc    Detect anomalous transactions
 * @access  Private
 */
router.get('/anomalies', auth, validateRequest(insightsSchemas.anomalies, 'query'), async (req, res) => {
  try {
    const { days = 90, sensitivity = 2, useCache = 'true' } = req.query;
    const anomalies = await aiInsightsService.detectAnomalies(req.user.id, {
      days: parseInt(days),
      sensitivity: parseFloat(sensitivity),
      useCache: useCache === 'true'
    });
    res.json({
      success: true,
      data: anomalies
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error detecting anomalies',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insights/health-score
 * @desc    Calculate financial health score
 * @access  Private
 */
router.get('/health-score', auth, async (req, res) => {
  try {
    const { useCache = 'true' } = req.query;
    const healthScore = await aiInsightsService.calculateHealthScore(req.user.id, {
      useCache: useCache === 'true'
    });
    res.json({
      success: true,
      data: healthScore
    });
  } catch (error) {
    console.error('Health score error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating health score',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insights/recommendations
 * @desc    Get AI-powered savings recommendations
 * @access  Private
 */
router.get('/recommendations', auth, async (req, res) => {
  try {
    const { useCache = 'true' } = req.query;
    const recommendations = await aiInsightsService.generateRecommendations(req.user.id, {
      useCache: useCache === 'true'
    });
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insights/trends
 * @desc    Analyze spending trends and seasonal patterns
 * @access  Private
 */
router.get('/trends', auth, async (req, res) => {
  try {
    const { useCache = 'true' } = req.query;
    const trends = await aiInsightsService.analyzeTrends(req.user.id, {
      useCache: useCache === 'true'
    });
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing trends',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insights/budget-optimization
 * @desc    Get budget optimization suggestions
 * @access  Private
 */
router.get('/budget-optimization', auth, validateRequest(insightsSchemas.budgetOptimization, 'query'), async (req, res) => {
  try {
    const { targetSavingsRate = 20, useCache = 'true' } = req.query;
    const optimization = await aiInsightsService.optimizeBudgets(req.user.id, {
      targetSavingsRate: parseInt(targetSavingsRate),
      useCache: useCache === 'true'
    });
    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Budget optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing budgets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insights/stored
 * @desc    Get stored insights for the user
 * @access  Private
 */
router.get('/stored', auth, validateRequest(insightsSchemas.storedInsights, 'query'), async (req, res) => {
  try {
    const { type, limit = 20, includeExpired = 'false', page = 1 } = req.query;
    
    const query = { user: req.user.id };
    
    if (type) {
      query.type = type;
    }
    
    if (includeExpired !== 'true') {
      query.$or = [
        { validUntil: { $gt: new Date() } },
        { validUntil: null }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [insights, total] = await Promise.all([
      FinancialInsight.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FinancialInsight.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        insights,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Stored insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stored insights',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insights/:id
 * @desc    Get a specific insight by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const insight = await FinancialInsight.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }

    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Get insight error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching insight',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/insights/:id/read
 * @desc    Mark an insight as read
 * @access  Private
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const insight = await FinancialInsight.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }

    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking insight as read',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/insights/:id/dismiss
 * @desc    Dismiss an insight
 * @access  Private
 */
router.put('/:id/dismiss', auth, async (req, res) => {
  try {
    const insight = await FinancialInsight.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isDismissed: true },
      { new: true }
    );

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }

    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Dismiss error:', error);
    res.status(500).json({
      success: false,
      message: 'Error dismissing insight',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/insights/:id/action
 * @desc    Mark an insight as actioned
 * @access  Private
 */
router.put('/:id/action', auth, async (req, res) => {
  try {
    const insight = await FinancialInsight.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isActioned: true, actionedAt: new Date() },
      { new: true }
    );

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }

    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Action error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking insight as actioned',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/insights/:id
 * @desc    Delete an insight
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const insight = await FinancialInsight.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found'
      });
    }

    res.json({
      success: true,
      message: 'Insight deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting insight',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/insights/refresh
 * @desc    Force refresh all insights (clears cache)
 * @access  Private
 */
router.post('/refresh', auth, async (req, res) => {
  try {
    const [forecast, healthScore, recommendations, trends] = await Promise.all([
      aiInsightsService.generateForecast(req.user.id, { useCache: false }),
      aiInsightsService.calculateHealthScore(req.user.id, { useCache: false }),
      aiInsightsService.generateRecommendations(req.user.id, { useCache: false }),
      aiInsightsService.analyzeTrends(req.user.id, { useCache: false })
    ]);

    res.json({
      success: true,
      message: 'Insights refreshed successfully',
      data: {
        forecast: forecast.success,
        healthScore: healthScore.score,
        recommendations: recommendations.recommendations?.length || 0,
        trends: trends.overallTrend?.direction
      }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing insights',
      error: error.message
    });
  }
});

module.exports = router;
