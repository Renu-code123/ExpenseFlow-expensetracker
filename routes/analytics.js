const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    validateTrends,
    validateCategory,
    validateComparison,
    checkAnalyticsAvailable
} = require('../middleware/analyticsValidator');
const analyticsService = require('../services/analyticsService');
const forecastingService = require('../services/forecastingService');

/**
 * @route   GET /api/analytics/forecast
 * @desc    Get predictive cash flow and safe-to-spend forecast
 * @access  Private
 */
router.get('/forecast', auth, checkAnalyticsAvailable, async (req, res) => {
    try {
        const forecast = await forecastingService.getForecast(req.user._id);

        res.json({
            success: true,
            data: forecast
        });
    } catch (error) {
        console.error('[Analytics] Forecast error:', error);
        res.status(500).json({ error: 'Failed to generate financial forecast' });
    }
});

/**
 * @route   GET /api/analytics/spending-trends
 * @desc    Get spending trends over time(daily, weekly, monthly)
 * @access  Private
 */
router.get('/spending-trends', auth, validateTrends, checkAnalyticsAvailable, async (req, res) => {
    try {
        const { period, months } = req.validatedQuery;

        const trends = await analyticsService.getSpendingTrends(req.user._id, {
            period,
            months
        });

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        console.error('[Analytics] Spending trends error:', error);
        res.status(500).json({ error: 'Failed to get spending trends' });
    }
});

/**
 * @route   GET /api/analytics/category-breakdown
 * @desc    Get category-wise expense distribution
 * @access  Private
 */
router.get('/category-breakdown', auth, validateCategory, checkAnalyticsAvailable, async (req, res) => {
    try {
        const { startDate, endDate, type } = req.validatedQuery;

        const breakdown = await analyticsService.getCategoryBreakdown(req.user._id, {
            startDate,
            endDate,
            type
        });

        res.json({
            success: true,
            data: breakdown
        });
    } catch (error) {
        console.error('[Analytics] Category breakdown error:', error);
        res.status(500).json({ error: 'Failed to get category breakdown' });
    }
});

/**
 * @route   GET /api/analytics/comparison
 * @desc    Get month-over-month comparison
 * @access  Private
 */
router.get('/comparison', auth, validateComparison, checkAnalyticsAvailable, async (req, res) => {
    try {
        const { months } = req.validatedQuery;

        const comparison = await analyticsService.getMonthlyComparison(req.user._id, {
            months
        });

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('[Analytics] Comparison error:', error);
        res.status(500).json({ error: 'Failed to get comparison data' });
    }
});

/**
 * @route   GET /api/analytics/insights
 * @desc    Get smart financial insights
 * @access  Private
 */
router.get('/insights', auth, checkAnalyticsAvailable, async (req, res) => {
    try {
        const insights = await analyticsService.getInsights(req.user._id);

        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        console.error('[Analytics] Insights error:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
});

/**
 * @route   GET /api/analytics/predictions
 * @desc    Get AI-based spending predictions
 * @access  Private
 */
router.get('/predictions', auth, checkAnalyticsAvailable, async (req, res) => {
    try {
        const predictions = await analyticsService.getSpendingPredictions(req.user._id);

        res.json({
            success: true,
            data: predictions
        });
    } catch (error) {
        console.error('[Analytics] Predictions error:', error);
        res.status(500).json({ error: 'Failed to generate predictions' });
    }
});

/**
 * @route   GET /api/analytics/velocity
 * @desc    Get current spending velocity
 * @access  Private
 */
router.get('/velocity', auth, async (req, res) => {
    try {
        const velocity = await analyticsService.getSpendingVelocity(req.user._id);

        res.json({
            success: true,
            data: velocity
        });
    } catch (error) {
        console.error('[Analytics] Velocity error:', error);
        res.status(500).json({ error: 'Failed to calculate spending velocity' });
    }
});

/**
 * @route   GET /api/analytics/summary
 * @desc    Get complete analytics summary
 * @access  Private
 */
router.get('/summary', auth, checkAnalyticsAvailable, async (req, res) => {
    try {
        const [trends, breakdown, insights, velocity] = await Promise.all([
            analyticsService.getSpendingTrends(req.user._id, { months: 3 }),
            analyticsService.getCategoryBreakdown(req.user._id, {}),
            analyticsService.getInsights(req.user._id),
            analyticsService.getSpendingVelocity(req.user._id)
        ]);

        res.json({
            success: true,
            data: {
                trends: trends.summary,
                categoryBreakdown: breakdown,
                insights: insights.insights.slice(0, 3),
                velocity,
                generatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('[Analytics] Summary error:', error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

/**
 * @route   DELETE /api/analytics/cache
 * @desc    Clear user's analytics cache
 * @access  Private
 */
router.delete('/cache', auth, async (req, res) => {
    try {
        await analyticsService.invalidateCache(req.user._id);

        res.json({
            success: true,
            message: 'Analytics cache cleared'
        });
    } catch (error) {
        console.error('[Analytics] Cache clear error:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

module.exports = router;
