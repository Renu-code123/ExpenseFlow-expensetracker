const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Enhanced User Model with 2FA Support
 * Issue #338: Audit Trail & TOTP Security Suite
 */

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 12
  },
  preferredCurrency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  locale: {
    type: String,
    default: 'en-US'
  },
  monthlyBudgetLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  // Two-Factor Authentication (Issue #338)
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      select: false // Don't include in queries by default
    },
    tempSecret: {
      type: String,
      select: false
    },
    backupCodes: [{
      code: {
        type: String,
        select: false
      },
      used: {
        type: Boolean,
        default: false
      },
      usedAt: Date
    }],
    enabledAt: Date,
    lastVerifiedAt: Date,
    recoveryEmail: String
  },
  // Security settings (Issue #338)
  security: {
    passwordChangedAt: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockoutUntil: Date,
    lastLoginAt: Date,
    lastLoginIp: String,
    trustedDevices: [{
      deviceId: String,
      name: String,
      addedAt: Date,
      lastUsedAt: Date
    }],
    securityQuestions: [{
      question: String,
      answerHash: String
    }],
    requireTotpForSensitiveActions: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.security.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  if (this.security.lockoutUntil && this.security.lockoutUntil > Date.now()) {
    return true;
  }
  return false;
};

// Increment failed login attempts
userSchema.methods.incrementFailedLogins = async function() {
  this.security.failedLoginAttempts += 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.security.failedLoginAttempts >= 5) {
    this.security.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  return this.save();
};

// Reset failed login attempts
userSchema.methods.resetFailedLogins = async function() {
  this.security.failedLoginAttempts = 0;
  this.security.lockoutUntil = null;
  return this.save();
};

// Record successful login
userSchema.methods.recordLogin = async function(ipAddress) {
  this.security.lastLoginAt = new Date();
  this.security.lastLoginIp = ipAddress;
  this.security.failedLoginAttempts = 0;
  this.security.lockoutUntil = null;
  return this.save();
};

// Generate backup codes for 2FA
userSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      used: false
    });
  }
  this.twoFactorAuth.backupCodes = codes;
  return codes.map(c => c.code);
};

// Use a backup code
userSchema.methods.useBackupCode = async function(code) {
  const backupCode = this.twoFactorAuth.backupCodes.find(
    c => c.code === code.toUpperCase() && !c.used
  );
  
  if (!backupCode) {
    return false;
  }
  
  backupCode.used = true;
  backupCode.usedAt = new Date();
  await this.save();
  return true;
};

// Get remaining backup codes count
userSchema.methods.getRemainingBackupCodes = function() {
  return this.twoFactorAuth.backupCodes.filter(c => !c.used).length;
};

module.exports = mongoose.model('User', userSchema);