const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const fraudDetectionService = require('../services/fraudDetectionService');
const FraudDetection = require('../models/FraudDetection');
const SecurityEvent = require('../models/SecurityEvent');
const DeviceFingerprint = require('../models/DeviceFingerprint');

// Admin middleware for security operations
const securityAuth = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'security_officer') {
    return res.status(403).json({
      success: false,
      message: 'Security officer access required'
    });
  }
  next();
};

// Analyze transaction for fraud
router.post('/analyze-transaction', auth, [
  body('transactionData').isObject().notEmpty(),
  body('deviceData').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionData, deviceData = {} } = req.body;
    
    const userContext = {
      userId: req.user.id,
      workspaceId: req.body.workspaceId,
      profile: req.user.profile || {},
      createdAt: req.user.createdAt,
      transactionCount: req.user.transactionCount || 0
    };

    const deviceContext = {
      fingerprint: deviceData.fingerprint,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      geolocation: deviceData.geolocation,
      trustLevel: deviceData.trustLevel || 'unknown'
    };

    const fraudAnalysis = await fraudDetectionService.analyzeTransaction(
      transactionData,
      userContext,
      deviceContext
    );

    res.json({
      success: true,
      data: fraudAnalysis
    });
  } catch (error) {
    console.error('Fraud analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Fraud analysis failed'
    });
  }
});

// Create device fingerprint
router.post('/device-fingerprint', auth, [
  body('deviceData').isObject().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const requestData = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      geolocation: req.body.geolocation
    };

    const deviceFingerprint = await fraudDetectionService.createDeviceFingerprint(
      req.user.id,
      req.body.deviceData,
      requestData
    );

    res.status(201).json({
      success: true,
      data: deviceFingerprint
    });
  } catch (error) {
    console.error('Device fingerprint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create device fingerprint'
    });
  }
});

// Get user's device fingerprints
router.get('/device-fingerprints', auth, async (req, res) => {
  try {
    const devices = await DeviceFingerprint.find({ userId: req.user.id })
      .sort({ lastSeen: -1 });

    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    console.error('Get device fingerprints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device fingerprints'
    });
  }
});

// Update device trust level
router.put('/device-fingerprints/:fingerprintId/trust', auth, [
  body('trustLevel').isIn(['unknown', 'low', 'medium', 'high', 'trusted'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const device = await DeviceFingerprint.findOneAndUpdate(
      { _id: req.params.fingerprintId, userId: req.user.id },
      { trustLevel: req.body.trustLevel },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device fingerprint not found'
      });
    }

    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error('Update device trust error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update device trust'
    });
  }
});

// Get fraud detection history
router.get('/fraud-detections', auth, [
  query('riskLevel').optional().isIn(['very_low', 'low', 'medium', 'high', 'critical']),
  query('action').optional().isIn(['allow', 'challenge', 'block', 'review']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id };
    
    if (req.query.riskLevel) query.riskLevel = req.query.riskLevel;
    if (req.query.action) query.action = req.query.action;
    
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    const [detections, total] = await Promise.all([
      FraudDetection.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FraudDetection.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        detections,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get fraud detections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fraud detections'
    });
  }
});

// Get security events (admin only)
router.get('/security-events', auth, securityAuth, [
  query('eventType').optional().isString(),
  query('severity').optional().isIn(['info', 'low', 'medium', 'high', 'critical']),
  query('userId').optional().isMongoId(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (req.query.eventType) query.eventType = req.query.eventType;
    if (req.query.severity) query.severity = req.query.severity;
    if (req.query.userId) query.userId = req.query.userId;
    
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    const [events, total] = await Promise.all([
      SecurityEvent.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SecurityEvent.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security events'
    });
  }
});

// Update security event investigation
router.put('/security-events/:eventId/investigation', auth, securityAuth, [
  body('status').isIn(['open', 'investigating', 'resolved', 'false_positive']),
  body('notes').optional().isArray(),
  body('assignedTo').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = {
      'investigation.status': req.body.status
    };

    if (req.body.notes) {
      updateData.$push = { 'investigation.notes': { $each: req.body.notes } };
    }

    if (req.body.assignedTo) {
      updateData['investigation.assignedTo'] = req.body.assignedTo;
    }

    const event = await SecurityEvent.findOneAndUpdate(
      { eventId: req.params.eventId },
      updateData,
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Security event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Update security event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update security event'
    });
  }
});

// Get security dashboard
router.get('/security-dashboard', auth, securityAuth, async (req, res) => {
  try {
    const [
      totalEvents,
      criticalEvents,
      openInvestigations,
      fraudDetections,
      recentEvents
    ] = await Promise.all([
      SecurityEvent.countDocuments(),
      SecurityEvent.countDocuments({ severity: 'critical' }),
      SecurityEvent.countDocuments({ 'investigation.status': 'open' }),
      FraudDetection.countDocuments({ action: { $in: ['block', 'challenge'] } }),
      SecurityEvent.find()
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const dashboard = {
      summary: {
        totalEvents,
        criticalEvents,
        openInvestigations,
        fraudDetections
      },
      recentEvents,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Get security dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security dashboard'
    });
  }
});

// Block/unblock device
router.put('/device-fingerprints/:fingerprintId/block', auth, securityAuth, [
  body('isBlocked').isBoolean(),
  body('blockReason').optional().isString().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = {
      isBlocked: req.body.isBlocked
    };

    if (req.body.isBlocked && req.body.blockReason) {
      updateData.blockReason = req.body.blockReason;
    } else if (!req.body.isBlocked) {
      updateData.blockReason = null;
    }

    const device = await DeviceFingerprint.findByIdAndUpdate(
      req.params.fingerprintId,
      updateData,
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device fingerprint not found'
      });
    }

    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error('Block device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block/unblock device'
    });
  }
});

// Get threat intelligence report
router.get('/threat-intelligence', auth, securityAuth, [
  query('ipAddress').optional().isIP(),
  query('timeRange').optional().isIn(['1h', '24h', '7d', '30d'])
], async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '24h';
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const startDate = new Date(Date.now() - timeRangeMs[timeRange]);
    
    const query = {
      createdAt: { $gte: startDate },
      'threatIntelligence.isKnownThreat': true
    };

    if (req.query.ipAddress) {
      query['source.ipAddress'] = req.query.ipAddress;
    }

    const [threatEvents, ipStats] = await Promise.all([
      SecurityEvent.find(query).sort({ createdAt: -1 }).limit(100),
      SecurityEvent.aggregate([
        { $match: query },
        { $group: { _id: '$source.ipAddress', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const report = {
      timeRange,
      summary: {
        totalThreats: threatEvents.length,
        uniqueIPs: ipStats.length,
        topThreats: ipStats
      },
      events: threatEvents,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get threat intelligence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get threat intelligence'
    });
  }
});

module.exports = router;