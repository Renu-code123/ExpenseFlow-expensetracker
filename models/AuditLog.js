const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'expense_created', 'expense_updated', 'expense_deleted', 'expense_approved', 'expense_rejected',
      'budget_created', 'budget_updated', 'budget_deleted',
      'member_added', 'member_removed', 'member_role_changed',
      'workspace_created', 'workspace_updated', 'workspace_deleted',
      'approval_submitted', 'approval_processed', 'approval_delegated',
      'report_generated', 'data_exported', 'settings_changed'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['expense', 'budget', 'workspace', 'user', 'approval', 'report']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    apiEndpoint: String,
    requestId: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  tags: [String]
}, {
  timestamps: true
});

auditLogSchema.index({ workspaceId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);