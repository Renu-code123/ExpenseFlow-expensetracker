const ApprovalRequest = require('../models/ApprovalRequest');
const SharedSpace = require('../models/SharedSpace');
const SpaceActivity = require('../models/SpaceActivity');
const Expense = require('../models/Expense');
const emailService = require('./emailService');

class ApprovalService {
    // Create approval request
    async createApprovalRequest(spaceId, requesterId, expenseData, priority = 'medium') {
        const space = await SharedSpace.findById(spaceId).populate('members.user', 'name email');
        
        if (!space) {
            throw new Error('Shared space not found');
        }
        
        if (!space.isMember(requesterId)) {
            throw new Error('You are not a member of this space');
        }
        
        // Check if approval is required
        const requiresApproval = expenseData.amount >= space.settings.require_approval_above;
        
        if (!requiresApproval) {
            throw new Error('Approval not required for this expense amount');
        }
        
        // Create approval request
        const approvalRequest = new ApprovalRequest({
            space: spaceId,
            requester: requesterId,
            expense_data: expenseData,
            required_approvals: space.settings.approval_threshold_count || 1,
            priority,
            status: 'pending'
        });
        
        await approvalRequest.save();
        
        // Log activity
        await SpaceActivity.logActivity({
            space: spaceId,
            actor: requesterId,
            action: 'approval_requested',
            target_type: 'approval',
            target_id: approvalRequest._id,
            details: {
                amount: expenseData.amount,
                description: expenseData.description
            }
        });
        
        // Notify approvers
        await this.notifyApprovers(space, approvalRequest);
        
        return approvalRequest;
    }
    
    // Process approval decision
    async processApproval(requestId, approverId, decision, comment = null) {
        const request = await ApprovalRequest.findById(requestId)
            .populate('requester', 'name email')
            .populate('space');
        
        if (!request) {
            throw new Error('Approval request not found');
        }
        
        if (request.status !== 'pending') {
            throw new Error('This approval request is no longer pending');
        }
        
        const space = await SharedSpace.findById(request.space._id);
        
        if (!space) {
            throw new Error('Shared space not found');
        }
        
        // Check if user has permission to approve
        if (!space.hasPermission(approverId, 'approve_expenses')) {
            throw new Error('You do not have permission to approve expenses');
        }
        
        // Cannot approve own request
        if (request.requester._id.toString() === approverId.toString()) {
            throw new Error('You cannot approve your own expense request');
        }
        
        // Add approval
        await request.addApproval(approverId, decision, comment);
        
        // Log activity
        await SpaceActivity.logActivity({
            space: request.space._id,
            actor: approverId,
            action: decision === 'approved' ? 'approval_granted' : 'approval_denied',
            target_type: 'approval',
            target_id: requestId,
            details: {
                amount: request.expense_data.amount,
                comment: comment
            }
        });
        
        // If approved, create the expense
        if (request.status === 'approved') {
            const expense = await this.createApprovedExpense(request);
            request.expense_id = expense._id;
            await request.save();
            
            // Notify requester
            await this.notifyRequesterApproved(request, expense);
            
            // Log expense creation
            await SpaceActivity.logActivity({
                space: request.space._id,
                actor: approverId,
                action: 'expense_added',
                target_type: 'expense',
                target_id: expense._id,
                details: {
                    amount: expense.amount,
                    description: expense.description,
                    approval_id: requestId
                }
            });
        }
        // If rejected, notify requester
        else if (request.status === 'rejected') {
            await this.notifyRequesterRejected(request, comment);
        }
        
        return request;
    }
    
    // Create expense from approved request
    async createApprovedExpense(request) {
        const expense = new Expense({
            user: request.requester._id,
            description: request.expense_data.description,
            amount: request.expense_data.amount,
            category: request.expense_data.category,
            date: request.expense_data.date || new Date(),
            notes: request.expense_data.notes,
            receipt_url: request.expense_data.receipt_url,
            shared_space: request.space._id,
            approval_required: true,
            approved: true,
            approved_by: request.final_decision_by,
            approved_at: request.final_decision_at
        });
        
        await expense.save();
        return expense;
    }
    
    // Cancel approval request
    async cancelRequest(requestId, userId) {
        const request = await ApprovalRequest.findById(requestId);
        
        if (!request) {
            throw new Error('Approval request not found');
        }
        
        if (request.requester.toString() !== userId.toString()) {
            throw new Error('You can only cancel your own requests');
        }
        
        await request.cancel();
        
        // Log activity
        await SpaceActivity.logActivity({
            space: request.space,
            actor: userId,
            action: 'approval_requested',
            target_type: 'approval',
            target_id: requestId,
            details: { description: 'Request cancelled by requester' }
        });
        
        return request;
    }
    
    // Get pending requests for a space
    async getPendingRequests(spaceId, userId) {
        const space = await SharedSpace.findById(spaceId);
        
        if (!space) {
            throw new Error('Shared space not found');
        }
        
        if (!space.isMember(userId)) {
            throw new Error('You are not a member of this space');
        }
        
        // If user can approve, show all pending
        if (space.hasPermission(userId, 'approve_expenses')) {
            return ApprovalRequest.getPendingForSpace(spaceId);
        }
        
        // Otherwise, only show user's own requests
        return ApprovalRequest.find({ 
            space: spaceId,
            requester: userId,
            status: 'pending'
        }).populate('approvals.approver', 'name');
    }
    
    // Notify approvers of new request
    async notifyApprovers(space, request) {
        // Get members with approval permission
        const approvers = space.members.filter(m => 
            m.permissions.approve_expenses && 
            m.user.toString() !== request.requester.toString()
        );
        
        for (const approver of approvers) {
            // Check notification preferences
            if (approver.notification_preferences?.approval_request !== false) {
                try {
                    await emailService.sendApprovalRequestNotification({
                        to: approver.user.email,
                        requester_name: request.requester.name,
                        space_name: space.name,
                        amount: request.expense_data.amount,
                        description: request.expense_data.description,
                        priority: request.priority,
                        request_id: request._id
                    });
                } catch (error) {
                    console.error('Failed to send approval notification:', error);
                }
            }
        }
    }
    
    // Notify requester of approval
    async notifyRequesterApproved(request, expense) {
        try {
            await emailService.sendApprovalResultNotification({
                to: request.requester.email,
                space_name: request.space.name,
                amount: request.expense_data.amount,
                description: request.expense_data.description,
                status: 'approved',
                expense_id: expense._id
            });
        } catch (error) {
            console.error('Failed to send approval result notification:', error);
        }
    }
    
    // Notify requester of rejection
    async notifyRequesterRejected(request, comment) {
        try {
            await emailService.sendApprovalResultNotification({
                to: request.requester.email,
                space_name: request.space.name,
                amount: request.expense_data.amount,
                description: request.expense_data.description,
                status: 'rejected',
                comment: comment
            });
        } catch (error) {
            console.error('Failed to send rejection notification:', error);
        }
    }
    
    // Cleanup expired requests
    async cleanupExpiredRequests() {
        const expiredRequests = await ApprovalRequest.find({
            status: 'pending',
            expires_at: { $lt: new Date() }
        });
        
        for (const request of expiredRequests) {
            request.status = 'cancelled';
            request.final_decision_at = new Date();
            await request.save();
            
            await SpaceActivity.logActivity({
                space: request.space,
                actor: request.requester,
                action: 'approval_requested',
                target_type: 'approval',
                target_id: request._id,
                details: { description: 'Request expired' }
            });
        }
        
        return expiredRequests.length;
    }
}

module.exports = new ApprovalService();
