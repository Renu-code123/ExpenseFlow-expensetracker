const mongoose = require('mongoose');

const deviceFingerprintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fingerprint: {
    type: String,
    required: true,
    unique: true
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    language: String,
    timezone: String,
    screenResolution: String,
    colorDepth: Number,
    hardwareConcurrency: Number,
    deviceMemory: Number,
    cookieEnabled: Boolean,
    doNotTrack: String
  },
  browserInfo: {
    name: String,
    version: String,
    engine: String,
    plugins: [String],
    fonts: [String],
    canvas: String,
    webgl: String
  },
  networkInfo: {
    ipAddress: String,
    connectionType: String,
    downlink: Number,
    effectiveType: String
  },
  biometricData: {
    keystrokeDynamics: {
      avgDwellTime: Number,
      avgFlightTime: Number,
      typingRhythm: [Number]
    },
    mouseMovement: {
      avgSpeed: Number,
      avgAcceleration: Number,
      clickPattern: [Number]
    },
    touchBehavior: {
      pressure: Number,
      area: Number,
      duration: Number
    }
  },
  trustLevel: {
    type: String,
    enum: ['unknown', 'low', 'medium', 'high', 'trusted'],
    default: 'unknown'
  },
  riskFactors: [{
    factor: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    description: String
  }],
  geolocation: {
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,
    accuracy: Number
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  usageCount: {
    type: Number,
    default: 1
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: String,
  notes: [String]
}, {
  timestamps: true
});

deviceFingerprintSchema.index({ userId: 1, fingerprint: 1 });
deviceFingerprintSchema.index({ fingerprint: 1 });
deviceFingerprintSchema.index({ trustLevel: 1 });
deviceFingerprintSchema.index({ isBlocked: 1 });

module.exports = mongoose.model('DeviceFingerprint', deviceFingerprintSchema);