const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'member', 'viewer'],
      default: 'member'
    },
    permissions: [{
      type: String,
      enum: ['create_expense', 'approve_expense', 'view_reports', 'manage_budgets', 'manage_members', 'export_data']
    }],
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  settings: {
    currency: {
      type: String,
      default: 'USD'
    },
    approvalRequired: {
      type: Boolean,
      default: false
    },
    approvalThreshold: {
      type: Number,
      default: 100
    },
    expenseCategories: [{
      type: String
    }],
    budgetPeriod: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ isActive: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);