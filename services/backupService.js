const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const archiver = require('archiver');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const Backup = require('../models/Backup');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDirectory();
  }

  // Ensure backup directory exists
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Create full database backup
  async createFullBackup(triggeredBy = 'schedule') {
    const backupId = this.generateBackupId();
    
    const backupRecord = new Backup({
      backupId,
      type: 'full',
      status: 'in_progress',
      triggeredBy,
      startTime: new Date(),
      retentionDate: this.calculateRetentionDate('full')
    });

    try {
      await backupRecord.save();
      console.log(`Starting full backup: ${backupId}`);

      // Get all collections
      const collections = await this.getAllCollections();
      const backupData = {};
      const collectionStats = [];

      // Export each collection
      for (const collectionName of collections) {
        const collection = mongoose.connection.db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        backupData[collectionName] = documents;
        collectionStats.push({
          name: collectionName,
          documentCount: documents.length,
          size: JSON.stringify(documents).length
        });
      }

      // Add metadata
      const metadata = await this.getBackupMetadata();
      backupData._metadata = metadata;

      // Create backup file
      const backupFile = await this.createBackupFile(backupId, backupData);
      
      // Upload to S3
      const s3Location = await this.uploadToS3(backupFile, backupId);
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(backupFile);
      
      // Update backup record
      backupRecord.status = 'completed';
      backupRecord.endTime = new Date();
      backupRecord.duration = backupRecord.endTime - backupRecord.startTime;
      backupRecord.size = fs.statSync(backupFile).size;
      backupRecord.collections = collectionStats;
      backupRecord.s3Location = s3Location;
      backupRecord.checksum = checksum;
      backupRecord.metadata = metadata;

      await backupRecord.save();

      // Clean up local file
      fs.unlinkSync(backupFile);

      console.log(`Full backup completed: ${backupId}`);
      return backupRecord;

    } catch (error) {
      console.error(`Backup failed: ${backupId}`, error);
      
      backupRecord.status = 'failed';
      backupRecord.errorMessage = error.message;
      backupRecord.endTime = new Date();
      await backupRecord.save();
      
      throw error;
    }
  }

  // Create incremental backup (changes since last backup)
  async createIncrementalBackup(triggeredBy = 'schedule') {
    const backupId = this.generateBackupId('inc');
    
    const backupRecord = new Backup({
      backupId,
      type: 'incremental',
      status: 'in_progress',
      triggeredBy,
      startTime: new Date(),
      retentionDate: this.calculateRetentionDate('incremental')
    });

    try {
      await backupRecord.save();
      
      // Get last backup time
      const lastBackup = await Backup.findOne({ 
        status: 'completed' 
      }).sort({ createdAt: -1 });
      
      const since = lastBackup ? lastBackup.createdAt : new Date(0);
      
      // Get changed documents since last backup
      const collections = await this.getAllCollections();
      const backupData = {};
      const collectionStats = [];

      for (const collectionName of collections) {
        const collection = mongoose.connection.db.collection(collectionName);
        
        // Find documents modified since last backup
        const query = {
          $or: [
            { createdAt: { $gte: since } },
            { updatedAt: { $gte: since } }
          ]
        };
        
        const documents = await collection.find(query).toArray();
        
        if (documents.length > 0) {
          backupData[collectionName] = documents;
          collectionStats.push({
            name: collectionName,
            documentCount: documents.length,
            size: JSON.stringify(documents).length
          });
        }
      }

      // Add metadata
      backupData._metadata = await this.getBackupMetadata();
      backupData._incremental = { since: since.toISOString() };

      // Create and upload backup
      const backupFile = await this.createBackupFile(backupId, backupData);
      const s3Location = await this.uploadToS3(backupFile, backupId);
      const checksum = await this.calculateChecksum(backupFile);

      // Update record
      backupRecord.status = 'completed';
      backupRecord.endTime = new Date();
      backupRecord.duration = backupRecord.endTime - backupRecord.startTime;
      backupRecord.size = fs.statSync(backupFile).size;
      backupRecord.collections = collectionStats;
      backupRecord.s3Location = s3Location;
      backupRecord.checksum = checksum;

      await backupRecord.save();

      // Clean up
      fs.unlinkSync(backupFile);

      console.log(`Incremental backup completed: ${backupId}`);
      return backupRecord;

    } catch (error) {
      console.error(`Incremental backup failed: ${backupId}`, error);
      
      backupRecord.status = 'failed';
      backupRecord.errorMessage = error.message;
      backupRecord.endTime = new Date();
      await backupRecord.save();
      
      throw error;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupId, options = {}) {
    const { collections = null, dryRun = false } = options;
    
    try {
      // Find backup record
      const backupRecord = await Backup.findOne({ backupId });
      if (!backupRecord) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      console.log(`Starting restore from backup: ${backupId}`);

      // Download backup from S3
      const backupFile = await this.downloadFromS3(backupRecord.s3Location);
      
      // Verify checksum
      const checksum = await this.calculateChecksum(backupFile);
      if (checksum !== backupRecord.checksum) {
        throw new Error('Backup file integrity check failed');
      }

      // Extract and parse backup data
      const backupData = await this.extractBackupFile(backupFile);
      
      if (dryRun) {
        console.log('Dry run - would restore:', Object.keys(backupData));
        fs.unlinkSync(backupFile);
        return { success: true, dryRun: true, collections: Object.keys(backupData) };
      }

      // Restore collections
      const restoredCollections = [];
      
      for (const [collectionName, documents] of Object.entries(backupData)) {
        if (collectionName.startsWith('_')) continue; // Skip metadata
        
        if (collections && !collections.includes(collectionName)) continue;
        
        const collection = mongoose.connection.db.collection(collectionName);
        
        // Clear existing data (optional)
        if (options.clearExisting) {
          await collection.deleteMany({});
        }
        
        // Insert backup data
        if (documents.length > 0) {
          await collection.insertMany(documents);
          restoredCollections.push({
            name: collectionName,
            documentCount: documents.length
          });
        }
      }

      // Clean up
      fs.unlinkSync(backupFile);

      console.log(`Restore completed: ${backupId}`);
      return { 
        success: true, 
        backupId, 
        restoredCollections,
        restoredAt: new Date()
      };

    } catch (error) {
      console.error(`Restore failed: ${backupId}`, error);
      throw error;
    }
  }

  // Verify backup integrity
  async verifyBackup(backupId) {
    try {
      const backupRecord = await Backup.findOne({ backupId });
      if (!backupRecord) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      // Download and verify checksum
      const backupFile = await this.downloadFromS3(backupRecord.s3Location);
      const checksum = await this.calculateChecksum(backupFile);
      
      const isValid = checksum === backupRecord.checksum;
      
      // Update verification status
      backupRecord.verified = isValid;
      backupRecord.verifiedAt = new Date();
      await backupRecord.save();

      // Clean up
      fs.unlinkSync(backupFile);

      return { backupId, verified: isValid, checksum };

    } catch (error) {
      console.error(`Verification failed: ${backupId}`, error);
      throw error;
    }
  }

  // Get all collection names
  async getAllCollections() {
    const collections = await mongoose.connection.db.listCollections().toArray();
    return collections.map(c => c.name).filter(name => !name.startsWith('system.'));
  }

  // Generate backup ID
  generateBackupId(prefix = 'full') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  // Create encrypted backup file
  async createBackupFile(backupId, data) {
    const filename = `${backupId}.json.gz.enc`;
    const filepath = path.join(this.backupDir, filename);
    
    // Compress and encrypt data
    const jsonData = JSON.stringify(data, null, 2);
    const compressed = await this.compressData(jsonData);
    const encrypted = this.encryptData(compressed);
    
    fs.writeFileSync(filepath, encrypted);
    return filepath;
  }

  // Extract backup file
  async extractBackupFile(filepath) {
    const encrypted = fs.readFileSync(filepath);
    const compressed = this.decryptData(encrypted);
    const jsonData = await this.decompressData(compressed);
    return JSON.parse(jsonData);
  }

  // Compress data using gzip
  async compressData(data) {
    const zlib = require('zlib');
    const gzip = promisify(zlib.gzip);
    return await gzip(Buffer.from(data));
  }

  // Decompress data
  async decompressData(data) {
    const zlib = require('zlib');
    const gunzip = promisify(zlib.gunzip);
    const result = await gunzip(data);
    return result.toString();
  }

  // Encrypt data
  encryptData(data) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.BACKUP_ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('ExpenseFlow-Backup'));
    
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]);
  }

  // Decrypt data
  decryptData(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.BACKUP_ENCRYPTION_KEY, 'salt', 32);
    
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('ExpenseFlow-Backup'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }

  // Upload to S3
  async uploadToS3(filepath, backupId) {
    const fileStream = fs.createReadStream(filepath);
    const key = `backups/${new Date().getFullYear()}/${backupId}/${path.basename(filepath)}`;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileStream,
      ServerSideEncryption: 'AES256',
      StorageClass: 'STANDARD_IA'
    };

    const result = await s3.upload(params).promise();
    
    return {
      bucket: result.Bucket,
      key: result.Key,
      url: result.Location
    };
  }

  // Download from S3
  async downloadFromS3(s3Location) {
    const params = {
      Bucket: s3Location.bucket,
      Key: s3Location.key
    };

    const result = await s3.getObject(params).promise();
    const filename = path.basename(s3Location.key);
    const filepath = path.join(this.backupDir, filename);
    
    fs.writeFileSync(filepath, result.Body);
    return filepath;
  }

  // Calculate file checksum
  async calculateChecksum(filepath) {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filepath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  // Get backup metadata
  async getBackupMetadata() {
    const User = require('../models/User');
    const Expense = require('../models/Expense');
    
    const [totalUsers, totalExpenses] = await Promise.all([
      User.countDocuments(),
      Expense.countDocuments()
    ]);

    return {
      mongoVersion: mongoose.version,
      appVersion: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      totalUsers,
      totalExpenses,
      backupDate: new Date().toISOString()
    };
  }

  // Calculate retention date
  calculateRetentionDate(type) {
    const now = new Date();
    const retentionDays = {
      full: 90,        // Keep full backups for 90 days
      incremental: 30, // Keep incremental backups for 30 days
      manual: 365      // Keep manual backups for 1 year
    };
    
    return new Date(now.getTime() + (retentionDays[type] * 24 * 60 * 60 * 1000));
  }

  // Clean up old backups
  async cleanupOldBackups() {
    try {
      const expiredBackups = await Backup.find({
        retentionDate: { $lt: new Date() },
        status: 'completed'
      });

      for (const backup of expiredBackups) {
        try {
          // Delete from S3
          await s3.deleteObject({
            Bucket: backup.s3Location.bucket,
            Key: backup.s3Location.key
          }).promise();

          // Delete backup record
          await Backup.findByIdAndDelete(backup._id);
          
          console.log(`Cleaned up expired backup: ${backup.backupId}`);
        } catch (error) {
          console.error(`Failed to cleanup backup: ${backup.backupId}`, error);
        }
      }

      return expiredBackups.length;
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  }

  // Get backup statistics
  async getBackupStats() {
    const stats = await Backup.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    const recentBackups = await Backup.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('backupId type status size createdAt duration');

    return {
      summary: stats,
      recent: recentBackups,
      totalBackups: await Backup.countDocuments(),
      lastBackup: await Backup.findOne({ status: 'completed' }).sort({ createdAt: -1 })
    };
  }
}

module.exports = new BackupService();