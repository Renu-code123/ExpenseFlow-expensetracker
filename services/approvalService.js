const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const Expense = require('../models/Expense');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const notificationService = require('./notificationService');
const emailService = require('./emailService');

class ApprovalService {
    /**
     * Check if an expense requires approval
     */
    async requiresApproval(expenseData, workspaceId = null) {
        if (!workspaceId) return false;

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace || !workspace.settings.approvalRequired) return false;

        // Check if expense amount exceeds threshold
        return expenseData.amount >= workspace.settings.approvalThreshold;
    }

    /**
     * Submit expense for approval
     */
    async submitForApproval(expenseId, submittedBy) {
        const expense = await Expense.findById(expenseId).populate('workspace');
        if (!expense) throw new Error('Expense not found');

        if (!expense.workspace) throw new Error('Expense must belong to a workspace for approval');

        // Check if approval is required
        const requiresApproval = await this.requiresApproval(expense, expense.workspace._id);
        if (!requiresApproval) {
            throw new Error('This expense does not require approval');
        }

        // Get workspace managers and admins for approval chain
        const workspace = await Workspace.findById(expense.workspace._id)
            .populate('members.user', 'name email')
            .populate('owner', 'name email');

        const approvers = this.getApprovers(workspace);

        if (approvers.length === 0) {
            throw new Error('No approvers available for this workspace');
        }

        // Create approval workflow
        const workflow = new ApprovalWorkflow({
            workspaceId: expense.workspace._id,
            expenseId: expense._id,
            submittedBy: submittedBy,
            steps: approvers.map((approver, index) => ({
                stepNumber: index + 1,
                approver: approver._id,
                status: index === 0 ? 'pending' : 'pending'
            })),
            priority: this.calculatePriority(expense.amount, workspace.settings.approvalThreshold),
            dueDate: this.calculateDueDate(expense.amount, workspace.settings.approvalThreshold)
        });

        await workflow.save();

        // Update expense status
        expense.status = 'pending_approval';
        await expense.save();

        // Notify first approver
        await this.notifyApprover(workflow, approvers[0]);

        return workflow;
    }

    /**
     * Get list of approvers for a workspace
     */
    getApprovers(workspace) {
        const approvers = [];

        // Add owner as first approver
        approvers.push(workspace.owner);

        // Add admins and managers
        workspace.members.forEach(member => {
            if (['admin', 'manager'].includes(member.role)) {
                approvers.push(member.user);
            }
        });

        // Remove duplicates
        return [...new Set(approvers.map(a => a._id.toString()))]
            .map(id => approvers.find(a => a._id.toString() === id));
    }

    /**
     * Calculate approval priority based on amount
     */
    calculatePriority(amount, threshold) {
        const ratio = amount / threshold;
        if (ratio >= 5) return 'urgent';
        if (ratio >= 2) return 'high';
        if (ratio >= 1.5) return 'medium';
        return 'low';
    }

    /**
     * Calculate due date based on priority
     */
    calculateDueDate(amount, threshold) {
        const priority = this.calculatePriority(amount, threshold);
        const now = new Date();

        switch (priority) {
            case 'urgent': return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day
            case 'high': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
            case 'medium': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
            default: return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
        }
    }

    /**
     * Process approval decision
     */
    async processApproval(workflowId, approverId, decision, comments = '') {
        const workflow = await ApprovalWorkflow.findById(workflowId)
            .populate('expenseId')
            .populate('submittedBy', 'name email')
            .populate('steps.approver', 'name email');

        if (!workflow) throw new Error('Approval workflow not found');

        if (workflow.status !== 'pending') {
            throw new Error('Workflow is no longer pending');
        }

        const currentStep = workflow.steps[workflow.currentStep];
        if (!currentStep || currentStep.approver._id.toString() !== approverId.toString()) {
            throw new Error('You are not authorized to approve this request');
        }

        // Update current step
        currentStep.status = decision;
        currentStep.action = decision;
        currentStep.comments = comments;
        currentStep.actionDate = new Date();

        if (decision === 'approved') {
            // Move to next step or complete
            if (workflow.currentStep < workflow.steps.length - 1) {
                workflow.currentStep++;
                const nextStep = workflow.steps[workflow.currentStep];
                nextStep.status = 'pending';
                await this.notifyApprover(workflow, nextStep.approver);
            } else {
                // All steps approved
                workflow.status = 'approved';
                workflow.completedAt = new Date();
                await this.finalizeApproval(workflow);
            }
        } else if (decision === 'rejected') {
            // Reject the entire workflow
            workflow.status = 'rejected';
            workflow.finalComments = comments;
            workflow.completedAt = new Date();
            await this.finalizeRejection(workflow);
        }

        await workflow.save();

        // Notify submitter
        await this.notifySubmitter(workflow, decision, comments);

        return workflow;
    }

    /**
     * Finalize approved expense
     */
    async finalizeApproval(workflow) {
        const expense = await Expense.findById(workflow.expenseId);
        if (expense) {
            expense.status = 'approved';
            await expense.save();
        }

        // Send notification to submitter
        await notificationService.createNotification(
            workflow.submittedBy,
            'expense_approved',
            `Your expense "${expense.description}" has been approved`,
            { expenseId: expense._id, workflowId: workflow._id }
        );
    }

    /**
     * Finalize rejected expense
     */
    async finalizeRejection(workflow) {
        const expense = await Expense.findById(workflow.expenseId);
        if (expense) {
            expense.status = 'rejected';
            await expense.save();
        }

        // Send notification to submitter
        await notificationService.createNotification(
            workflow.submittedBy,
            'expense_rejected',
            `Your expense "${expense.description}" has been rejected`,
            { expenseId: expense._id, workflowId: workflow._id }
        );
    }

    /**
     * Notify approver of pending approval
     */
    async notifyApprover(workflow, approver) {
        const expense = await Expense.findById(workflow.expenseId);

        await notificationService.createNotification(
            approver._id,
            'approval_request',
            `Approval needed for expense: ${expense.description} (₹${expense.amount})`,
            { expenseId: expense._id, workflowId: workflow._id }
        );

        // Send email
        await emailService.sendApprovalRequest(approver.email, {
            expense: expense,
            workflow: workflow,
            approver: approver
        });
    }

    /**
     * Notify submitter of approval decision
     */
    async notifySubmitter(workflow, decision, comments) {
        const expense = await Expense.findById(workflow.expenseId);

        await notificationService.createNotification(
            workflow.submittedBy,
            `expense_${decision}`,
            `Your expense "${expense.description}" has been ${decision}`,
            { expenseId: expense._id, workflowId: workflow._id, comments }
        );
    }

    /**
     * Get pending approvals for a user
     */
    async getPendingApprovals(userId) {
        return await ApprovalWorkflow.find({
            'steps.approver': userId,
            'steps.status': 'pending',
            status: 'pending'
        })
        .populate('expenseId')
        .populate('submittedBy', 'name email')
        .populate('workspaceId', 'name')
        .sort({ createdAt: -1 });
    }

    /**
     * Get approval history for a user
     */
    async getApprovalHistory(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        return await ApprovalWorkflow.find({
            $or: [
                { submittedBy: userId },
                { 'steps.approver': userId }
            ]
        })
        .populate('expenseId')
        .populate('submittedBy', 'name email')
        .populate('workspaceId', 'name')
        .populate('steps.approver', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    /**
     * Get workflow by ID
     */
    async getWorkflowById(workflowId, userId) {
        const workflow = await ApprovalWorkflow.findById(workflowId)
            .populate('expenseId')
            .populate('submittedBy', 'name email')
            .populate('workspaceId', 'name')
            .populate('steps.approver', 'name email');

        if (!workflow) throw new Error('Workflow not found');

        // Check if user has access
        const hasAccess = workflow.submittedBy._id.toString() === userId.toString() ||
                         workflow.steps.some(step => step.approver._id.toString() === userId.toString());

        if (!hasAccess) throw new Error('Access denied');

        return workflow;
    }
}

module.exports = new ApprovalService();