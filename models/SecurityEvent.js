const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  eventType: { type: String, enum: ['login_attempt', 'suspicious_transaction', 'device_change', 'location_anomaly', 'brute_force'], required: true },
  severity: { type: String, enum: ['info', 'low', 'medium', 'high', 'critical'], required: true },
  source: { type: String, required: true },
  ipAddress: String,
  userAgent: String,
  location: { country: String, city: String, lat: Number, lng: Number },
  threatIntelligence: {
    isKnownThreat: Boolean,
    threatType: String,
    blacklistMatch: Boolean,
    reputation: Number
  },
  correlatedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SecurityEvent' }],
  investigation: {
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'false_positive'], default: 'open' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: [{ message: String, createdAt: { type: Date, default: Date.now } }]
  },
  automated: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);