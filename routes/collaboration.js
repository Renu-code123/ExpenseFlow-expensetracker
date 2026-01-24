const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const collaborationService = require('../services/collaborationService');

// Create workspace
router.post('/workspaces', auth, [
  body('name').notEmpty().isString().trim().isLength({ max: 100 }),
  body('description').optional().isString().trim().isLength({ max: 500 }),
  body('settings.currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('settings.approvalRequired').optional().isBoolean(),
  body('settings.approvalThreshold').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workspace = await collaborationService.createWorkspace(req.user.id, req.body);

    res.status(201).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user workspaces
router.get('/workspaces', auth, async (req, res) => {
  try {
    const workspaces = await collaborationService.getUserWorkspaces(req.user.id);

    res.json({
      success: true,
      data: workspaces
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get workspaces'
    });
  }
});

// Add member to workspace
router.post('/workspaces/:workspaceId/members', auth, [
  body('userId').notEmpty().isMongoId(),
  body('role').isIn(['admin', 'manager', 'member', 'viewer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workspace = await collaborationService.addMember(
      req.params.workspaceId,
      req.user.id,
      req.body,
      req.user.id
    );

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`workspace_${req.params.workspaceId}`).emit('member_added', {
      workspaceId: req.params.workspaceId,
      member: req.body
    });

    res.status(201).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get workspace members
router.get('/workspaces/:workspaceId/members', auth, async (req, res) => {
  try {
    const members = await collaborationService.getWorkspaceMembers(
      req.params.workspaceId,
      req.user.id
    );

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
});

// Update member role
router.put('/workspaces/:workspaceId/members/:memberId/role', auth, [
  body('role').isIn(['admin', 'manager', 'member', 'viewer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workspace = await collaborationService.updateMemberRole(
      req.params.workspaceId,
      req.params.memberId,
      req.body.role,
      req.user.id
    );

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`workspace_${req.params.workspaceId}`).emit('member_role_updated', {
      workspaceId: req.params.workspaceId,
      memberId: req.params.memberId,
      newRole: req.body.role
    });

    res.json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
});

// Remove member from workspace
router.delete('/workspaces/:workspaceId/members/:memberId', auth, async (req, res) => {
  try {
    const workspace = await collaborationService.removeMember(
      req.params.workspaceId,
      req.params.memberId,
      req.user.id
    );

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`workspace_${req.params.workspaceId}`).emit('member_removed', {
      workspaceId: req.params.workspaceId,
      memberId: req.params.memberId
    });

    res.json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
});

// Submit expense for approval
router.post('/workspaces/:workspaceId/expenses/:expenseId/submit-approval', auth, async (req, res) => {
  try {
    const workflow = await collaborationService.submitExpenseForApproval(
      req.params.expenseId,
      req.params.workspaceId,
      req.user.id
    );

    if (!workflow) {
      return res.json({
        success: true,
        message: 'No approval required',
        data: null
      });
    }

    // Emit real-time notification to approvers
    const io = req.app.get('io');
    workflow.steps.forEach(step => {
      if (step.status === 'pending') {
        io.to(`user_${step.approver}`).emit('approval_request', {
          workflowId: workflow._id,
          expenseId: req.params.expenseId,
          submittedBy: req.user.id
        });
      }
    });

    res.status(201).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Submit approval error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Process approval
router.post('/approvals/:workflowId/process', auth, [
  body('action').isIn(['approved', 'rejected']),
  body('comments').optional().isString().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workflow = await collaborationService.processApproval(
      req.params.workflowId,
      req.user.id,
      req.body.action,
      req.body.comments
    );

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${workflow.submittedBy}`).emit('approval_processed', {
      workflowId: workflow._id,
      action: req.body.action,
      status: workflow.status
    });

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Process approval error:', error);
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
});

// Delegate approval
router.post('/approvals/:workflowId/delegate', auth, [
  body('delegateToId').notEmpty().isMongoId(),
  body('comments').optional().isString().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workflow = await collaborationService.delegateApproval(
      req.params.workflowId,
      req.user.id,
      req.body.delegateToId,
      req.body.comments
    );

    // Emit real-time notification to delegate
    const io = req.app.get('io');
    io.to(`user_${req.body.delegateToId}`).emit('approval_delegated', {
      workflowId: workflow._id,
      delegatedBy: req.user.id,
      comments: req.body.comments
    });

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Delegate approval error:', error);
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
});

// Get pending approvals
router.get('/approvals/pending', auth, async (req, res) => {
  try {
    const approvals = await collaborationService.getPendingApprovals(req.user.id);

    res.json({
      success: true,
      data: approvals
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending approvals'
    });
  }
});

// Get workspace analytics
router.get('/workspaces/:workspaceId/analytics', auth, async (req, res) => {
  try {
    const analytics = await collaborationService.getWorkspaceAnalytics(
      req.params.workspaceId,
      req.user.id
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get workspace analytics error:', error);
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
});

// Get audit logs
router.get('/workspaces/:workspaceId/audit-logs', auth, [
  query('action').optional().isString(),
  query('userId').optional().isMongoId(),
  query('entityType').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const logs = await collaborationService.getAuditLogs(
      req.params.workspaceId,
      req.user.id,
      req.query
    );

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;