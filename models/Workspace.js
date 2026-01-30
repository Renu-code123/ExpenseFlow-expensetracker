const mongoose = require('mongoose');

/**
 * Enterprise-Grade RBAC Workspace Model
 * Issue #420: Role-Based Access Control & Workspace Invites
 * 
 * Roles hierarchy:
 * - owner: Full control (transfer ownership, delete workspace)
 * - manager: Can add/edit members, manage settings
 * - editor: Can add/edit expenses, budgets
 * - viewer: Read-only access to reports
 */

// Permission definitions for each role
const ROLE_PERMISSIONS = {
  owner: [
    'workspace:delete',
    'workspace:transfer',
    'workspace:settings',
    'members:invite',
    'members:remove',
    'members:promote',
    'members:demote',
    'expenses:create',
    'expenses:edit',
    'expenses:delete',
    'expenses:approve',
    'budgets:manage',
    'reports:view',
    'reports:export',
    'audit:view'
  ],
  manager: [
    'workspace:settings',
    'members:invite',
    'members:remove',
    'members:promote',
    'members:demote',
    'expenses:create',
    'expenses:edit',
    'expenses:delete',
    'expenses:approve',
    'budgets:manage',
    'reports:view',
    'reports:export',
    'audit:view'
  ],
  editor: [
    'expenses:create',
    'expenses:edit',
    'expenses:delete',
    'budgets:view',
    'reports:view',
    'reports:export'
  ],
  viewer: [
    'expenses:view',
    'budgets:view',
    'reports:view'
  ]
};

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  owner: 4,
  manager: 3,
  editor: 2,
  viewer: 1
};

const memberSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  role: { 
    type: String, 
    enum: ['owner', 'manager', 'editor', 'viewer'], 
    default: 'viewer' 
  },
  permissions: {
    type: [String],
    default: function() {
      return ROLE_PERMISSIONS[this.role] || ROLE_PERMISSIONS.viewer;
    }
  },
  customPermissions: [String], // Additional permissions beyond role
  restrictedPermissions: [String], // Permissions removed from role
  joinedAt: { type: Date, default: Date.now },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inviteAcceptedAt: Date,
  lastActiveAt: Date,
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active'
  }
}, { _id: true });

// Calculate effective permissions
memberSchema.virtual('effectivePermissions').get(function() {
  const basePermissions = ROLE_PERMISSIONS[this.role] || [];
  const custom = this.customPermissions || [];
  const restricted = this.restrictedPermissions || [];
  
  return [...new Set([...basePermissions, ...custom])]
    .filter(p => !restricted.includes(p));
});

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'workspace:created',
      'workspace:updated',
      'workspace:settings_changed',
      'member:invited',
      'member:joined',
      'member:removed',
      'member:role_changed',
      'member:permissions_changed',
      'invite:created',
      'invite:revoked',
      'invite:expired',
      'expense:created',
      'expense:approved',
      'expense:rejected'
    ],
    required: true
  },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});

const workspaceSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: String,
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  members: [memberSchema],
  
  // Workspace settings
  settings: {
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    approvalRequired: { type: Boolean, default: false },
    approvalThreshold: { type: Number, default: 1000 },
    expenseCategories: [String],
    budgetAlerts: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: false },
    allowSelfApproval: { type: Boolean, default: false },
    requireReceipts: { type: Boolean, default: false },
    receiptThreshold: { type: Number, default: 25 }
  },

  // Invite settings
  inviteSettings: {
    allowManagerInvites: { type: Boolean, default: true },
    defaultRole: { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
    inviteLinkEnabled: { type: Boolean, default: false },
    inviteLinkRole: { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
    inviteLinkToken: String,
    inviteLinkExpiry: Date,
    maxMembers: { type: Number, default: 50 },
    domainRestriction: String // e.g., "@company.com"
  },

  // Activity log
  activityLog: [activityLogSchema],

  // Workspace status
  status: {
    type: String,
    enum: ['active', 'archived', 'suspended'],
    default: 'active'
  },
  
  // Usage stats
  stats: {
    totalExpenses: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    lastActivityAt: Date
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ slug: 1 });
workspaceSchema.index({ status: 1 });
workspaceSchema.index({ 'inviteSettings.inviteLinkToken': 1 });

// Virtual for member count
workspaceSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Generate slug from name
workspaceSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + 
      '-' + Date.now().toString(36);
  }
  next();
});

// Instance method: Check if user has permission
workspaceSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return false;
  if (member.status !== 'active') return false;
  
  // Owner has all permissions
  if (this.owner.toString() === userId.toString()) return true;
  
  const effectivePerms = member.effectivePermissions || 
    ROLE_PERMISSIONS[member.role] || [];
  return effectivePerms.includes(permission);
};

// Instance method: Get member by user ID
workspaceSchema.methods.getMember = function(userId) {
  return this.members.find(m => m.user.toString() === userId.toString());
};

// Instance method: Get user's role
workspaceSchema.methods.getUserRole = function(userId) {
  if (this.owner.toString() === userId.toString()) return 'owner';
  const member = this.getMember(userId);
  return member ? member.role : null;
};

// Instance method: Check if user can manage target role
workspaceSchema.methods.canManageRole = function(userId, targetRole) {
  const userRole = this.getUserRole(userId);
  if (!userRole) return false;
  
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  
  // Can only manage roles below your level
  return userLevel > targetLevel;
};

// Instance method: Add activity log
workspaceSchema.methods.logActivity = function(action, performedBy, details = {}) {
  this.activityLog.push({
    action,
    performedBy,
    ...details,
    timestamp: new Date()
  });
  
  // Keep only last 1000 entries
  if (this.activityLog.length > 1000) {
    this.activityLog = this.activityLog.slice(-1000);
  }
  
  this.stats.lastActivityAt = new Date();
};

// Static method: Get user's workspaces
workspaceSchema.statics.getUserWorkspaces = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId, 'members.status': 'active' }
    ],
    status: 'active'
  })
  .populate('owner', 'name email avatar')
  .populate('members.user', 'name email avatar')
  .sort({ updatedAt: -1 });
};

// Static method: Check permission (for middleware)
workspaceSchema.statics.checkPermission = async function(workspaceId, userId, permission) {
  const workspace = await this.findById(workspaceId);
  if (!workspace) return { allowed: false, reason: 'Workspace not found' };
  if (workspace.status !== 'active') return { allowed: false, reason: 'Workspace is not active' };
  
  const allowed = workspace.hasPermission(userId, permission);
  return { 
    allowed, 
    reason: allowed ? null : 'Permission denied',
    workspace,
    role: workspace.getUserRole(userId)
  };
};

// Export role definitions for use in middleware
workspaceSchema.statics.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
workspaceSchema.statics.ROLE_HIERARCHY = ROLE_HIERARCHY;

module.exports = mongoose.model('Workspace', workspaceSchema);