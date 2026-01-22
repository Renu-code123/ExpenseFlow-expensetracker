const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  backupId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['full', 'incremental', 'manual'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  size: {
    type: Number, // Size in bytes
    default: 0
  },
  collections: [{
    name: String,
    documentCount: Number,
    size: Number
  }],
  s3Location: {
    bucket: String,
    key: String,
    url: String
  },
  checksum: String,
  encrypted: {
    type: Boolean,
    default: true
  },
  compression: {
    type: String,
    enum: ['gzip', 'zip', 'none'],
    default: 'gzip'
  },
  startTime: Date,
  endTime: Date,
  duration: Number, // Duration in milliseconds
  errorMessage: String,
  triggeredBy: {
    type: String,
    enum: ['schedule', 'manual', 'system'],
    required: true
  },
  retentionDate: Date, // When this backup should be deleted
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  metadata: {
    mongoVersion: String,
    appVersion: String,
    environment: String,
    totalUsers: Number,
    totalExpenses: Number
  }
}, {
  timestamps: true
});

// Index for efficient queries
backupSchema.index({ createdAt: -1 });
backupSchema.index({ status: 1 });
backupSchema.index({ retentionDate: 1 });

module.exports = mongoose.model('Backup', backupSchema);