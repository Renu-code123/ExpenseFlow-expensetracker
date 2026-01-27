const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rebalancingService = require('../services/rebalancingService');

// ============ TARGET ALLOCATION ROUTES ============

// Set target allocation
router.post('/portfolios/:portfolioId/target-allocation', auth, async (req, res) => {
  try {
    const targetAllocation = await rebalancingService.setTargetAllocation(
      req.user._id,
      req.params.portfolioId,
      req.body
    );
    res.status(201).json({ success: true, data: targetAllocation });
  } catch (error) {
    console.error('Error setting target allocation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get target allocation
router.get('/portfolios/:portfolioId/target-allocation', auth, async (req, res) => {
  try {
    const targetAllocation = await rebalancingService.getTargetAllocation(
      req.user._id,
      req.params.portfolioId
    );
    res.json({ success: true, data: targetAllocation });
  } catch (error) {
    console.error('Error fetching target allocation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current allocation
router.get('/portfolios/:portfolioId/current-allocation', auth, async (req, res) => {
  try {
    const allocation = await rebalancingService.getCurrentAllocation(req.params.portfolioId);
    res.json({ success: true, data: allocation });
  } catch (error) {
    console.error('Error fetching current allocation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ REBALANCING ROUTES ============

// Calculate rebalancing recommendations
router.get('/portfolios/:portfolioId/rebalancing/calculate', auth, async (req, res) => {
  try {
    const recommendations = await rebalancingService.calculateRebalancing(
      req.user._id,
      req.params.portfolioId
    );
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Error calculating rebalancing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create rebalancing proposal
router.post('/portfolios/:portfolioId/rebalancing', auth, async (req, res) => {
  try {
    const proposal = await rebalancingService.createRebalancingProposal(
      req.user._id,
      req.params.portfolioId,
      req.body
    );
    res.status(201).json({ success: true, data: proposal });
  } catch (error) {
    console.error('Error creating rebalancing proposal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get rebalancing history
router.get('/portfolios/:portfolioId/rebalancing/history', auth, async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50
    };
    
    const history = await rebalancingService.getRebalancingHistory(
      req.user._id,
      req.params.portfolioId,
      options
    );
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching rebalancing history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific rebalancing
router.get('/rebalancing/:rebalancingId', auth, async (req, res) => {
  try {
    const { RebalancingHistory } = require('../models/PortfolioRebalancing');
    const rebalancing = await RebalancingHistory.findOne({
      _id: req.params.rebalancingId,
      user: req.user._id
    }).populate('portfolio').populate('targetAllocation');
    
    if (!rebalancing) {
      return res.status(404).json({ success: false, error: 'Rebalancing not found' });
    }
    
    res.json({ success: true, data: rebalancing });
  } catch (error) {
    console.error('Error fetching rebalancing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute rebalancing
router.post('/rebalancing/:rebalancingId/execute', auth, async (req, res) => {
  try {
    const rebalancing = await rebalancingService.executeRebalancing(
      req.user._id,
      req.params.rebalancingId
    );
    res.json({ success: true, data: rebalancing });
  } catch (error) {
    console.error('Error executing rebalancing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve rebalancing proposal
router.post('/rebalancing/:rebalancingId/approve', auth, async (req, res) => {
  try {
    const { RebalancingHistory } = require('../models/PortfolioRebalancing');
    const rebalancing = await RebalancingHistory.findOne({
      _id: req.params.rebalancingId,
      user: req.user._id
    });
    
    if (!rebalancing) {
      return res.status(404).json({ success: false, error: 'Rebalancing not found' });
    }
    
    if (rebalancing.status !== 'proposed') {
      return res.status(400).json({ success: false, error: 'Rebalancing cannot be approved' });
    }
    
    rebalancing.status = 'approved';
    rebalancing.approvedAt = Date.now();
    await rebalancing.save();
    
    res.json({ success: true, data: rebalancing });
  } catch (error) {
    console.error('Error approving rebalancing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel rebalancing
router.post('/rebalancing/:rebalancingId/cancel', auth, async (req, res) => {
  try {
    const { RebalancingHistory } = require('../models/PortfolioRebalancing');
    const rebalancing = await RebalancingHistory.findOne({
      _id: req.params.rebalancingId,
      user: req.user._id
    });
    
    if (!rebalancing) {
      return res.status(404).json({ success: false, error: 'Rebalancing not found' });
    }
    
    if (rebalancing.status === 'executed') {
      return res.status(400).json({ success: false, error: 'Cannot cancel executed rebalancing' });
    }
    
    rebalancing.status = 'cancelled';
    rebalancing.cancelledAt = Date.now();
    await rebalancing.save();
    
    res.json({ success: true, data: rebalancing });
  } catch (error) {
    console.error('Error cancelling rebalancing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ALERT ROUTES ============

// Get rebalancing alerts
router.get('/portfolios/:portfolioId/rebalancing/alerts', auth, async (req, res) => {
  try {
    const alerts = await rebalancingService.getPendingAlerts(
      req.user._id,
      req.params.portfolioId
    );
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if rebalancing is needed
router.get('/portfolios/:portfolioId/rebalancing/check', auth, async (req, res) => {
  try {
    const result = await rebalancingService.checkRebalancingNeeded(
      req.user._id,
      req.params.portfolioId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error checking rebalancing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark alert as read
router.post('/alerts/:alertId/read', auth, async (req, res) => {
  try {
    const { RebalancingAlert } = require('../models/PortfolioRebalancing');
    const alert = await RebalancingAlert.findOneAndUpdate(
      { _id: req.params.alertId, user: req.user._id },
      { read: true },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dismiss alert
router.post('/alerts/:alertId/dismiss', auth, async (req, res) => {
  try {
    const { RebalancingAlert } = require('../models/PortfolioRebalancing');
    const alert = await RebalancingAlert.findOneAndUpdate(
      { _id: req.params.alertId, user: req.user._id },
      { dismissed: true },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
