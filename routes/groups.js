const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateGroupCreation, validateGroupUpdate, validateAddMember } = require('../middleware/splitValidator');
const Group = require('../models/Group');
const User = require('../models/User');
const SplitExpense = require('../models/SplitExpense');

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 */
router.post('/', auth, validateGroupCreation, async (req, res) => {
    try {
        const { name, description, category, icon, currency, members, simplifyDebts } = req.body;

        // Add creator as first member
        const currentUser = await User.findById(req.user.id);
        const groupMembers = [{
            user: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            joinedAt: new Date(),
            isActive: true
        }];

        // Add other members
        for (const member of members) {
            // Check if user exists
            const user = await User.findById(member.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: `User not found: ${member.email}`
                });
            }

            // Don't add creator again
            if (user._id.toString() !== currentUser._id.toString()) {
                groupMembers.push({
                    user: user._id,
                    name: user.name,
                    email: user.email,
                    joinedAt: new Date(),
                    isActive: true
                });
            }
        }

        const group = new Group({
            name,
            description,
            category: category || 'other',
            icon: icon || '👥',
            currency: currency || 'INR',
            simplifyDebts: simplifyDebts !== undefined ? simplifyDebts : true,
            createdBy: req.user.id,
            members: groupMembers
        });

        await group.save();

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: group
        });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create group',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/groups
 * @desc    Get user's groups
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
    try {
        const groups = await Group.getUserGroups(req.user.id);

        res.json({
            success: true,
            data: groups,
            count: groups.length
        });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch groups',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/groups/:id
 * @desc    Get group details
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('members.user', 'name email')
            .populate('createdBy', 'name email');

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Check if user is a member
        if (!group.isMember(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not a member of this group.'
            });
        }

        // Get group expenses summary
        const expenses = await SplitExpense.find({ group: group._id });
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
        const unsettledExpenses = expenses.filter(exp => !exp.isSettled);

        res.json({
            success: true,
            data: {
                ...group.toObject(),
                stats: {
                    totalExpenses,
                    expenseCount: expenses.length,
                    unsettledCount: unsettledExpenses.length,
                    memberCount: group.getActiveMembers().length
                }
            }
        });
    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch group',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/groups/:id
 * @desc    Update group details
 * @access  Private
 */
router.put('/:id', auth, validateGroupUpdate, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Only creator can update group
        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only group creator can update group details'
            });
        }

        const { name, description, category, icon, simplifyDebts } = req.body;

        if (name) group.name = name;
        if (description !== undefined) group.description = description;
        if (category) group.category = category;
        if (icon) group.icon = icon;
        if (simplifyDebts !== undefined) group.simplifyDebts = simplifyDebts;

        await group.save();

        res.json({
            success: true,
            message: 'Group updated successfully',
            data: group
        });
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update group',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/groups/:id/members
 * @desc    Add member to group
 * @access  Private
 */
router.post('/:id/members', auth, validateAddMember, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Check if requester is a member
        if (!group.isMember(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'Only group members can add new members'
            });
        }

        const { userId, name, email } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await group.addMember({
            user: user._id,
            name: user.name,
            email: user.email
        });

        res.json({
            success: true,
            message: 'Member added successfully',
            data: group
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add member',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/groups/:id/members/:userId
 * @desc    Remove member from group
 * @access  Private
 */
router.delete('/:id/members/:userId', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Only creator or the member themselves can remove a member
        if (group.createdBy.toString() !== req.user.id && req.params.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to remove this member'
            });
        }

        await group.removeMember(req.params.userId);

        res.json({
            success: true,
            message: 'Member removed successfully',
            data: group
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove member',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/groups/:id
 * @desc    Delete group
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // Only creator can delete group
        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only group creator can delete the group'
            });
        }

        // Check if there are unsettled expenses
        const unsettledExpenses = await SplitExpense.find({
            group: group._id,
            isSettled: false
        });

        if (unsettledExpenses.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete group with unsettled expenses'
            });
        }

        group.isActive = false;
        await group.save();

        res.json({
            success: true,
            message: 'Group deleted successfully'
        });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete group',
            error: error.message
        });
    }
});

module.exports = router;
