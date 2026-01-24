const express = require('express');
const auth = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const approvalService = require('../services/approvalService');
const router = express.Router();

/**
 * @route   POST /api/approvals/submit/:expenseId
 * @desc    Submit expense for approval
 * @access  Private
 */
router.post('/submit/:expenseId', auth, async (req, res) => {
    try {
        const workflow = await approvalService.submitForApproval(req.params.expenseId, req.user._id);
        res.json({
            success: true,
            message: 'Expense submitted for approval',
            data: workflow
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   GET /api/approvals/pending
 * @desc    Get pending approvals for current user
 * @access  Private
 */
router.get('/pending', auth, async (req, res) => {
    try {
        const approvals = await approvalService.getPendingApprovals(req.user._id);
        res.json({ success: true, data: approvals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/approvals/history
 * @desc    Get approval history for current user
 * @access  Private
 */
router.get('/history', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const history = await approvalService.getApprovalHistory(req.user._id, page, limit);
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/approvals/:workflowId
 * @desc    Get workflow details
 * @access  Private
 */
router.get('/:workflowId', auth, async (req, res) => {
    try {
        const workflow = await approvalService.getWorkflowById(req.params.workflowId, req.user._id);
        res.json({ success: true, data: workflow });
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
});

/**
 * @route   POST /api/approvals/:workflowId/approve
 * @desc    Approve a workflow step
 * @access  Private
 */
router.post('/:workflowId/approve', auth, async (req, res) => {
    try {
        const { comments } = req.body;
        const workflow = await approvalService.processApproval(
            req.params.workflowId,
            req.user._id,
            'approved',
            comments
        );
        res.json({
            success: true,
            message: 'Expense approved successfully',
            data: workflow
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   POST /api/approvals/:workflowId/reject
 * @desc    Reject a workflow step
 * @access  Private
 */
router.post('/:workflowId/reject', auth, async (req, res) => {
    try {
        const { comments } = req.body;
        const workflow = await approvalService.processApproval(
            req.params.workflowId,
            req.user._id,
            'rejected',
            comments
        );
        res.json({
            success: true,
            message: 'Expense rejected',
            data: workflow
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route   GET /api/approvals/workspace/:workspaceId
 * @desc    Get all approval workflows for a workspace (admin only)
 * @access  Private (Admin only)
 */
router.get('/workspace/:workspaceId', auth, checkRole([ROLES.OWNER, ROLES.ADMIN]), async (req, res) => {
    try {
        const ApprovalWorkflow = require('../models/ApprovalWorkflow');
        const workflows = await ApprovalWorkflow.find({ workspaceId: req.params.workspaceId })
            .populate('expenseId')
            .populate('submittedBy', 'name email')
            .populate('steps.approver', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: workflows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;