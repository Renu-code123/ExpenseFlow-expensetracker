const express = require('express');
const auth = require('../middleware/auth');
const backupService = require('../services/backupService');
const backupScheduler = require('../services/backupScheduler');
const Backup = require('../models/Backup');
const router = express.Router();

// Admin middleware
const adminAuth = async (req, res, next) => {
  if (!req.user || req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Create manual backup
router.post('/create', auth, adminAuth, async (req, res) => {
  try {
    const { type = 'full' } = req.body;
    
    let backup;
    if (type === 'full') {
      backup = await backupService.createFullBackup('manual');
    } else if (type === 'incremental') {
      backup = await backupService.createIncrementalBackup('manual');
    } else {
      return res.status(400).json({ error: 'Invalid backup type' });
    }

    res.status(201).json({
      message: 'Backup created successfully',
      backup: {
        id: backup.backupId,
        type: backup.type,
        status: backup.status,
        size: backup.size,
        duration: backup.duration
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all backups
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const backups = await Backup.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-checksum -s3Location.url');

    const total = await Backup.countDocuments(query);

    res.json({
      backups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get backup statistics
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const stats = await backupService.getBackupStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific backup details
router.get('/:backupId', auth, adminAuth, async (req, res) => {
  try {
    const backup = await Backup.findOne({ backupId: req.params.backupId });
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore from backup
router.post('/:backupId/restore', auth, adminAuth, async (req, res) => {
  try {
    const { collections, clearExisting = false, dryRun = false } = req.body;
    
    const result = await backupService.restoreFromBackup(req.params.backupId, {
      collections,
      clearExisting,
      dryRun
    });

    res.json({
      message: dryRun ? 'Dry run completed' : 'Restore completed successfully',
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify backup
router.post('/:backupId/verify', auth, adminAuth, async (req, res) => {
  try {
    const result = await backupService.verifyBackup(req.params.backupId);
    
    res.json({
      message: 'Backup verification completed',
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
router.delete('/:backupId', auth, adminAuth, async (req, res) => {
  try {
    const backup = await Backup.findOne({ backupId: req.params.backupId });
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Delete from S3
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    
    await s3.deleteObject({
      Bucket: backup.s3Location.bucket,
      Key: backup.s3Location.key
    }).promise();

    // Delete backup record
    await Backup.findByIdAndDelete(backup._id);

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual cleanup of old backups
router.post('/cleanup', auth, adminAuth, async (req, res) => {
  try {
    const cleanedCount = await backupService.cleanupOldBackups();
    
    res.json({
      message: 'Cleanup completed',
      cleanedBackups: cleanedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get scheduler status
router.get('/scheduler/status', auth, adminAuth, (req, res) => {
  try {
    const status = backupScheduler.getJobStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test backup configuration
router.post('/test-config', auth, adminAuth, async (req, res) => {
  try {
    // Test AWS S3 connection
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    
    await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
    
    // Test encryption key
    const crypto = require('crypto');
    const testData = 'test-encryption';
    const key = crypto.scryptSync(process.env.BACKUP_ENCRYPTION_KEY, 'salt', 32);
    
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.update(testData);
    cipher.final();

    res.json({
      message: 'Backup configuration test successful',
      tests: {
        s3Connection: true,
        encryptionKey: true,
        bucket: process.env.AWS_S3_BUCKET
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Configuration test failed',
      details: error.message 
    });
  }
});

// Download backup file (generates signed URL)
router.get('/:backupId/download', auth, adminAuth, async (req, res) => {
  try {
    const backup = await Backup.findOne({ backupId: req.params.backupId });
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: backup.s3Location.bucket,
      Key: backup.s3Location.key,
      Expires: 3600 // 1 hour
    });

    res.json({
      downloadUrl: signedUrl,
      expiresIn: 3600,
      filename: backup.backupId + '.backup'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;