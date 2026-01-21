const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const searchService = require('../services/searchService');
const elasticsearchService = require('../services/elasticsearchService');

// Advanced search endpoint
router.post('/search', auth, [
  body('query').optional().isString().trim().isLength({ max: 200 }),
  body('filters.startDate').optional().isISO8601(),
  body('filters.endDate').optional().isISO8601(),
  body('filters.minAmount').optional().isNumeric(),
  body('filters.maxAmount').optional().isNumeric(),
  body('filters.categories').optional().isArray(),
  body('filters.tags').optional().isArray(),
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { query: searchQuery, filters: filterParams = {}, page = 1, limit = 20 } = req.body;
    
    const filters = searchService.buildAdvancedFilters(filterParams);
    const options = {
      skip: (page - 1) * limit,
      limit: parseInt(limit)
    };

    const results = await searchService.executeSearch(req.user.id, {
      query: searchQuery,
      filters,
      options
    });

    res.json({
      success: true,
      data: {
        expenses: results.expenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: results.total,
          pages: Math.ceil(results.total / limit)
        },
        searchMeta: {
          query: searchQuery,
          filters,
          maxScore: results.maxScore,
          executionTime: Date.now() - req.startTime
        }
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get search suggestions
router.get('/suggestions', auth, [
  query('q').notEmpty().isString().trim().isLength({ min: 2, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const suggestions = await searchService.getSuggestions(req.user.id, req.query.q);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get suggestions' 
    });
  }
});

// Save search query
router.post('/queries/save', auth, [
  body('query').notEmpty().isString().trim().isLength({ max: 200 }),
  body('name').notEmpty().isString().trim().isLength({ max: 100 }),
  body('filters').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const savedQuery = await searchService.saveSearchQuery(req.user.id, req.body);

    res.status(201).json({
      success: true,
      data: savedQuery
    });
  } catch (error) {
    console.error('Save query error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save query' 
    });
  }
});

// Get saved queries
router.get('/queries/saved', auth, async (req, res) => {
  try {
    const savedQueries = await searchService.getSavedQueries(req.user.id);

    res.json({
      success: true,
      data: savedQueries
    });
  } catch (error) {
    console.error('Get saved queries error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get saved queries' 
    });
  }
});

// Delete saved query
router.delete('/queries/:queryId', auth, async (req, res) => {
  try {
    const deletedQuery = await searchService.deleteSavedQuery(req.user.id, req.params.queryId);

    if (!deletedQuery) {
      return res.status(404).json({
        success: false,
        message: 'Saved query not found'
      });
    }

    res.json({
      success: true,
      message: 'Saved query deleted successfully'
    });
  } catch (error) {
    console.error('Delete query error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete query' 
    });
  }
});

// Get filter options
router.get('/filters/options', auth, async (req, res) => {
  try {
    const options = await searchService.getFilterOptions(req.user.id);

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get filter options' 
    });
  }
});

// Get search analytics
router.get('/analytics', auth, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dateRange = req.query.startDate && req.query.endDate ? {
      start: req.query.startDate,
      end: req.query.endDate
    } : null;

    const analytics = await searchService.getSearchAnalytics(req.user.id, dateRange);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get search analytics' 
    });
  }
});

// Get popular queries
router.get('/popular', auth, [
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const popularQueries = await searchService.getPopularQueries(req.user.id, limit);

    res.json({
      success: true,
      data: popularQueries
    });
  } catch (error) {
    console.error('Popular queries error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get popular queries' 
    });
  }
});

// Quick search endpoint (simplified)
router.get('/quick', auth, [
  query('q').notEmpty().isString().trim().isLength({ max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const limit = parseInt(req.query.limit) || 10;
    const results = await searchService.executeSearch(req.user.id, {
      query: req.query.q,
      options: { limit }
    });

    res.json({
      success: true,
      data: results.expenses.slice(0, limit)
    });
  } catch (error) {
    console.error('Quick search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Quick search failed' 
    });
  }
});

module.exports = router;