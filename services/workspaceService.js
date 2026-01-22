const Workspace = require('../models/Workspace');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

class WorkspaceService {
    /**
     * Create a new workspace
     */
    async createWorkspace(userId, data) {
        const workspace = new Workspace({
            ...data,
            owner: userId
        });
        await workspace.save();
        return workspace;
    }

    /**
     * Get all workspaces for a user (owned or member)
     */
    async getUserWorkspaces(userId) {
        return await Workspace.find({
            'members.user': userId,
            isActive: true
        }).populate('owner', 'name email');
    }

    /**
     * Get single workspace with members
     */
    async getWorkspaceById(workspaceId, userId) {
        const workspace = await Workspace.findById(workspaceId)
            .populate('members.user', 'name email')
            .populate('owner', 'name email');

        if (!workspace) throw new Error('Workspace not found');

        // Check if user is member
        const isMember = workspace.members.some(m => m.user._id.toString() === userId.toString());
        if (!isMember) throw new Error('Not authorized to view this workspace');

        return workspace;
    }

    /**
     * Update workspace
     */
    async updateWorkspace(workspaceId, userId, data) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        // Only admin can update
        const member = workspace.members.find(m => m.user.toString() === userId.toString());
        if (!member || member.role !== 'admin') {
            throw new Error('Only admins can update workspace settings');
        }

        Object.assign(workspace, data);
        await workspace.save();
        return workspace;
    }

    /**
     * Remove member from workspace
     */
    async removeMember(workspaceId, adminId, targetUserId) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        // Check if requester is admin
        const adminMember = workspace.members.find(m => m.user.toString() === adminId.toString());
        if (!adminMember || adminMember.role !== 'admin') {
            throw new Error('Only admins can remove members');
        }

        // Cannot remove owner
        if (workspace.owner.toString() === targetUserId.toString()) {
            throw new Error('Cannot remove the workspace owner');
        }

        workspace.members = workspace.members.filter(m => m.user.toString() !== targetUserId.toString());
        await workspace.save();
        return workspace;
    }

    /**
     * Update member role
     */
    async updateMemberRole(workspaceId, adminId, targetUserId, newRole) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        const adminMember = workspace.members.find(m => m.user.toString() === adminId.toString());
        if (!adminMember || adminMember.role !== 'admin') {
            throw new Error('Only admins can change roles');
        }

        const member = workspace.members.find(m => m.user.toString() === targetUserId.toString());
        if (!member) throw new Error('User is not a member of this workspace');

        member.role = newRole;
        await workspace.save();
        return workspace;
    }

    /**
     * Get workspace statistics
     */
    async getWorkspaceStats(workspaceId) {
        const stats = await Expense.aggregate([
            { $match: { workspace: new mongoose.Types.ObjectId(workspaceId) } },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const categoryBreakdown = await Expense.aggregate([
            { $match: { workspace: new mongoose.Types.ObjectId(workspaceId), type: 'expense' } },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        return {
            summary: stats,
            categoryBreakdown
        };
    }
}

module.exports = new WorkspaceService();
