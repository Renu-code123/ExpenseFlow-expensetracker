// Budget and Goals Management
class BudgetGoalsManager {
  constructor() {
    this.apiUrl = '/api';
    this.authToken = localStorage.getItem('authToken');
    this.initializeDashboard();
  }
  
  formatCurrency(value) {
    const formatter = window.i18n?.formatCurrency;
    if (typeof formatter === 'function') return formatter(value);
    const numericValue = Number(value) || 0;
    const symbol = window.i18n?.getCurrencySymbol?.(window.i18n?.getCurrency?.() || '') || '';
    return `${symbol}${numericValue.toFixed(2)}`;
  }

  // Initialize budget and goals dashboard
  initializeDashboard() {
    const dashboardHTML = `
      <div id="budget-goals-dashboard" class="dashboard" style="display: none;">
        <div class="dashboard-header">
          <h2>💰 Budget & Goals Management</h2>
          <div class="dashboard-actions">
            <button id="add-budget-btn" class="btn btn-primary">+ Add Budget</button>
            <button id="add-goal-btn" class="btn btn-secondary">🎯 Add Goal</button>
          </div>
        </div>

        <div class="dashboard-summary">
          <div class="summary-card">
            <h3>Budget Overview</h3>
            <div id="budget-summary">
              <div class="metric">
                <span class="label">Total Budget:</span>
                <span id="total-budget" class="value">0</span>
              </div>
              <div class="metric">
                <span class="label">Total Spent:</span>
                <span id="total-spent" class="value">0</span>
              </div>
              <div class="metric">
                <span class="label">Remaining:</span>
                <span id="remaining-budget" class="value">0</span>
              </div>
            </div>
          </div>

          <div class="summary-card">
            <h3>Goals Progress</h3>
            <div id="goals-summary">
              <div class="metric">
                <span class="label">Active Goals:</span>
                <span id="active-goals" class="value">0</span>
              </div>
              <div class="metric">
                <span class="label">Completed:</span>
                <span id="completed-goals" class="value">0</span>
              </div>
              <div class="metric">
                <span class="label">Overall Progress:</span>
                <span id="overall-progress" class="value">0%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="dashboard-content">
          <div class="budgets-section">
            <h3>📊 Current Budgets</h3>
            <div id="budgets-list" class="items-list"></div>
          </div>

          <div class="goals-section">
            <h3>🎯 Active Goals</h3>
            <div id="goals-list" class="items-list"></div>
          </div>
        </div>

        <div class="alerts-section">
          <h3>⚠️ Budget Alerts</h3>
          <div id="budget-alerts" class="alerts-list"></div>
        </div>
      </div>

      <!-- Budget Modal -->
      <div id="budget-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <h3>Create Budget</h3>
          <form id="budget-form">
            <input type="text" id="budget-name" placeholder="Budget Name" required>
            <select id="budget-category" required>
              <option value="">Select Category</option>
              <option value="food">🍽️ Food & Dining</option>
              <option value="transport">🚗 Transportation</option>
              <option value="shopping">🛒 Shopping</option>
              <option value="entertainment">🎬 Entertainment</option>
              <option value="utilities">💡 Utilities</option>
              <option value="healthcare">🏥 Healthcare</option>
              <option value="other">📋 Other</option>
              <option value="all">💰 Total Budget</option>
            </select>
            <input type="number" id="budget-amount" placeholder="Budget Amount" min="0" required>
            <select id="budget-period">
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input type="range" id="alert-threshold" min="50" max="100" value="80">
            <label>Alert at <span id="threshold-value">80</span>%</label>
            <div class="modal-actions">
              <button type="submit">Create Budget</button>
              <button type="button" id="close-budget-modal">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Goal Modal -->
      <div id="goal-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <h3>Create Goal</h3>
          <form id="goal-form">
            <input type="text" id="goal-title" placeholder="Goal Title" required>
            <textarea id="goal-description" placeholder="Goal Description"></textarea>
            <select id="goal-type" required>
              <option value="">Select Goal Type</option>
              <option value="savings">💰 Savings Target</option>
              <option value="expense_reduction">📉 Expense Reduction</option>
              <option value="income_increase">📈 Income Increase</option>
              <option value="debt_payoff">💳 Debt Payoff</option>
            </select>
            <input type="number" id="goal-target" placeholder="Target Amount" min="0" required>
            <input type="date" id="goal-date" required>
            <select id="goal-priority">
              <option value="low">Low Priority</option>
              <option value="medium" selected>Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <div class="modal-actions">
              <button type="submit">Create Goal</button>
              <button type="button" id="close-goal-modal">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', dashboardHTML);
    this.addDashboardStyles();
    this.setupEventListeners();
  }



  // Setup event listeners
  setupEventListeners() {
    // Dashboard toggle
    document.getElementById('add-budget-btn').addEventListener('click', () => this.showBudgetModal());
    document.getElementById('add-goal-btn').addEventListener('click', () => this.showGoalModal());

    // Modal controls
    document.getElementById('close-budget-modal').addEventListener('click', () => this.hideBudgetModal());
    document.getElementById('close-goal-modal').addEventListener('click', () => this.hideGoalModal());

    window.addEventListener('hashchange', () => {
      if (location.hash === '#goals') this.showDashboard();
      else if (location.hash === '#dashboard' || location.hash === '') this.hideDashboard();
    });

    // Check initial hash
    if (location.hash === '#goals') this.showDashboard();

    // Form submissions
    document.getElementById('budget-form').addEventListener('submit', (e) => this.handleBudgetSubmit(e));
    document.getElementById('goal-form').addEventListener('submit', (e) => this.handleGoalSubmit(e));

    // Alert threshold slider
    document.getElementById('alert-threshold').addEventListener('input', (e) => {
      document.getElementById('threshold-value').textContent = e.target.value;
    });
  }

  // Show dashboard
  showDashboard() {
    document.getElementById('budget-goals-dashboard').style.display = 'block';
    this.loadDashboardData();
  }

  // Hide dashboard
  hideDashboard() {
    document.getElementById('budget-goals-dashboard').style.display = 'none';
  }

  // Load dashboard data
  async loadDashboardData() {
    this.authToken = localStorage.getItem('authToken');
    if (!this.authToken) return;

    try {
      await Promise.all([
        this.loadBudgetSummary(),
        this.loadGoalsSummary(),
        this.loadBudgets(),
        this.loadGoals(),
        this.loadBudgetAlerts()
      ]);
    } catch (error) {
      this.showNotification('Failed to load dashboard data', 'error');
    }
  }

  // Load budget summary
  async loadBudgetSummary() {
    try {
      const response = await fetch(`${this.apiUrl}/budgets/summary`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      if (!response.ok) throw new Error('Failed to load budget summary');
      const summary = await response.json();

      document.getElementById('total-budget').textContent = this.formatCurrency(summary.totalBudget);
      document.getElementById('total-spent').textContent = this.formatCurrency(summary.totalSpent);
      document.getElementById('remaining-budget').textContent = this.formatCurrency(summary.remainingBudget);
    } catch (error) {
      console.error('Budget summary error:', error);
    }
  }

  // Load goals summary
  async loadGoalsSummary() {
    try {
      const response = await fetch(`${this.apiUrl}/goals/summary`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      if (!response.ok) throw new Error('Failed to load goals summary');
      const summary = await response.json();

      document.getElementById('active-goals').textContent = summary.active;
      document.getElementById('completed-goals').textContent = summary.completed;
      document.getElementById('overall-progress').textContent = `${summary.overallProgress.toFixed(1)}%`;
    } catch (error) {
      console.error('Goals summary error:', error);
    }
  }

  // Load budgets
  async loadBudgets() {
    try {
      const response = await fetch(`${this.apiUrl}/budgets?active=true`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      if (!response.ok) throw new Error('Failed to load budgets');
      const budgets = await response.json();

      this.displayBudgets(budgets);
    } catch (error) {
      console.error('Budgets loading error:', error);
    }
  }

  // Display budgets
  displayBudgets(budgets) {
    const container = document.getElementById('budgets-list');
    container.innerHTML = '';

    budgets.forEach(budget => {
      const percentage = (budget.spent / budget.amount) * 100;
      const isOverBudget = percentage > 100;

      const budgetItem = document.createElement('div');
      budgetItem.className = `budget-item ${isOverBudget ? 'over-budget' : ''}`;
      budgetItem.innerHTML = `
        <div class="budget-header">
          <h4>${budget.name}</h4>
          <span class="budget-percentage ${isOverBudget ? 'over' : ''}">${percentage.toFixed(1)}%</span>
        </div>
        <div class="budget-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
          </div>
        </div>
        <div class="budget-details">
          <span>${this.formatCurrency(budget.spent)} / ${this.formatCurrency(budget.amount)}</span>
          <span class="remaining">${this.formatCurrency(budget.amount - budget.spent)} remaining</span>
        </div>
      `;

      container.appendChild(budgetItem);
    });
  }

  // Load goals
  async loadGoals() {
    try {
      const response = await fetch(`${this.apiUrl}/goals?status=active`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      if (!response.ok) throw new Error('Failed to load goals');
      const goals = await response.json();

      this.displayGoals(goals);
    } catch (error) {
      console.error('Goals loading error:', error);
    }
  }

  // Display goals
  displayGoals(goals) {
    const container = document.getElementById('goals-list');
    container.innerHTML = '';

    goals.forEach(goal => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));

      const goalItem = document.createElement('div');
      goalItem.className = 'goal-item';
      goalItem.innerHTML = `
        <div class="goal-header">
          <h4>${goal.title}</h4>
          <span class="goal-type">${goal.goalType.replace('_', ' ')}</span>
        </div>
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
          </div>
          <span class="progress-text">${progress.toFixed(1)}%</span>
        </div>
        <div class="goal-details">
          <span>${this.formatCurrency(goal.currentAmount)} / ${this.formatCurrency(goal.targetAmount)}</span>
          <span class="days-left">${daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}</span>
        </div>
      `;

      container.appendChild(goalItem);
    });
  }

  // Load budget alerts
  async loadBudgetAlerts() {
    try {
      const response = await fetch(`${this.apiUrl}/budgets/alerts`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      if (!response.ok) throw new Error('Failed to load alerts');
      const alerts = await response.json();

      this.displayAlerts(alerts);
    } catch (error) {
      console.error('Alerts loading error:', error);
    }
  }

  // Display alerts
  displayAlerts(alerts) {
    const container = document.getElementById('budget-alerts');
    container.innerHTML = '';

    if (alerts.length === 0) {
      container.innerHTML = '<p class="no-alerts">✅ No budget alerts</p>';
      return;
    }

    alerts.forEach(alert => {
      const alertItem = document.createElement('div');
      alertItem.className = `alert-item ${alert.isOverBudget ? 'critical' : 'warning'}`;
      alertItem.innerHTML = `
        <div class="alert-icon">${alert.isOverBudget ? '🚨' : '⚠️'}</div>
        <div class="alert-content">
          <h4>${alert.budgetName}</h4>
          <p>${alert.isOverBudget ? 'Over budget' : 'Approaching limit'}: ${alert.percentage.toFixed(1)}%</p>
          <span>${this.formatCurrency(alert.spent)} / ${this.formatCurrency(alert.amount)}</span>
        </div>
      `;

      container.appendChild(alertItem);
    });
  }

  // Show budget modal
  showBudgetModal() {
    document.getElementById('budget-modal').style.display = 'flex';
  }

  // Hide budget modal
  hideBudgetModal() {
    document.getElementById('budget-modal').style.display = 'none';
    document.getElementById('budget-form').reset();
  }

  // Show goal modal
  showGoalModal() {
    document.getElementById('goal-modal').style.display = 'flex';
  }

  // Hide goal modal
  hideGoalModal() {
    document.getElementById('goal-modal').style.display = 'none';
    document.getElementById('goal-form').reset();
  }

  // Handle budget form submission
  async handleBudgetSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budgetData = {
      name: document.getElementById('budget-name').value,
      category: document.getElementById('budget-category').value,
      amount: parseFloat(document.getElementById('budget-amount').value),
      period: document.getElementById('budget-period').value,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      alertThreshold: parseInt(document.getElementById('alert-threshold').value)
    };

    try {
      const response = await fetch(`${this.apiUrl}/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(budgetData)
      });

      if (!response.ok) throw new Error('Failed to create budget');

      this.showNotification('Budget created successfully! 💰', 'success');
      this.hideBudgetModal();
      this.loadDashboardData();
    } catch (error) {
      this.showNotification(error.message, 'error');
    }
  }

  // Handle goal form submission
  async handleGoalSubmit(e) {
    e.preventDefault();

    const goalData = {
      title: document.getElementById('goal-title').value,
      description: document.getElementById('goal-description').value,
      targetAmount: parseFloat(document.getElementById('goal-target').value),
      goalType: document.getElementById('goal-type').value,
      targetDate: document.getElementById('goal-date').value,
      priority: document.getElementById('goal-priority').value
    };

    try {
      const response = await fetch(`${this.apiUrl}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(goalData)
      });

      if (!response.ok) throw new Error('Failed to create goal');

      this.showNotification('Goal created successfully! 🎯', 'success');
      this.hideGoalModal();
      this.loadDashboardData();
    } catch (error) {
      this.showNotification(error.message, 'error');
    }
  }

  // Add dashboard styles
  addDashboardStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #budget-goals-dashboard {
        padding: 40px;
        background: #f8fafc;
        border-radius: 12px;
        margin: 20px 0;
      }
      #budget-goals-dashboard h2 { font-size: 2.5rem; margin-bottom: 2rem; color: #0f172a; font-weight: 800; letter-spacing: -0.025em; }
      .dashboard-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px; }
      .summary-card { background: white; padding: 30px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
      .summary-card h3 { font-size: 1.5rem; margin-bottom: 1.5rem; color: #334155; }
      .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
      .label { color: #64748b; font-weight: 600; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; }
      .value { font-weight: 800; color: #0f172a; font-size: 1.4rem; }
      .progress-bar { height: 16px; background: #e2e8f0; border-radius: 8px; margin-top: 10px; overflow: hidden; }
      .progress-fill { height: 100%; background: linear-gradient(90deg, #4f46e5, #9333ea); border-radius: 8px; }
      .goal-item { background: white; padding: 25px; border-radius: 20px; margin-bottom: 20px; border-left: 8px solid #4f46e5; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      .goal-item h4 { font-size: 1.25rem; margin-bottom: 10px; color: #1e293b; }
    `;
    document.head.appendChild(style);
  }

  // Show notification
  showNotification(message, type = 'info') {
    if (window.ExpenseSync && window.ExpenseSync.showNotification) {
      window.ExpenseSync.showNotification(message, type);
    } else {
      alert(message);
    }
  }
}

// Initialize budget and goals manager
const budgetGoalsManager = new BudgetGoalsManager();

// Add navigation button
function addBudgetGoalsButton() {
  const nav = document.querySelector('nav') || document.querySelector('.nav-menu');
  if (nav && !document.getElementById('budget-goals-nav')) {
    const budgetBtn = document.createElement('button');
    budgetBtn.id = 'budget-goals-nav';
    budgetBtn.textContent = '💰 Budget & Goals';
    budgetBtn.onclick = () => budgetGoalsManager.showDashboard();
    budgetBtn.style.cssText = 'margin: 10px; padding: 10px 15px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;';
    nav.appendChild(budgetBtn);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', addBudgetGoalsButton);

// Export for global use
window.BudgetGoalsManager = budgetGoalsManager;