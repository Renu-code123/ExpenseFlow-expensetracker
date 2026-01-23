const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateSplitCreation, validateSettlement } = require('../middleware/splitValidator');
const splitService = require('../services/splitService');
const SplitExpense = require('../models/SplitExpense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const Group = require('../models/Group');

/**
 * @route   POST /api/splits
 * @desc    Create a split expense
 * @access  Private
 */
router.post('/', auth, validateSplitCreation, async (req, res) => {
    try {
        const {
            description,
            totalAmount,
            currency,
            category,
            date,
            splitType,
            groupId,
            members,
            splitData,
            notes
        } = req.body;

        // Get current user details
        const currentUser = await User.findById(req.user.id);

        // Prepare expense data
        const expenseData = {
            description,
            totalAmount,
            currency: currency || 'INR',
            category: category || 'other',
            date: date || new Date(),
            splitType,
            groupId: groupId || null,
            members: members.map(m => ({
                user: m.userId,
                name: m.name,
                email: m.email
            })),
            splitData,
            notes,
            paidBy: {
                user: currentUser._id,
                name: currentUser.name,
                email: currentUser.email
            },
            createdBy: currentUser._id
        };

        // Create split expense
        const splitExpense = await splitService.createSplitExpense(expenseData);

        res.status(201).json({
            success: true,
            message: 'Split expense created successfully',
            data: splitExpense
        });
    } catch (error) {
        console.error('Create split error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create split expense',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/splits
 * @desc    Get user's split expenses
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
    try {
        const { groupId, isSettled, limit } = req.query;

        const options = {
            groupId: groupId || null,
            isSettled: isSettled === 'true' ? true : isSettled === 'false' ? false : undefined,
            limit: limit ? parseInt(limit) : 50
        };

        const expenses = await splitService.getUserSplitExpenses(req.user.id, options);

        res.json({
            success: true,
            data: expenses,
            count: expenses.length
        });
    } catch (error) {
        console.error('Get splits error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch split expenses',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/splits/balance
 * @desc    Get user's balance summary
 * @access  Private
 */
router.get('/balance', auth, async (req, res) => {
    try {
        const { groupId } = req.query;

        const balanceSummary = await splitService.getBalanceSummary(
            req.user.id,
            groupId || null
        );

        res.json({
            success: true,
            data: balanceSummary
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch balance',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/splits/group/:groupId
 * @desc    Get group's split expenses
 * @access  Private
 */
router.get('/group/:groupId', auth, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { isSettled, limit } = req.query;

        // Check if user is a member of the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        if (!group.isMember(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not a member of this group.'
            });
        }

        const options = {
            isSettled: isSettled === 'true' ? true : isSettled === 'false' ? false : undefined,
            limit: limit ? parseInt(limit) : 100
        };

        const expenses = await splitService.getGroupExpenses(groupId, options);

        res.json({
            success: true,
            data: expenses,
            count: expenses.length
        });
    } catch (error) {
        console.error('Get group expenses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch group expenses',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/splits/:id
 * @desc    Get split expense details
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const expense = await SplitExpense.findById(req.params.id)
            .populate('group', 'name icon')
            .populate('paidBy.user', 'name email')
            .populate('splits.user', 'name email');

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Split expense not found'
            });
        }

        // Check if user is involved in this expense
        const isInvolved = expense.paidBy.user._id.toString() === req.user.id ||
            expense.splits.some(s => s.user._id.toString() === req.user.id);

        if (!isInvolved) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: expense
        });
    } catch (error) {
        console.error('Get split expense error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch split expense',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/splits/:id/settle
 * @desc    Mark split as paid
 * @access  Private
 */
router.post('/:id/settle', auth, async (req, res) => {
    try {
        const expense = await SplitExpense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Split expense not found'
            });
        }

        // Find user's split
        const userSplit = expense.splits.find(s => s.user.toString() === req.user.id);

        if (!userSplit) {
            return res.status(403).json({
                success: false,
                message: 'You are not part of this split expense'
            });
        }

        if (userSplit.paid) {
            return res.status(400).json({
                success: false,
                message: 'This split is already marked as paid'
            });
        }

        await expense.markSplitPaid(req.user.id);

        res.json({
            success: true,
            message: 'Split marked as paid successfully',
            data: expense
        });
    } catch (error) {
        console.error('Settle split error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to settle split',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/splits/settlement
 * @desc    Record a settlement between users
 * @access  Private
 */
router.post('/settlement', auth, validateSettlement, async (req, res) => {
    try {
        const {
            paidToUserId,
            amount,
            currency,
            groupId,
            method,
            transactionId,
            notes,
            relatedExpenses
        } = req.body;

        // Get user details
        const paidBy = await User.findById(req.user.id);
        const paidTo = await User.findById(paidToUserId);

        if (!paidTo) {
            return res.status(404).json({
                success: false,
                message: 'Recipient user not found'
            });
        }

        // Prepare settlement data
        const settlementData = {
            paidBy: {
                user: paidBy._id,
                name: paidBy.name,
                email: paidBy.email
            },
            paidTo: {
                user: paidTo._id,
                name: paidTo.name,
                email: paidTo.email
            },
            amount,
            currency: currency || 'INR',
            groupId: groupId || null,
            method: method || 'cash',
            transactionId,
            notes,
            relatedExpenses: relatedExpenses || [],
            settledAt: new Date()
        };

        const settlement = await splitService.recordSettlement(settlementData);

        res.status(201).json({
            success: true,
            message: 'Settlement recorded successfully',
            data: settlement
        });
    } catch (error) {
        console.error('Record settlement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record settlement',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/splits/settlements
 * @desc    Get settlement history
 * @access  Private
 */
router.get('/settlements/history', auth, async (req, res) => {
    try {
        const { status, groupId, startDate, endDate, limit } = req.query;

        const options = {
            status,
            groupId,
            startDate,
            endDate,
            limit: limit ? parseInt(limit) : 100
        };

        const settlements = await Settlement.getUserSettlements(req.user.id, options);

        res.json({
            success: true,
            data: settlements,
            count: settlements.length
        });
    } catch (error) {
        console.error('Get settlements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settlements',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/splits/settlements/summary
 * @desc    Get settlement summary
 * @access  Private
 */
router.get('/settlements/summary', auth, async (req, res) => {
    try {
        const { groupId } = req.query;

        const summary = await Settlement.getSettlementSummary(
            req.user.id,
            groupId || null
        );

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Get settlement summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settlement summary',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/splits/:id
 * @desc    Delete split expense
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const expense = await SplitExpense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Split expense not found'
            });
        }

        // Only creator can delete
        if (expense.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only expense creator can delete this expense'
            });
        }

        // Cannot delete if any splits are paid
        const anyPaid = expense.splits.some(s => s.paid);
        if (anyPaid) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete expense with paid splits'
            });
        }

        await SplitExpense.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Split expense deleted successfully'
        });
    } catch (error) {
        console.error('Delete split error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete split expense',
            error: error.message
        });
    }
});

module.exports = router;
