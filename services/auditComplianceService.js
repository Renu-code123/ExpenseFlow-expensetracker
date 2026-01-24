const ImmutableAuditLog = require('../models/ImmutableAuditLog');
const ComplianceFramework = require('../models/ComplianceFramework');
const ComplianceViolation = require('../models/ComplianceViolation');
const crypto = require('crypto');

class AuditComplianceService {
  constructor() {
    this.complianceChecks = new Map();
    this.retentionPolicies = new Map();
    this.init();
  }

  async init() {
    await this.loadComplianceFrameworks();
    await this.initializeRetentionPolicies();
    this.startComplianceMonitoring();
    console.log('Audit & Compliance service initialized');
  }

  async loadComplianceFrameworks() {
    const frameworks = [
      {
        standard: 'SOX',
        version: '2002',
        description: 'Sarbanes-Oxley Act compliance for financial reporting',
        requirements: [
          {
            id: 'SOX-302',
            title: 'Corporate Responsibility for Financial Reports',
            category: 'financial_reporting',
            severity: 'critical',
            automatedCheck: { enabled: true, checkFunction: 'checkFinancialReportAccuracy', frequency: 'daily' }
          },
          {
            id: 'SOX-404',
            title: 'Management Assessment of Internal Controls',
            category: 'access_control',
            severity: 'high',
            automatedCheck: { enabled: true, checkFunction: 'checkAccessControls', frequency: 'daily' }
          }
        ],
        applicableEntities: ['expense', 'report', 'user']
      },
      {
        standard: 'GDPR',
        version: '2018',
        description: 'General Data Protection Regulation compliance',
        requirements: [
          {
            id: 'GDPR-Art6',
            title: 'Lawfulness of Processing',
            category: 'data_protection',
            severity: 'critical',
            automatedCheck: { enabled: true, checkFunction: 'checkDataProcessingLawfulness', frequency: 'realtime' }
          },
          {
            id: 'GDPR-Art17',
            title: 'Right to Erasure',
            category: 'data_protection',
            severity: 'high',
            automatedCheck: { enabled: true, checkFunction: 'checkDataRetention', frequency: 'daily' }
          }
        ],
        applicableEntities: ['user', 'expense', 'workspace']
      },
      {
        standard: 'PCI_DSS',
        version: '4.0',
        description: 'Payment Card Industry Data Security Standard',
        requirements: [
          {
            id: 'PCI-3.4',
            title: 'Protect Stored Cardholder Data',
            category: 'data_protection',
            severity: 'critical',
            automatedCheck: { enabled: true, checkFunction: 'checkCardDataEncryption', frequency: 'realtime' }
          },
          {
            id: 'PCI-10.1',
            title: 'Audit Trail Requirements',
            category: 'audit_logging',
            severity: 'high',
            automatedCheck: { enabled: true, checkFunction: 'checkAuditTrailCompleteness', frequency: 'hourly' }
          }
        ],
        applicableEntities: ['payment', 'user', 'system']
      }
    ];

    for (const framework of frameworks) {
      await ComplianceFramework.findOneAndUpdate(
        { standard: framework.standard },
        framework,
        { upsert: true, new: true }
      );
    }
  }

  async initializeRetentionPolicies() {
    this.retentionPolicies.set('financial_data', { years: 7, description: 'Financial records retention' });
    this.retentionPolicies.set('audit_logs', { years: 10, description: 'Audit trail retention' });
    this.retentionPolicies.set('user_data', { years: 3, description: 'User personal data retention' });
    this.retentionPolicies.set('compliance_records', { years: 5, description: 'Compliance documentation' });
  }

  async logImmutableAudit(userId, action, entityType, entityId, changes = {}, workspaceId = null, metadata = {}) {
    try {
      const auditLog = await ImmutableAuditLog.create({
        workspaceId,
        userId,
        action,
        entityType,
        entityId,
        changes,
        metadata: {
          ...metadata,
          timestamp: new Date(),
          requestId: crypto.randomUUID()
        },
        complianceFlags: await this.checkCompliance(action, entityType, changes),
        riskLevel: this.assessRiskLevel(action, entityType, changes),
        retentionPolicy: this.calculateRetentionPolicy(entityType)
      });

      // Real-time compliance monitoring
      await this.monitorCompliance(auditLog);
      
      return auditLog;
    } catch (error) {
      console.error('Failed to create immutable audit log:', error);
      throw error;
    }
  }

  async checkCompliance(action, entityType, changes) {
    const flags = [];
    const frameworks = await ComplianceFramework.find({ isActive: true });

    for (const framework of frameworks) {
      for (const requirement of framework.requirements) {
        if (requirement.automatedCheck.enabled) {
          const checkResult = await this.executeComplianceCheck(
            requirement.automatedCheck.checkFunction,
            action,
            entityType,
            changes
          );

          if (checkResult.status !== 'compliant') {
            flags.push({
              standard: framework.standard,
              requirement: requirement.id,
              status: checkResult.status,
              details: checkResult.details
            });
          }
        }
      }
    }

    return flags;
  }

  async executeComplianceCheck(checkFunction, action, entityType, changes) {
    try {
      switch (checkFunction) {
        case 'checkFinancialReportAccuracy':
          return this.checkFinancialReportAccuracy(action, entityType, changes);
        case 'checkAccessControls':
          return this.checkAccessControls(action, entityType, changes);
        case 'checkDataProcessingLawfulness':
          return this.checkDataProcessingLawfulness(action, entityType, changes);
        case 'checkDataRetention':
          return this.checkDataRetention(action, entityType, changes);
        case 'checkCardDataEncryption':
          return this.checkCardDataEncryption(action, entityType, changes);
        case 'checkAuditTrailCompleteness':
          return this.checkAuditTrailCompleteness(action, entityType, changes);
        default:
          return { status: 'compliant', details: 'No check implemented' };
      }
    } catch (error) {
      return { status: 'review_required', details: `Check failed: ${error.message}` };
    }
  }

  checkFinancialReportAccuracy(action, entityType, changes) {
    if (entityType === 'expense' && action.includes('updated')) {
      const amountChange = changes.after?.amount - changes.before?.amount;
      if (Math.abs(amountChange) > 10000) {
        return { status: 'violation', details: 'Large expense modification requires additional approval' };
      }
    }
    return { status: 'compliant', details: 'Financial data modification within acceptable limits' };
  }

  checkAccessControls(action, entityType, changes) {
    if (action.includes('deleted') && entityType === 'expense') {
      return { status: 'warning', details: 'Expense deletion requires audit trail verification' };
    }
    return { status: 'compliant', details: 'Access control requirements met' };
  }

  checkDataProcessingLawfulness(action, entityType, changes) {
    if (entityType === 'user' && action === 'user_created') {
      if (!changes.after?.consentGiven) {
        return { status: 'violation', details: 'User data processing without explicit consent' };
      }
    }
    return { status: 'compliant', details: 'Data processing lawfulness verified' };
  }

  checkDataRetention(action, entityType, changes) {
    if (action === 'data_export' && entityType === 'user') {
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() - 3);
      
      if (changes.before?.lastActivity < retentionDate) {
        return { status: 'warning', details: 'Exporting data beyond retention period' };
      }
    }
    return { status: 'compliant', details: 'Data retention policy compliant' };
  }

  checkCardDataEncryption(action, entityType, changes) {
    if (entityType === 'payment' && changes.after?.cardNumber) {
      if (!changes.after.cardNumber.startsWith('****')) {
        return { status: 'violation', details: 'Unencrypted card data detected' };
      }
    }
    return { status: 'compliant', details: 'Payment data properly encrypted' };
  }

  checkAuditTrailCompleteness(action, entityType, changes) {
    if (!changes.before && !changes.after && action !== 'user_login') {
      return { status: 'warning', details: 'Incomplete audit trail - missing change details' };
    }
    return { status: 'compliant', details: 'Audit trail complete' };
  }

  assessRiskLevel(action, entityType, changes) {
    if (action.includes('deleted') || action.includes('rejected')) return 'high';
    if (entityType === 'payment' || entityType === 'user') return 'medium';
    if (changes.after?.amount > 5000) return 'medium';
    return 'low';
  }

  calculateRetentionPolicy(entityType) {
    const policy = this.retentionPolicies.get(entityType) || this.retentionPolicies.get('audit_logs');
    const retainUntil = new Date();
    retainUntil.setFullYear(retainUntil.getFullYear() + policy.years);
    
    return {
      retainUntil,
      legalHold: false
    };
  }

  async monitorCompliance(auditLog) {
    const violations = auditLog.complianceFlags.filter(flag => flag.status === 'violation');
    
    for (const violation of violations) {
      await this.createComplianceViolation(auditLog, violation);
    }
  }

  async createComplianceViolation(auditLog, flag) {
    const violationId = `${flag.standard}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const violation = await ComplianceViolation.create({
      violationId,
      workspaceId: auditLog.workspaceId,
      standard: flag.standard,
      requirementId: flag.requirement,
      severity: this.mapSeverity(flag.standard, flag.requirement),
      description: flag.details,
      affectedEntities: [{
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        entityDescription: `${auditLog.action} on ${auditLog.entityType}`
      }],
      detectedBy: {
        method: 'automated_scan',
        systemComponent: 'AuditComplianceService'
      },
      riskAssessment: {
        likelihood: 'medium',
        impact: this.mapImpact(flag.standard),
        overallRisk: auditLog.riskLevel
      }
    });

    // Send notifications
    await this.notifyComplianceViolation(violation);
    
    return violation;
  }

  mapSeverity(standard, requirementId) {
    const severityMap = {
      'SOX-302': 'critical',
      'SOX-404': 'high',
      'GDPR-Art6': 'critical',
      'GDPR-Art17': 'high',
      'PCI-3.4': 'critical',
      'PCI-10.1': 'high'
    };
    return severityMap[requirementId] || 'medium';
  }

  mapImpact(standard) {
    const impactMap = {
      'SOX': 'major',
      'GDPR': 'major',
      'PCI_DSS': 'catastrophic',
      'HIPAA': 'major'
    };
    return impactMap[standard] || 'moderate';
  }

  async notifyComplianceViolation(violation) {
    // Implementation would send notifications to compliance officers
    console.log(`Compliance violation detected: ${violation.violationId}`);
  }

  async verifyAuditIntegrity(startSequence = 1, endSequence = null) {
    const query = { sequenceNumber: { $gte: startSequence } };
    if (endSequence) query.sequenceNumber.$lte = endSequence;

    const logs = await ImmutableAuditLog.find(query).sort({ sequenceNumber: 1 });
    const violations = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      // Verify hash chain
      if (i > 0) {
        const prevLog = logs[i - 1];
        if (log.previousHash !== prevLog.currentHash) {
          violations.push({
            type: 'hash_chain_broken',
            sequence: log.sequenceNumber,
            details: 'Previous hash mismatch'
          });
        }
      }

      // Verify signature
      const expectedSignature = crypto.createHmac('sha256', process.env.AUDIT_SIGNATURE_KEY || 'default-key')
        .update(log.currentHash)
        .digest('hex');
      
      if (log.signature !== expectedSignature) {
        violations.push({
          type: 'signature_invalid',
          sequence: log.sequenceNumber,
          details: 'Digital signature verification failed'
        });
      }
    }

    return {
      verified: violations.length === 0,
      violations,
      logsChecked: logs.length
    };
  }

  async generateComplianceReport(standard, workspaceId = null, dateRange = {}) {
    const query = {
      'complianceFlags.standard': standard
    };
    
    if (workspaceId) query.workspaceId = workspaceId;
    if (dateRange.start || dateRange.end) {
      query.createdAt = {};
      if (dateRange.start) query.createdAt.$gte = new Date(dateRange.start);
      if (dateRange.end) query.createdAt.$lte = new Date(dateRange.end);
    }

    const [auditLogs, violations] = await Promise.all([
      ImmutableAuditLog.find(query).sort({ createdAt: -1 }),
      ComplianceViolation.find({ standard, ...query }).sort({ createdAt: -1 })
    ]);

    const summary = {
      totalAuditEvents: auditLogs.length,
      complianceViolations: violations.length,
      openViolations: violations.filter(v => v.status === 'open').length,
      criticalViolations: violations.filter(v => v.severity === 'critical').length,
      complianceScore: this.calculateComplianceScore(auditLogs, violations)
    };

    return {
      standard,
      workspaceId,
      dateRange,
      summary,
      auditLogs: auditLogs.slice(0, 100), // Limit for performance
      violations: violations.slice(0, 50),
      generatedAt: new Date()
    };
  }

  calculateComplianceScore(auditLogs, violations) {
    if (auditLogs.length === 0) return 100;
    
    const violationWeight = {
      'critical': 10,
      'high': 5,
      'medium': 2,
      'low': 1
    };

    const totalWeight = violations.reduce((sum, v) => sum + violationWeight[v.severity], 0);
    const maxPossibleWeight = auditLogs.length * 10; // Assuming worst case
    
    return Math.max(0, Math.round(100 - (totalWeight / maxPossibleWeight) * 100));
  }

  async applyLegalHold(entityType, entityId, reason, userId) {
    const query = {
      entityType,
      entityId
    };

    await ImmutableAuditLog.updateMany(query, {
      $set: {
        'retentionPolicy.legalHold': true,
        'retentionPolicy.holdReason': reason,
        'retentionPolicy.holdBy': userId
      }
    });

    await this.logImmutableAudit(userId, 'legal_hold_applied', entityType, entityId, {
      after: { reason, appliedBy: userId }
    });
  }

  async releaseLegalHold(entityType, entityId, userId) {
    const query = {
      entityType,
      entityId,
      'retentionPolicy.legalHold': true
    };

    await ImmutableAuditLog.updateMany(query, {
      $set: {
        'retentionPolicy.legalHold': false,
        'retentionPolicy.holdReason': null,
        'retentionPolicy.holdBy': null
      }
    });

    await this.logImmutableAudit(userId, 'legal_hold_released', entityType, entityId, {
      after: { releasedBy: userId }
    });
  }

  startComplianceMonitoring() {
    // Run compliance checks every hour
    setInterval(async () => {
      await this.runScheduledComplianceChecks();
    }, 60 * 60 * 1000);
  }

  async runScheduledComplianceChecks() {
    const frameworks = await ComplianceFramework.find({ isActive: true });
    
    for (const framework of frameworks) {
      for (const requirement of framework.requirements) {
        if (requirement.automatedCheck.enabled && requirement.automatedCheck.frequency === 'hourly') {
          // Run scheduled compliance checks
          await this.executeScheduledCheck(framework.standard, requirement);
        }
      }
    }
  }

  async executeScheduledCheck(standard, requirement) {
    // Implementation for scheduled compliance checks
    console.log(`Running scheduled compliance check: ${standard}-${requirement.id}`);
  }
}

module.exports = new AuditComplianceService();