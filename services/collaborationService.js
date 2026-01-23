const Workspace = require('../models/Workspace');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

class CollaborationService {
  constructor() {
    this.rolePermissions = {
      owner: ['create_expense', 'approve_expense', 'view_reports', 'manage_budgets', 'manage_members', 'export_data'],
      admin: ['create_expense', 'approve_expense', 'view_reports', 'manage_budgets', 'manage_members', 'export_data'],
      manager: ['create_expense', 'approve_expense', 'view_reports', 'manage_budgets'],
      member: ['create_expense', 'view_reports'],
      viewer: ['view_reports']
    };
  }

  async createWorkspace(ownerId, workspaceData) {
    const workspace = await Workspace.create({
      ...workspaceData,
      owner: ownerId,
      members: [{
        user: ownerId,
        role: 'owner',
        permissions: this.rolePermissions.owner
      }]
    });

    await this.logActivity(ownerId, 'workspace_created', 'workspace', workspace._id, {
      after: workspace
    }, workspace._id);

    return workspace;
  }

  async addMember(workspaceId, userId, memberData, requesterId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    if (!this.hasPermission(workspace, requesterId, 'manage_members')) {
      throw new Error('Insufficient permissions');
    }

    const existingMember = workspace.members.find(m => m.user.toString() === memberData.userId);
    if (existingMember) throw new Error('User already a member');

    const permissions = this.rolePermissions[memberData.role] || this.rolePermissions.member;
    
    workspace.members.push({
      user: memberData.userId,
      role: memberData.role,
      permissions
    });

    await workspace.save();

    await this.logActivity(requesterId, 'member_added', 'user', memberData.userId, {
      after: { workspaceId, role: memberData.role, permissions }
    }, workspaceId);

    return workspace;
  }

  async updateMemberRole(workspaceId, memberId, newRole, requesterId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    if (!this.hasPermission(workspace, requesterId, 'manage_members')) {
      throw new Error('Insufficient permissions');
    }

    const member = workspace.members.find(m => m.user.toString() === memberId);
    if (!member) throw new Error('Member not found');

    const oldRole = member.role;
    member.role = newRole;
    member.permissions = this.rolePermissions[newRole] || this.rolePermissions.member;

    await workspace.save();

    await this.logActivity(requesterId, 'member_role_changed', 'user', memberId, {
      before: { role: oldRole },
      after: { role: newRole }
    }, workspaceId);

    return workspace;
  }

  async removeMember(workspaceId, memberId, requesterId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    if (!this.hasPermission(workspace, requesterId, 'manage_members')) {
      throw new Error('Insufficient permissions');
    }

    const memberIndex = workspace.members.findIndex(m => m.user.toString() === memberId);
    if (memberIndex === -1) throw new Error('Member not found');

    const member = workspace.members[memberIndex];
    if (member.role === 'owner') throw new Error('Cannot remove workspace owner');

    workspace.members.splice(memberIndex, 1);
    await workspace.save();

    await this.logActivity(requesterId, 'member_removed', 'user', memberId, {
      before: { workspaceId, role: member.role }
    }, workspaceId);

    return workspace;
  }

  async submitExpenseForApproval(expenseId, workspaceId, submitterId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    const approvers = await this.getApprovers(workspace, submitterId);
    if (approvers.length === 0) {
      return null; // No approval required
    }

    const workflow = await ApprovalWorkflow.create({
      workspaceId,
      expenseId,
      submittedBy: submitterId,
      steps: approvers.map((approver, index) => ({
        stepNumber: index + 1,
        approver: approver._id,
        status: index === 0 ? 'pending' : 'pending'
      })),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await this.logActivity(submitterId, 'approval_submitted', 'approval', workflow._id, {
      after: { expenseId, approvers: approvers.length }
    }, workspaceId);

    return workflow;
  }

  async processApproval(workflowId, approverId, action, comments) {
    const workflow = await ApprovalWorkflow.findById(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const currentStep = workflow.steps[workflow.currentStep];
    if (!currentStep || currentStep.approver.toString() !== approverId) {
      throw new Error('Not authorized to approve this step');
    }

    currentStep.status = action;
    currentStep.action = action;
    currentStep.comments = comments;
    currentStep.actionDate = new Date();

    if (action === 'approved') {
      workflow.currentStep++;
      if (workflow.currentStep >= workflow.steps.length) {
        workflow.status = 'approved';
        workflow.completedAt = new Date();
      }
    } else if (action === 'rejected') {
      workflow.status = 'rejected';
      workflow.completedAt = new Date();
      workflow.finalComments = comments;
    }

    await workflow.save();

    await this.logActivity(approverId, 'approval_processed', 'approval', workflow._id, {
      after: { action, step: workflow.currentStep, status: workflow.status }
    }, workflow.workspaceId);

    return workflow;
  }

  async delegateApproval(workflowId, approverId, delegateToId, comments) {
    const workflow = await ApprovalWorkflow.findById(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const currentStep = workflow.steps[workflow.currentStep];
    if (!currentStep || currentStep.approver.toString() !== approverId) {
      throw new Error('Not authorized to delegate this approval');
    }

    currentStep.action = 'delegate';
    currentStep.comments = comments;
    currentStep.delegatedTo = delegateToId;
    currentStep.actionDate = new Date();

    // Create new step for delegate
    workflow.steps.splice(workflow.currentStep + 1, 0, {
      stepNumber: workflow.currentStep + 1.5,
      approver: delegateToId,
      status: 'pending'
    });

    workflow.currentStep++;
    await workflow.save();

    await this.logActivity(approverId, 'approval_delegated', 'approval', workflow._id, {
      after: { delegatedTo: delegateToId, comments }
    }, workflow.workspaceId);

    return workflow;
  }

  async getApprovers(workspace, submitterId) {
    const approvers = workspace.members.filter(member => 
      member.user.toString() !== submitterId &&
      member.permissions.includes('approve_expense') &&
      member.isActive
    );

    return approvers.sort((a, b) => {
      const roleOrder = { owner: 0, admin: 1, manager: 2 };
      return roleOrder[a.role] - roleOrder[b.role];
    });
  }

  hasPermission(workspace, userId, permission) {
    const member = workspace.members.find(m => m.user.toString() === userId);
    return member && member.isActive && member.permissions.includes(permission);
  }

  async getUserWorkspaces(userId) {
    return await Workspace.find({
      'members.user': userId,
      'members.isActive': true,
      isActive: true
    }).populate('owner', 'name email').populate('members.user', 'name email');
  }

  async getWorkspaceMembers(workspaceId, requesterId) {
    const workspace = await Workspace.findById(workspaceId)
      .populate('members.user', 'name email avatar');
    
    if (!workspace) throw new Error('Workspace not found');

    const member = workspace.members.find(m => m.user._id.toString() === requesterId);
    if (!member) throw new Error('Access denied');

    return workspace.members.filter(m => m.isActive);
  }

  async getPendingApprovals(userId) {
    return await ApprovalWorkflow.find({
      'steps.approver': userId,
      'steps.status': 'pending',
      status: 'pending'
    }).populate('expenseId').populate('submittedBy', 'name email');
  }

  async getWorkspaceAnalytics(workspaceId, requesterId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    if (!this.hasPermission(workspace, requesterId, 'view_reports')) {
      throw new Error('Insufficient permissions');
    }

    const [totalMembers, pendingApprovals, recentActivity] = await Promise.all([
      workspace.members.filter(m => m.isActive).length,
      ApprovalWorkflow.countDocuments({ workspaceId, status: 'pending' }),
      AuditLog.find({ workspaceId }).sort({ createdAt: -1 }).limit(10)
    ]);

    return {
      totalMembers,
      pendingApprovals,
      recentActivity,
      membersByRole: this.getMembersByRole(workspace.members)
    };
  }

  getMembersByRole(members) {
    const roleCount = {};
    members.filter(m => m.isActive).forEach(member => {
      roleCount[member.role] = (roleCount[member.role] || 0) + 1;
    });
    return roleCount;
  }

  async logActivity(userId, action, entityType, entityId, changes = {}, workspaceId = null, metadata = {}) {
    try {
      await AuditLog.create({
        userId,
        workspaceId,
        action,
        entityType,
        entityId,
        changes,
        metadata,
        severity: this.getActionSeverity(action)
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  getActionSeverity(action) {
    const severityMap = {
      'expense_deleted': 'high',
      'member_removed': 'high',
      'workspace_deleted': 'critical',
      'approval_rejected': 'medium',
      'member_role_changed': 'medium'
    };
    return severityMap[action] || 'low';
  }

  async getAuditLogs(workspaceId, requesterId, filters = {}) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    if (!this.hasPermission(workspace, requesterId, 'view_reports')) {
      throw new Error('Insufficient permissions');
    }

    const query = { workspaceId };
    if (filters.action) query.action = filters.action;
    if (filters.userId) query.userId = filters.userId;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    return await AuditLog.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100);
  }
}

module.exports = new CollaborationService();