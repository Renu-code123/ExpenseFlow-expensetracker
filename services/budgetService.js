// Simple budget service
class BudgetService {
  async checkBudgetAlerts(userId) {
    console.log(`Budget alerts checked for user ${userId}`);
    return { alerts: [] };
  }

  async updateGoalProgress(userId, amount, category) {
    console.log(`Goal progress updated for user ${userId}: ${amount} in ${category}`);
    return { success: true };
  }
}

module.exports = new BudgetService();