const express = require('express');
const Workspace = require('../models/Workspace');
const WorkspaceInvite = require('../models/WorkspaceInvite');
const User = require('../models/User');
const collaborationService = require('../services/collaborationService');
const inviteService = require('../services/inviteService');
const auth = require('../middleware/auth');
const { 
  checkPermission, 
  requireManager, 
  requireOwner, 
  workspaceAccess,
  canManageRole,
  ROLES 
} = require('../middleware/rbac');
const router = express.Router();

// ============================================
// Workspace CRUD Operations
// ============================================

/**
 * Create workspace
 * POST /api/workspaces
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, settings } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const workspace = new Workspace({
      name: name.trim(),
      description: description?.trim(),
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner',
        joinedAt: new Date(),
        status: 'active'
      }],
      settings: settings || {}
    });

    workspace.logActivity('workspace:created', req.user._id);
    await workspace.save();

    // Populate for response
    await workspace.populate('owner', 'name email avatar');
    await workspace.populate('members.user', 'name email avatar');

    res.status(201).json({
      success: true,
      data: workspace,
      message: 'Workspace created successfully'
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's workspaces
 * GET /api/workspaces
 */
router.get('/', auth, async (req, res) => {
  try {
    const workspaces = await Workspace.getUserWorkspaces(req.user._id);

    // Add user's role to each workspace
    const workspacesWithRole = workspaces.map(ws => {
      const wsObj = ws.toObject();
      wsObj.userRole = ws.getUserRole(req.user._id);
      wsObj.isOwner = ws.owner._id.toString() === req.user._id.toString();
      return wsObj;
    });

    res.json({
      success: true,
      data: workspacesWithRole,
      count: workspacesWithRole.length
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single workspace details
 * GET /api/workspaces/:id
 */
router.get('/:id', auth, workspaceAccess(), async (req, res) => {
  try {
    const workspace = req.workspace;

    res.json({
      success: true,
      data: {
        ...workspace.toObject(),
        userRole: req.userRole,
        isOwner: req.isOwner
      }
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update workspace settings
 * PUT /api/workspaces/:id
 */
router.put('/:id', auth, checkPermission('workspace:settings'), async (req, res) => {
  try {
    const { name, description, settings, inviteSettings } = req.body;
    const workspace = req.workspace;

    if (name) workspace.name = name.trim();
    if (description !== undefined) workspace.description = description?.trim();
    if (settings) workspace.settings = { ...workspace.settings, ...settings };
    if (inviteSettings) workspace.inviteSettings = { ...workspace.inviteSettings, ...inviteSettings };

    workspace.logActivity('workspace:settings_changed', req.user._id, {
      changes: Object.keys(req.body)
    });

    await workspace.save();
    await workspace.populate('owner', 'name email avatar');
    await workspace.populate('members.user', 'name email avatar');

    res.json({
      success: true,
      data: workspace,
      message: 'Workspace updated successfully'
    });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete workspace (owner only)
 * DELETE /api/workspaces/:id
 */
router.delete('/:id', auth, requireOwner(), async (req, res) => {
  try {
    const workspace = req.workspace;

    // Soft delete - archive instead of hard delete
    workspace.status = 'archived';
    workspace.logActivity('workspace:deleted', req.user._id);
    await workspace.save();

    // Also cancel all pending invites
    await WorkspaceInvite.updateMany(
      { workspace: workspace._id, status: 'pending' },
      { status: 'revoked', revokedAt: new Date(), revokedBy: req.user._id }
    );

    res.json({
      success: true,
      message: 'Workspace deleted successfully'
    });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Member Management
// ============================================

/**
 * Get workspace members
 * GET /api/workspaces/:id/members
 */
router.get('/:id/members', auth, workspaceAccess(), async (req, res) => {
  try {
    const workspace = req.workspace;

    const members = workspace.members.map(m => ({
      _id: m._id,
      user: m.user,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      lastActiveAt: m.lastActiveAt,
      canManage: workspace.canManageRole(req.user._id, m.role)
    }));

    res.json({
      success: true,
      data: members,
      count: members.length,
      userRole: req.userRole
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update member role
 * PUT /api/workspaces/:id/members/:userId
 */
router.put('/:id/members/:userId', auth, checkPermission('members:promote'), async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;
    const workspace = req.workspace;

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Cannot change owner role
    if (workspace.owner.toString() === userId) {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    // Cannot promote to owner
    if (role === 'owner') {
      return res.status(400).json({ error: 'Cannot promote to owner. Use transfer ownership instead.' });
    }

    // Check if user can manage the target role
    if (!workspace.canManageRole(req.user._id, role)) {
      return res.status(403).json({ error: 'You cannot assign this role' });
    }

    // Find and update member
    const member = workspace.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const oldRole = member.role;
    member.role = role;

    workspace.logActivity('member:role_changed', req.user._id, {
      targetUser: userId,
      oldRole,
      newRole: role
    });

    await workspace.save();
    await workspace.populate('members.user', 'name email avatar');

    res.json({
      success: true,
      data: member,
      message: `Member role updated to ${role}`
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Remove member from workspace
 * DELETE /api/workspaces/:id/members/:userId
 */
router.delete('/:id/members/:userId', auth, checkPermission('members:remove'), async (req, res) => {
  try {
    const { userId } = req.params;
    const workspace = req.workspace;

    // Cannot remove owner
    if (workspace.owner.toString() === userId) {
      return res.status(400).json({ error: 'Cannot remove workspace owner' });
    }

    // Find member
    const memberIndex = workspace.members.findIndex(m => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const removedMember = workspace.members[memberIndex];

    // Check if user can manage this member's role
    if (!workspace.canManageRole(req.user._id, removedMember.role)) {
      return res.status(403).json({ error: 'You cannot remove members with this role' });
    }

    // Remove member
    workspace.members.splice(memberIndex, 1);

    workspace.logActivity('member:removed', req.user._id, {
      targetUser: userId,
      removedRole: removedMember.role
    });

    await workspace.save();

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Leave workspace (self)
 * POST /api/workspaces/:id/leave
 */
router.post('/:id/leave', auth, workspaceAccess(), async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user._id.toString();

    // Owner cannot leave - must transfer ownership first
    if (workspace.owner.toString() === userId) {
      return res.status(400).json({ 
        error: 'Owner cannot leave workspace. Transfer ownership first.' 
      });
    }

    // Remove self from members
    const memberIndex = workspace.members.findIndex(m => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'You are not a member of this workspace' });
    }

    workspace.members.splice(memberIndex, 1);

    workspace.logActivity('member:removed', req.user._id, {
      targetUser: userId,
      selfRemoval: true
    });

    await workspace.save();

    res.json({
      success: true,
      message: 'You have left the workspace'
    });
  } catch (error) {
    console.error('Leave workspace error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Transfer ownership
 * POST /api/workspaces/:id/transfer
 */
router.post('/:id/transfer', auth, requireOwner(), async (req, res) => {
  try {
    const { newOwnerId } = req.body;
    const workspace = req.workspace;

    if (!newOwnerId) {
      return res.status(400).json({ error: 'New owner ID is required' });
    }

    // Verify new owner is a member
    const newOwnerMember = workspace.members.find(
      m => m.user.toString() === newOwnerId
    );
    if (!newOwnerMember) {
      return res.status(400).json({ error: 'New owner must be an existing member' });
    }

    // Update ownership
    const oldOwnerId = workspace.owner;
    workspace.owner = newOwnerId;

    // Update roles
    newOwnerMember.role = 'owner';
    
    // Find old owner in members and demote to manager
    const oldOwnerMember = workspace.members.find(
      m => m.user.toString() === oldOwnerId.toString()
    );
    if (oldOwnerMember) {
      oldOwnerMember.role = 'manager';
    }

    workspace.logActivity('workspace:transfer', req.user._id, {
      oldOwner: oldOwnerId,
      newOwner: newOwnerId
    });

    await workspace.save();
    await workspace.populate('owner', 'name email avatar');
    await workspace.populate('members.user', 'name email avatar');

    res.json({
      success: true,
      data: workspace,
      message: 'Ownership transferred successfully'
    });
  } catch (error) {
    console.error('Transfer ownership error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Invite Management
// ============================================

/**
 * Send invite
 * POST /api/workspaces/:id/invite
 */
router.post('/:id/invite', auth, checkPermission('members:invite'), async (req, res) => {
  try {
    const { email, role = 'viewer', message, expiryDays } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate role - cannot invite as owner
    if (role === 'owner') {
      return res.status(400).json({ error: 'Cannot invite as owner' });
    }

    // Check if user can invite with this role
    if (!req.workspace.canManageRole(req.user._id, role)) {
      return res.status(403).json({ error: 'You cannot invite members with this role' });
    }

    const result = await inviteService.createInvite({
      workspaceId: req.params.id,
      email,
      role,
      invitedById: req.user._id,
      message,
      expiryDays
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get pending invites for workspace
 * GET /api/workspaces/:id/invites
 */
router.get('/:id/invites', auth, checkPermission('members:invite'), async (req, res) => {
  try {
    const invites = await inviteService.getWorkspaceInvites(req.params.id);

    res.json({
      success: true,
      data: invites,
      count: invites.length
    });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resend invite
 * POST /api/workspaces/:id/invites/:inviteId/resend
 */
router.post('/:id/invites/:inviteId/resend', auth, checkPermission('members:invite'), async (req, res) => {
  try {
    const result = await inviteService.resendInvite(
      req.params.inviteId,
      req.user._id
    );

    res.json({
      success: result.success,
      message: result.success ? 'Invitation resent' : 'Failed to resend invitation'
    });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Revoke invite
 * DELETE /api/workspaces/:id/invites/:inviteId
 */
router.delete('/:id/invites/:inviteId', auth, checkPermission('members:invite'), async (req, res) => {
  try {
    await inviteService.revokeInvite(
      req.params.inviteId,
      req.user._id,
      req.params.id
    );

    res.json({
      success: true,
      message: 'Invitation revoked'
    });
  } catch (error) {
    console.error('Revoke invite error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// Public Invite Endpoints (no auth required for preview)
// ============================================

/**
 * Get invite details (for preview page)
 * GET /api/workspaces/invite/:token
 */
router.get('/invite/:token', async (req, res) => {
  try {
    const details = await inviteService.getInviteDetails(req.params.token);

    if (!details) {
      return res.status(404).json({ 
        error: 'Invalid or expired invitation',
        code: 'INVITE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Get invite details error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Accept invite (join workspace)
 * POST /api/workspaces/join
 */
router.post('/join', auth, async (req, res) => {
  try {
    const { token, linkToken } = req.body;

    let result;
    if (token) {
      result = await inviteService.acceptInvite(token, req.user._id);
    } else if (linkToken) {
      result = await inviteService.joinViaLink(linkToken, req.user._id);
    } else {
      return res.status(400).json({ error: 'Invite token or link token is required' });
    }

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Join workspace error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Decline invite
 * POST /api/workspaces/decline
 */
router.post('/decline', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Invite token is required' });
    }

    const result = await inviteService.declineInvite(token);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Decline invite error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get user's pending invites
 * GET /api/workspaces/my-invites
 */
router.get('/my-invites', auth, async (req, res) => {
  try {
    const invites = await inviteService.getUserInvites(req.user.email);

    res.json({
      success: true,
      data: invites,
      count: invites.length
    });
  } catch (error) {
    console.error('Get my invites error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Shareable Link Management
// ============================================

/**
 * Generate shareable invite link
 * POST /api/workspaces/:id/invite-link
 */
router.post('/:id/invite-link', auth, requireManager(), async (req, res) => {
  try {
    const { role = 'viewer', expiryDays = 30 } = req.body;
    const workspace = req.workspace;

    // Enable invite links if not already
    workspace.inviteSettings.inviteLinkEnabled = true;
    await workspace.save();

    const result = await inviteService.generateShareableLink(
      req.params.id,
      role,
      expiryDays
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Generate invite link error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Disable shareable invite link
 * DELETE /api/workspaces/:id/invite-link
 */
router.delete('/:id/invite-link', auth, requireManager(), async (req, res) => {
  try {
    const workspace = req.workspace;

    workspace.inviteSettings.inviteLinkEnabled = false;
    workspace.inviteSettings.inviteLinkToken = null;
    workspace.inviteSettings.inviteLinkExpiry = null;
    await workspace.save();

    res.json({
      success: true,
      message: 'Invite link disabled'
    });
  } catch (error) {
    console.error('Disable invite link error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Activity Log
// ============================================

/**
 * Get workspace activity log
 * GET /api/workspaces/:id/activity
 */
router.get('/:id/activity', auth, checkPermission('audit:view'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const workspace = req.workspace;

    const activities = workspace.activityLog
      .slice(-limit - offset, -offset || undefined)
      .reverse();

    // Populate user details
    await Workspace.populate(activities, [
      { path: 'performedBy', select: 'name email avatar' },
      { path: 'targetUser', select: 'name email avatar' }
    ]);

    res.json({
      success: true,
      data: activities,
      total: workspace.activityLog.length
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Collaboration Features (#471)
// ============================================

const workspaceService = require('../services/workspaceService');

/**
 * Get workspace with collaboration state
 * GET /api/workspaces/:workspaceId/collaboration
 */
router.get('/:workspaceId/collaboration', auth, workspaceAccess, async (req, res) => {
  try {
    const workspace = await workspaceService.getWorkspaceWithCollaboration(
      req.params.workspaceId,
      req.user._id
    );

    res.json({
      success: true,
      data: {
        id: workspace._id,
        name: workspace.name,
        activeUsers: workspace.activeUsers,
        locks: workspace.locks.filter(l => l.expiresAt > new Date()),
        discussions: workspace.discussions,
        settings: workspace.collaborationSettings
      }
    });
  } catch (error) {
    console.error('Get collaboration state error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get collaboration statistics
 * GET /api/workspaces/:workspaceId/collaboration/stats
 */
router.get('/:workspaceId/collaboration/stats', auth, workspaceAccess, async (req, res) => {
  try {
    const stats = await workspaceService.getCollaborationStats(req.params.workspaceId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get collaboration stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Acquire lock on resource
 * POST /api/workspaces/:workspaceId/locks
 */
router.post('/:workspaceId/locks', auth, workspaceAccess, async (req, res) => {
  try {
    const { resourceType, resourceId, lockDuration } = req.body;

    if (!resourceType || !resourceId) {
      return res.status(400).json({ error: 'Missing resourceType or resourceId' });
    }

    const result = await workspaceService.acquireLock(
      req.params.workspaceId,
      req.user._id,
      resourceType,
      resourceId,
      lockDuration
    );

    res.json({ success: result.success, expiresAt: result.expiresAt, lockedBy: result.lockedBy });
  } catch (error) {
    console.error('Acquire lock error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Release lock on resource
 * DELETE /api/workspaces/:workspaceId/locks/:resourceType/:resourceId
 */
router.delete('/:workspaceId/locks/:resourceType/:resourceId', auth, workspaceAccess, async (req, res) => {
  try {
    const result = await workspaceService.releaseLock(
      req.params.workspaceId,
      req.user._id,
      req.params.resourceType,
      req.params.resourceId
    );

    res.json(result);
  } catch (error) {
    console.error('Release lock error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check lock status
 * GET /api/workspaces/:workspaceId/locks/:resourceType/:resourceId
 */
router.get('/:workspaceId/locks/:resourceType/:resourceId', auth, workspaceAccess, async (req, res) => {
  try {
    const lockStatus = await workspaceService.checkLock(
      req.params.workspaceId,
      req.params.resourceType,
      req.params.resourceId,
      req.user._id
    );

    res.json({ success: true, ...lockStatus });
  } catch (error) {
    console.error('Check lock error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get discussions
 * GET /api/workspaces/:workspaceId/discussions
 */
router.get('/:workspaceId/discussions', auth, workspaceAccess, async (req, res) => {
  try {
    const { parentType, parentId } = req.query;
    const discussions = await workspaceService.getDiscussions(
      req.params.workspaceId,
      parentType,
      parentId
    );

    res.json({ success: true, data: discussions });
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create discussion
 * POST /api/workspaces/:workspaceId/discussions
 */
router.post('/:workspaceId/discussions', auth, workspaceAccess, async (req, res) => {
  try {
    const { parentType, parentId, title, initialMessage } = req.body;

    if (!parentType || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const discussion = await workspaceService.createDiscussion(
      req.params.workspaceId,
      req.user._id,
      parentType,
      parentId,
      title,
      initialMessage
    );

    res.status(201).json({ success: true, data: discussion });
  } catch (error) {
    console.error('Create discussion error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add message to discussion
 * POST /api/workspaces/:workspaceId/discussions/:discussionId/messages
 */
router.post('/:workspaceId/discussions/:discussionId/messages', auth, workspaceAccess, async (req, res) => {
  try {
    const { text, mentions } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const result = await workspaceService.addDiscussionMessage(
      req.params.workspaceId,
      req.user._id,
      req.params.discussionId,
      text,
      mentions
    );

    res.status(201).json({ success: true, data: result.message });
  } catch (error) {
    console.error('Add discussion message error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update collaboration settings
 * PUT /api/workspaces/:workspaceId/collaboration/settings
 */
router.put('/:workspaceId/collaboration/settings', auth, requireManager, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    Object.assign(workspace.collaborationSettings, req.body);
    await workspace.save();

    res.json({ success: true, data: workspace.collaborationSettings });
  } catch (error) {
    console.error('Update collaboration settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;