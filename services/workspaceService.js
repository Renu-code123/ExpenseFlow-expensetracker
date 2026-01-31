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

        // Only owner or admin can update
        const member = workspace.members.find(m => m.user.toString() === userId.toString());
        if (!member || (member.role !== 'admin' && workspace.owner.toString() !== userId.toString())) {
            throw new Error('Only owners and admins can update workspace settings');
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

        // Check if requester is owner or admin
        const adminMember = workspace.members.find(m => m.user.toString() === adminId.toString());
        const isOwner = workspace.owner.toString() === adminId.toString();
        if (!isOwner && (!adminMember || adminMember.role !== 'admin')) {
            throw new Error('Only owners and admins can remove members');
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
        const isOwner = workspace.owner.toString() === adminId.toString();
        if (!isOwner && (!adminMember || adminMember.role !== 'admin')) {
            throw new Error('Only owners and admins can change roles');
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

    /**
     * Get workspace with active collaboration state (#471)
     */
    async getWorkspaceWithCollaboration(workspaceId, userId) {
        const workspace = await Workspace.findById(workspaceId)
            .populate('owner', 'name email avatar')
            .populate('members.user', 'name email avatar')
            .populate('activeUsers.user', 'name email avatar')
            .populate('locks.lockedBy', 'name email')
            .populate('discussions.messages.user', 'name email avatar');

        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Check user has access
        const hasAccess = workspace.hasPermission(userId, 'expenses:view');
        if (!hasAccess) {
            throw new Error('Access denied');
        }

        // Filter expired locks and typing indicators
        workspace.cleanExpiredLocks();
        workspace.typingUsers = workspace.typingUsers.filter(t => t.expiresAt > new Date());

        return workspace;
    }

    /**
     * Acquire lock on resource (#471)
     */
    async acquireLock(workspaceId, userId, resourceType, resourceId, lockDuration = 300) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        const permission = `${resourceType}s:edit`;
        const hasPermission = workspace.hasPermission(userId, permission);
        if (!hasPermission) throw new Error('Permission denied');

        const result = await workspace.acquireLock(resourceType, resourceId, userId, null, lockDuration);
        return result;
    }

    /**
     * Release lock on resource (#471)
     */
    async releaseLock(workspaceId, userId, resourceType, resourceId) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        await workspace.releaseLock(resourceType, resourceId, userId);
        return { success: true };
    }

    /**
     * Check if resource is locked (#471)
     */
    async checkLock(workspaceId, resourceType, resourceId, userId = null) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        const lockStatus = workspace.isLocked(resourceType, resourceId, userId);
        return lockStatus;
    }

    /**
     * Get discussions (#471)
     */
    async getDiscussions(workspaceId, parentType = null, parentId = null) {
        const workspace = await Workspace.findById(workspaceId)
            .populate('discussions.messages.user', 'name email avatar')
            .populate('discussions.resolvedBy', 'name email');

        if (!workspace) throw new Error('Workspace not found');

        let discussions = workspace.discussions;
        if (parentType) {
            discussions = discussions.filter(d => d.parentType === parentType);
            if (parentId) discussions = discussions.filter(d => d.parentId === parentId);
        }

        return discussions.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    }

    /**
     * Create discussion (#471)
     */
    async createDiscussion(workspaceId, userId, parentType, parentId, title, initialMessage) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');
        if (!workspace.collaborationSettings?.enableDiscussions) {
            throw new Error('Discussions are disabled');
        }

        await workspace.createDiscussion(parentType, parentId, title, userId, initialMessage);
        await workspace.populate('discussions.messages.user', 'name email avatar');

        return workspace.discussions[workspace.discussions.length - 1];
    }

    /**
     * Add message to discussion (#471)
     */
    async addDiscussionMessage(workspaceId, userId, discussionId, text, mentions = []) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        await workspace.addMessage(discussionId, userId, text, mentions);
        await workspace.populate('discussions.messages.user', 'name email avatar');

        const discussion = workspace.discussions.id(discussionId);
        return { discussion, message: discussion.messages[discussion.messages.length - 1] };
    }

    /**
     * Get collaboration statistics (#471)
     */
    async getCollaborationStats(workspaceId) {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        const now = new Date();
        const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

        return {
            activeUsers: workspace.activeUsers?.filter(u => u.lastSeen > fiveMinutesAgo).length || 0,
            activeLocks: workspace.locks?.filter(l => l.expiresAt > now).length || 0,
            totalDiscussions: workspace.discussions?.length || 0,
            openDiscussions: workspace.discussions?.filter(d => d.status === 'open').length || 0,
            settings: workspace.collaborationSettings || {}
        };
    }
}

module.exports = new WorkspaceService();
