const GoalAnalytics = {
    // 1. Calculate Average Monthly Savings from main app data
    getMonthlySavingsRate() {
        const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        if (transactions.length === 0) return 0;

        const totals = transactions.reduce((acc, t) => acc + t.amount, 0);
        // Find the date of the first transaction to get the time span
        const firstDate = new Date(Math.min(...transactions.map(t => t.id)));
        const months = Math.max((new Date() - firstDate) / (1000 * 60 * 60 * 24 * 30.44), 1);
        
        return totals / months;
    },

    // 2. Predict completion date for a specific goal
    predictCompletion(targetAmount) {
        const savingsRate = this.getMonthlySavingsRate();
        const currentBalance = (JSON.parse(localStorage.getItem('transactions')) || [])
                                .reduce((acc, t) => acc + t.amount, 0);
        
        if (savingsRate <= 0) return "Increase savings to see prediction";

        const remaining = targetAmount - currentBalance;
        if (remaining <= 0) return "Goal Achieved!";

        const monthsToWait = Math.ceil(remaining / savingsRate);
        const completionDate = new Date();
        completionDate.setMonth(completionDate.getMonth() + monthsToWait);

        return completionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
};