const mongoose = require('mongoose');

const fraudDetectionSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['very_low', 'low', 'medium', 'high', 'critical'],
    required: true
  },
  fraudIndicators: [{
    type: {
      type: String,
      enum: ['amount_anomaly', 'location_anomaly', 'time_anomaly', 'device_anomaly', 'behavior_anomaly', 'velocity_anomaly']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    description: String,
    value: mongoose.Schema.Types.Mixed,
    threshold: mongoose.Schema.Types.Mixed
  }],
  behaviorAnalysis: {
    userProfile: {
      avgTransactionAmount: Number,
      commonCategories: [String],
      typicalTimeRange: {
        start: Number, // Hour of day
        end: Number
      },
      frequentLocations: [String],
      deviceFingerprints: [String]
    },
    deviations: [{
      metric: String,
      currentValue: mongoose.Schema.Types.Mixed,
      expectedValue: mongoose.Schema.Types.Mixed,
      deviationScore: Number
    }]
  },
  deviceInfo: {
    fingerprint: String,
    ipAddress: String,
    userAgent: String,
    geolocation: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number
    },
    isTrusted: {
      type: Boolean,
      default: false
    },
    riskFactors: [String]
  },
  mlPrediction: {
    model: String,
    version: String,
    prediction: Number,
    confidence: Number,
    features: mongoose.Schema.Types.Mixed
  },
  action: {
    type: String,
    enum: ['allow', 'challenge', 'block', 'review'],
    required: true
  },
  actionReason: String,
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'escalated'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  externalChecks: [{
    provider: String,
    checkType: String,
    result: String,
    confidence: Number,
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

fraudDetectionSchema.index({ userId: 1, createdAt: -1 });
fraudDetectionSchema.index({ riskLevel: 1, action: 1 });
fraudDetectionSchema.index({ transactionId: 1 });
fraudDetectionSchema.index({ 'deviceInfo.fingerprint': 1 });

module.exports = mongoose.model('FraudDetection', fraudDetectionSchema);