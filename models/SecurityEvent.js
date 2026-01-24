const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  eventType: {
    type: String,
    enum: [
      'login_attempt', 'login_success', 'login_failure', 'logout',
      'password_change', 'account_locked', 'suspicious_activity',
      'fraud_detected', 'data_breach_attempt', 'unauthorized_access',
      'api_abuse', 'brute_force_attack', 'session_hijack',
      'device_change', 'location_change', 'privilege_escalation'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'low', 'medium', 'high', 'critical'],
    required: true
  },
  source: {
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    geolocation: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number
    },
    referrer: String
  },
  details: {
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
    stackTrace: String,
    requestData: mongoose.Schema.Types.Mixed
  },
  threatIntelligence: {
    ipReputation: {
      score: Number,
      sources: [String],
      categories: [String]
    },
    isKnownThreat: Boolean,
    threatCategories: [String],
    blacklistMatches: [String]
  },
  correlation: {
    relatedEvents: [String],
    pattern: String,
    campaignId: String
  },
  response: {
    action: {
      type: String,
      enum: ['none', 'log', 'alert', 'block', 'challenge', 'escalate']
    },
    automated: Boolean,
    responseTime: Number,
    details: String
  },
  investigation: {
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'false_positive'],
      default: 'open'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: [String],
    evidence: [String]
  }
}, {
  timestamps: true
});

securityEventSchema.index({ eventType: 1, severity: 1, createdAt: -1 });
securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ 'source.ipAddress': 1 });
securityEventSchema.index({ 'threatIntelligence.isKnownThreat': 1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);