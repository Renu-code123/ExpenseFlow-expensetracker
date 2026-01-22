const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const workspaceService = require('../services/workspaceService');
const invitationService = require('../services/invitationService');

/**
 * @route   POST /api/workspaces
 * @desc    Create a new workspace
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
    try {
        const workspace = await workspaceService.createWorkspace(req.user._id, req.body);
        res.status(201).json({ success: true, data: workspace });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/workspaces
 * @desc    Get all workshops for current user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
    try {
        const workspaces = await workspaceService.getUserWorkspaces(req.user._id);
        res.json({ success: true, data: workspaces });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/workspaces/:workspaceId
 * @desc    Get workspace by ID
 * @access  Private
 */
router.get('/:workspaceId', auth, checkRole([ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER]), async (req, res) => {
    try {
        const workspace = await workspaceService.getWorkspaceById(req.params.workspaceId, req.user._id);
        res.json({ success: true, data: workspace });
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
});

/**
 * @route   POST /api/workspaces/:workspaceId/invite
 * @desc    Invite user to workspace
 * @access  Private (Admin only)
 */
router.post('/:workspaceId/invite', auth, checkRole([ROLES.ADMIN]), async (req, res) => {
    try {
        const { email, role } = req.body;
        const result = await invitationService.inviteUser(req.params.workspaceId, email, role, req.user);
        res.json({ success: true, message: 'Invitation sent successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   POST /api/workspaces/join
 * @desc    Join workspace using token
 * @access  Private
 */
router.post('/join', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const result = await invitationService.joinWorkspace(token, req.user._id);
        res.json({ success: true, message: `Joined ${result.workspaceName} successfully` });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/workspaces/:workspaceId/members/:userId
 * @desc    Update member role
 * @access  Private (Admin only)
 */
router.put('/:workspaceId/members/:userId', auth, checkRole([ROLES.ADMIN]), async (req, res) => {
    try {
        const { role } = req.body;
        const workspace = await workspaceService.updateMemberRole(req.params.workspaceId, req.user._id, req.params.userId, role);
        res.json({ success: true, data: workspace });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId/members/:userId
 * @desc    Remove member from workspace
 * @access  Private (Admin only)
 */
router.delete('/:workspaceId/members/:userId', auth, checkRole([ROLES.ADMIN]), async (req, res) => {
    try {
        if (req.params.userId === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot remove yourself. Use leave workspace instead.' });
        }
        const workspace = await workspaceService.removeMember(req.params.workspaceId, req.user._id, req.params.userId);
        res.json({ success: true, data: workspace });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
