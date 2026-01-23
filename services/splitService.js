const SplitExpense = require('../models/SplitExpense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const User = require('../models/User');

class SplitService {
    /**
     * Calculate split amounts based on split type
     * @param {number} totalAmount - Total amount to split
     * @param {Array} members - Array of member objects
     * @param {string} splitType - Type of split (equal, exact, percentage, shares)
     * @param {Object} splitData - Additional split data
     * @returns {Array} Array of split objects with calculated amounts
     */
    calculateSplits(totalAmount, members, splitType, splitData = {}) {
        const splits = [];

        switch (splitType) {
            case 'equal':
                const equalAmount = parseFloat((totalAmount / members.length).toFixed(2));
                let remainder = parseFloat((totalAmount - (equalAmount * members.length)).toFixed(2));
                
                members.forEach((member, index) => {
                    let amount = equalAmount;
                    // Add remainder to first person to ensure exact total
                    if (index === 0 && remainder !== 0) {
                        amount = parseFloat((amount + remainder).toFixed(2));
                    }
                    
                    splits.push({
                        user: member.user,
                        name: member.name,
                        email: member.email,
                        amount: amount,
                        paid: false
                    });
                });
                break;

            case 'exact':
                if (!splitData.amounts || splitData.amounts.length !== members.length) {
                    throw new Error('Exact amounts required for all members');
                }
                
                const totalExact = splitData.amounts.reduce((sum, amt) => sum + parseFloat(amt), 0);
                if (Math.abs(totalExact - totalAmount) > 0.01) {
                    throw new Error('Sum of exact amounts must equal total amount');
                }
                
                members.forEach((member, index) => {
                    splits.push({
                        user: member.user,
                        name: member.name,
                        email: member.email,
                        amount: parseFloat(splitData.amounts[index].toFixed(2)),
                        paid: false
                    });
                });
                break;

            case 'percentage':
                if (!splitData.percentages || splitData.percentages.length !== members.length) {
                    throw new Error('Percentages required for all members');
                }
                
                const totalPercentage = splitData.percentages.reduce((sum, pct) => sum + pct, 0);
                if (Math.abs(totalPercentage - 100) > 0.01) {
                    throw new Error('Percentages must sum to 100');
                }
                
                let remainderPct = totalAmount;
                members.forEach((member, index) => {
                    const percentage = splitData.percentages[index];
                    let amount;
                    
                    if (index === members.length - 1) {
                        // Last person gets remainder to ensure exact total
                        amount = remainderPct;
                    } else {
                        amount = parseFloat(((totalAmount * percentage) / 100).toFixed(2));
                        remainderPct -= amount;
                    }
                    
                    splits.push({
                        user: member.user,
                        name: member.name,
                        email: member.email,
                        amount: amount,
                        percentage: percentage,
                        paid: false
                    });
                });
                break;

            case 'shares':
                if (!splitData.shares || splitData.shares.length !== members.length) {
                    throw new Error('Shares required for all members');
                }
                
                const totalShares = splitData.shares.reduce((sum, share) => sum + share, 0);
                if (totalShares === 0) {
                    throw new Error('Total shares must be greater than 0');
                }
                
                const amountPerShare = totalAmount / totalShares;
                let remainderShares = totalAmount;
                
                members.forEach((member, index) => {
                    const shares = splitData.shares[index];
                    let amount;
                    
                    if (index === members.length - 1) {
                        // Last person gets remainder
                        amount = remainderShares;
                    } else {
                        amount = parseFloat((amountPerShare * shares).toFixed(2));
                        remainderShares -= amount;
                    }
                    
                    splits.push({
                        user: member.user,
                        name: member.name,
                        email: member.email,
                        amount: amount,
                        shares: shares,
                        paid: false
                    });
                });
                break;

            default:
                throw new Error('Invalid split type');
        }

        return splits;
    }

    /**
     * Create a split expense
     * @param {Object} expenseData - Expense data
     * @returns {Promise<Object>} Created split expense
     */
    async createSplitExpense(expenseData) {
        const { paidBy, members, totalAmount, splitType, splitData, groupId } = expenseData;

        // Validate group membership if group expense
        if (groupId) {
            const group = await Group.findById(groupId);
            if (!group) {
                throw new Error('Group not found');
            }
            
            // Ensure all members are in the group
            const groupMemberIds = group.getActiveMembers().map(m => m.user.toString());
            const allMembersInGroup = members.every(m => 
                groupMemberIds.includes(m.user.toString())
            );
            
            if (!allMembersInGroup) {
                throw new Error('All members must be part of the group');
            }
        }

        // Calculate splits
        const splits = this.calculateSplits(totalAmount, members, splitType, splitData);

        // Mark paidBy user's split as paid
        const paidBySplit = splits.find(s => s.user.toString() === paidBy.user.toString());
        if (paidBySplit) {
            paidBySplit.paid = true;
            paidBySplit.paidAt = new Date();
        }

        // Create split expense
        const splitExpense = new SplitExpense({
            ...expenseData,
            splits: splits
        });

        await splitExpense.save();

        // Update group total if applicable
        if (groupId) {
            await Group.findByIdAndUpdate(groupId, {
                $inc: { totalExpenses: totalAmount }
            });
        }

        return splitExpense;
    }

    /**
     * Simplify debts between users (minimize transactions)
     * @param {Array} balances - Array of balance objects
     * @returns {Array} Simplified transactions
     */
    simplifyDebts(balances) {
        const creditors = []; // People who are owed money
        const debtors = [];   // People who owe money

        balances.forEach(balance => {
            if (balance.amount > 0.01) {
                creditors.push({ ...balance });
            } else if (balance.amount < -0.01) {
                debtors.push({ ...balance, amount: -balance.amount });
            }
        });

        const transactions = [];

        // Sort by amount (highest first)
        creditors.sort((a, b) => b.amount - a.amount);
        debtors.sort((a, b) => b.amount - a.amount);

        let i = 0, j = 0;

        while (i < creditors.length && j < debtors.length) {
            const creditor = creditors[i];
            const debtor = debtors[j];

            const amount = Math.min(creditor.amount, debtor.amount);

            if (amount > 0.01) {
                transactions.push({
                    from: debtor.userId,
                    fromName: debtor.name,
                    to: creditor.userId,
                    toName: creditor.name,
                    amount: parseFloat(amount.toFixed(2))
                });
            }

            creditor.amount -= amount;
            debtor.amount -= amount;

            if (creditor.amount < 0.01) i++;
            if (debtor.amount < 0.01) j++;
        }

        return transactions;
    }

    /**
     * Record a settlement between users
     * @param {Object} settlementData - Settlement data
     * @returns {Promise<Object>} Created settlement
     */
    async recordSettlement(settlementData) {
        const { paidBy, paidTo, amount, groupId } = settlementData;

        // Validate users are different
        if (paidBy.user.toString() === paidTo.user.toString()) {
            throw new Error('Cannot settle with yourself');
        }

        // Create settlement
        const settlement = new Settlement(settlementData);
        await settlement.save();

        // Update group settled amount if applicable
        if (groupId) {
            await Group.findByIdAndUpdate(groupId, {
                $inc: { settledAmount: amount }
            });
        }

        // Mark related split expenses as paid
        if (settlementData.relatedExpenses && settlementData.relatedExpenses.length > 0) {
            for (const expenseId of settlementData.relatedExpenses) {
                const expense = await SplitExpense.findById(expenseId);
                if (expense) {
                    await expense.markSplitPaid(paidBy.user);
                }
            }
        }

        return settlement;
    }

    /**
     * Get balance summary for a user
     * @param {string} userId - User ID
     * @param {string} groupId - Optional group ID
     * @returns {Promise<Object>} Balance summary
     */
    async getBalanceSummary(userId, groupId = null) {
        let balances;

        if (groupId) {
            balances = await SplitExpense.getGroupBalances(groupId);
            // Filter balances involving the user
            balances = balances.filter(b => 
                b.from.toString() === userId.toString() || 
                b.to.toString() === userId.toString()
            );
        } else {
            balances = await SplitExpense.calculateUserBalance(userId);
        }

        const settlements = await Settlement.getSettlementSummary(userId, groupId);

        return {
            balances: balances,
            settlements: settlements,
            simplifiedDebts: this.simplifyDebts(balances)
        };
    }

    /**
     * Get user's split expenses
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of split expenses
     */
    async getUserSplitExpenses(userId, options = {}) {
        const query = {
            $or: [
                { 'paidBy.user': userId },
                { 'splits.user': userId }
            ]
        };

        if (options.groupId) {
            query.group = options.groupId;
        }

        if (options.isSettled !== undefined) {
            query.isSettled = options.isSettled;
        }

        return await SplitExpense.find(query)
            .populate('group', 'name icon')
            .sort({ date: -1 })
            .limit(options.limit || 50);
    }

    /**
     * Get group expenses
     * @param {string} groupId - Group ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of split expenses
     */
    async getGroupExpenses(groupId, options = {}) {
        const query = { group: groupId };

        if (options.isSettled !== undefined) {
            query.isSettled = options.isSettled;
        }

        return await SplitExpense.find(query)
            .populate('paidBy.user splits.user', 'name email')
            .sort({ date: -1 })
            .limit(options.limit || 100);
    }
}

module.exports = new SplitService();
