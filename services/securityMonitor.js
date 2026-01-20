const mongoose = require('mongoose');

// Security log schema
const securityLogSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true
  },
  userAgent: String,
  endpoint: String,
  method: String,
  statusCode: Number,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  eventType: {
    type: String,
    enum: ['failed_login', 'rate_limit_exceeded', 'suspicious_activity', 'blocked_ip'],
    required: true
  },
  details: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);

class SecurityMonitor {
  constructor() {
    this.suspiciousIPs = new Map(); // IP -> { attempts, lastAttempt, blocked }
    this.blockedIPs = new Set();
    
    // Clean up old entries every hour
    setInterval(() => this.cleanupOldEntries(), 60 * 60 * 1000);
  }

  // Log security events
  async logSecurityEvent(req, eventType, details = {}) {
    try {
      const log = new SecurityLog({
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: details.statusCode,
        userId: req.user?._id,
        eventType,
        details
      });

      await log.save();
      
      // Check for suspicious patterns
      await this.analyzeSuspiciousActivity(req.ip, eventType);
    } catch (error) {
      console.error('Security logging failed:', error);
    }
  }

  // Analyze suspicious activity patterns
  async analyzeSuspiciousActivity(ip, eventType) {
    const ipData = this.suspiciousIPs.get(ip) || { attempts: 0, lastAttempt: Date.now(), blocked: false };
    
    // Increment attempts for suspicious events
    if (['failed_login', 'rate_limit_exceeded'].includes(eventType)) {
      ipData.attempts++;
      ipData.lastAttempt = Date.now();
    }

    // Block IP if too many suspicious attempts
    if (ipData.attempts >= 10 && !ipData.blocked) {
      ipData.blocked = true;
      this.blockedIPs.add(ip);
      
      // Log the blocking event
      await this.logSecurityEvent({ ip }, 'blocked_ip', {
        reason: 'Excessive suspicious activity',
        attempts: ipData.attempts
      });
      
      console.warn(`IP ${ip} blocked due to suspicious activity`);
    }

    this.suspiciousIPs.set(ip, ipData);
  }

  // Check if IP is blocked
  isBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  // Middleware to block suspicious IPs
  blockSuspiciousIPs() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      
      if (this.isBlocked(ip)) {
        return res.status(403).json({
          error: 'Access denied. Your IP has been blocked due to suspicious activity.',
          contact: 'Please contact support if you believe this is an error.'
        });
      }
      
      next();
    };
  }

  // Get security statistics
  async getSecurityStats(timeframe = 24) { // hours
    const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);
    
    try {
      const stats = await SecurityLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
            uniqueIPs: { $addToSet: '$ip' }
          }
        }
      ]);

      const totalEvents = await SecurityLog.countDocuments({ timestamp: { $gte: since } });
      const uniqueIPs = await SecurityLog.distinct('ip', { timestamp: { $gte: since } });

      return {
        totalEvents,
        uniqueIPs: uniqueIPs.length,
        blockedIPs: this.blockedIPs.size,
        eventBreakdown: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            uniqueIPs: stat.uniqueIPs.length
          };
          return acc;
        }, {}),
        timeframe: `${timeframe} hours`
      };
    } catch (error) {
      console.error('Security stats error:', error);
      return null;
    }
  }

  // Clean up old suspicious IP entries
  cleanupOldEntries() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.lastAttempt < oneHourAgo && !data.blocked) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  // Unblock IP (admin function)
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    console.log(`IP ${ip} has been unblocked`);
  }

  // Get recent security logs
  async getRecentLogs(limit = 50) {
    try {
      return await SecurityLog.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('userId', 'name email');
    } catch (error) {
      console.error('Failed to fetch security logs:', error);
      return [];
    }
  }
}

module.exports = new SecurityMonitor();