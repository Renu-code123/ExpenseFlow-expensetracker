const mongoose = require('mongoose');

const approvalWorkflowSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentStep: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  steps: [{
    stepNumber: {
      type: Number,
      required: true
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'skipped'],
      default: 'pending'
    },
    action: {
      type: String,
      enum: ['approve', 'reject', 'request_info', 'delegate']
    },
    comments: {
      type: String,
      maxlength: 500
    },
    actionDate: Date,
    delegatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: Date,
  finalComments: {
    type: String,
    maxlength: 1000
  },
  completedAt: Date
}, {
  timestamps: true
});

approvalWorkflowSchema.index({ workspaceId: 1, status: 1 });
approvalWorkflowSchema.index({ expenseId: 1 });
approvalWorkflowSchema.index({ submittedBy: 1 });
approvalWorkflowSchema.index({ 'steps.approver': 1, 'steps.status': 1 });

module.exports = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);