/**
 * AI-Driven Budget Intelligence Dashboard
 * Z-Score Anomaly Detection & Self-Healing Budgeting
 * Issue #339
 */

class IntelligenceDashboard {
  constructor() {
    this.dashboardData = null;
    this.anomalies = [];
    this.volatilityData = [];
    this.reallocations = [];
    this.charts = {};
    this.refreshInterval = null;
    this.API_BASE = '/api/analytics';
  }

  async init() {
    this.bindEvents();
    await this.loadDashboard();
    this.startAutoRefresh();
  }

  bindEvents() {
    // Tab navigation
    document.querySelectorAll('.intelligence-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Refresh button
    const refreshBtn = document.getElementById('refresh-intelligence');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshIntelligence());
    }

    // Apply reallocation buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('apply-reallocation-btn')) {
        const { from, to, amount } = e.target.dataset;
        this.applyReallocation(from, to, parseFloat(amount));
      }
      if (e.target.classList.contains('reject-reallocation-btn')) {
        const { budgetId, toCategory } = e.target.dataset;
        this.rejectReallocation(budgetId, toCategory);
      }
    });

    // Analyze transaction form
    const analyzeForm = document.getElementById('analyze-transaction-form');
    if (analyzeForm) {
      analyzeForm.addEventListener('submit', (e) => this.handleAnalyzeTransaction(e));
    }
  }

  async loadDashboard() {
    try {
      this.showLoading();
      
      const [dashboard, anomalies, volatility, reallocations, alerts] = await Promise.all([
        this.fetchAPI('/intelligence/dashboard'),
        this.fetchAPI('/intelligence/anomalies'),
        this.fetchAPI('/intelligence/volatility'),
        this.fetchAPI('/intelligence/reallocations'),
        this.fetchAPI('/intelligence/alerts')
      ]);

      this.dashboardData = dashboard.data;
      this.anomalies = anomalies.data;
      this.volatilityData = volatility.data;
      this.reallocations = reallocations.data;
      this.alertsData = alerts.data;

      this.renderDashboard();
      this.hideLoading();
    } catch (error) {
      console.error('Failed to load intelligence dashboard:', error);
      this.showError('Failed to load intelligence data');
      this.hideLoading();
    }
  }

  async fetchAPI(endpoint, options = {}) {
    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  renderDashboard() {
    this.renderSummaryCards();
    this.renderAnomalyTimeline();
    this.renderVolatilityChart();
    this.renderReallocationSuggestions();
    this.renderAlerts();
    this.renderBudgetIntelligence();
  }

  renderSummaryCards() {
    const container = document.getElementById('intelligence-summary');
    if (!container) return;

    const { summary } = this.dashboardData;
    
    container.innerHTML = `
      <div class="intelligence-cards">
        <div class="intel-card">
          <div class="intel-card-icon anomaly">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="intel-card-content">
            <span class="intel-card-value">${summary?.totalAnomalies || 0}</span>
            <span class="intel-card-label">Anomalies Detected</span>
          </div>
        </div>
        
        <div class="intel-card">
          <div class="intel-card-icon volatility ${this.getVolatilityColorClass(summary?.averageVolatility)}">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="intel-card-content">
            <span class="intel-card-value">${(summary?.averageVolatility || 0).toFixed(1)}%</span>
            <span class="intel-card-label">Avg Volatility</span>
          </div>
        </div>
        
        <div class="intel-card">
          <div class="intel-card-icon reallocation">
            <i class="fas fa-exchange-alt"></i>
          </div>
          <div class="intel-card-content">
            <span class="intel-card-value">${summary?.pendingReallocations || 0}</span>
            <span class="intel-card-label">Pending Reallocations</span>
          </div>
        </div>
        
        <div class="intel-card">
          <div class="intel-card-icon health ${this.getHealthColorClass(summary?.healthScore)}">
            <i class="fas fa-heartbeat"></i>
          </div>
          <div class="intel-card-content">
            <span class="intel-card-value">${(summary?.healthScore || 0).toFixed(0)}</span>
            <span class="intel-card-label">Budget Health Score</span>
          </div>
        </div>
      </div>
    `;
  }

  renderAnomalyTimeline() {
    const container = document.getElementById('anomaly-timeline');
    if (!container) return;

    const { anomalies } = this.anomalies;
    
    if (!anomalies || anomalies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>No anomalies detected in your spending patterns</p>
        </div>
      `;
      return;
    }

    const sortedAnomalies = [...anomalies].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    ).slice(0, 10);

    container.innerHTML = `
      <div class="anomaly-list">
        ${sortedAnomalies.map(anomaly => `
          <div class="anomaly-item ${this.getSeverityClass(anomaly.zScore)}">
            <div class="anomaly-indicator"></div>
            <div class="anomaly-content">
              <div class="anomaly-header">
                <span class="anomaly-category">${anomaly.category}</span>
                <span class="anomaly-zscore">Z-Score: ${anomaly.zScore.toFixed(2)}</span>
              </div>
              <div class="anomaly-details">
                <span class="anomaly-amount">${this.formatCurrency(anomaly.amount)}</span>
                <span class="anomaly-deviation">
                  ${anomaly.deviationPercent > 0 ? '+' : ''}${anomaly.deviationPercent.toFixed(0)}% from average
                </span>
              </div>
              <div class="anomaly-meta">
                <span class="anomaly-date">${this.formatDate(anomaly.date)}</span>
                <span class="anomaly-description">${anomaly.description || 'Transaction'}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderVolatilityChart() {
    const container = document.getElementById('volatility-chart');
    if (!container) return;

    const { categories } = this.volatilityData;
    
    if (!categories || categories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-chart-bar"></i>
          <p>Not enough data to calculate volatility</p>
        </div>
      `;
      return;
    }

    // Sort by volatility descending
    const sortedCategories = [...categories].sort((a, b) => b.volatilityIndex - a.volatilityIndex);

    container.innerHTML = `
      <div class="volatility-bars">
        ${sortedCategories.map(cat => `
          <div class="volatility-bar-item">
            <div class="volatility-bar-label">
              <span class="category-name">${cat.category}</span>
              <span class="risk-badge ${cat.riskLevel}">${cat.riskLevel}</span>
            </div>
            <div class="volatility-bar-container">
              <div class="volatility-bar" 
                   style="width: ${Math.min(cat.volatilityIndex, 100)}%; 
                          background: ${this.getVolatilityColor(cat.volatilityIndex)}">
              </div>
              <span class="volatility-value">${cat.volatilityIndex.toFixed(1)}%</span>
            </div>
            <div class="volatility-stats">
              <span>Avg: ${this.formatCurrency(cat.meanSpending)}</span>
              <span>σ: ${this.formatCurrency(cat.standardDeviation)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderReallocationSuggestions() {
    const container = document.getElementById('reallocation-suggestions');
    if (!container) return;

    const { suggestions } = this.reallocations;
    
    if (!suggestions || suggestions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-balance-scale"></i>
          <p>No reallocation suggestions at this time</p>
          <small>Suggestions appear when some budgets have surplus while others are over-budget</small>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="reallocation-list">
        ${suggestions.map(suggestion => `
          <div class="reallocation-item">
            <div class="reallocation-flow">
              <div class="reallocation-from">
                <span class="category-badge surplus">${suggestion.fromCategory}</span>
                <span class="surplus-amount">+${this.formatCurrency(suggestion.fromBudgetSurplus)}</span>
              </div>
              <div class="reallocation-arrow">
                <i class="fas fa-arrow-right"></i>
                <span class="transfer-amount">${this.formatCurrency(suggestion.suggestedAmount)}</span>
              </div>
              <div class="reallocation-to">
                <span class="category-badge deficit">${suggestion.toCategory}</span>
              </div>
            </div>
            <div class="reallocation-reason">
              <i class="fas fa-info-circle"></i>
              ${suggestion.reason}
            </div>
            <div class="reallocation-actions">
              <button class="btn btn-primary apply-reallocation-btn"
                      data-from="${suggestion.fromBudgetId}"
                      data-to="${suggestion.toCategory}"
                      data-amount="${suggestion.suggestedAmount}">
                <i class="fas fa-check"></i> Apply
              </button>
              <button class="btn btn-secondary reject-reallocation-btn"
                      data-budget-id="${suggestion.fromBudgetId}"
                      data-to-category="${suggestion.toCategory}">
                <i class="fas fa-times"></i> Dismiss
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderAlerts() {
    const container = document.getElementById('intelligence-alerts');
    if (!container) return;

    const allAlerts = [
      ...(this.alertsData?.standard || []),
      ...(this.alertsData?.anomaly || []),
      ...(this.alertsData?.prediction || []),
      ...(this.alertsData?.reallocation || [])
    ];

    if (allAlerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-bell-slash"></i>
          <p>No alerts at this time</p>
        </div>
      `;
      return;
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allAlerts.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    container.innerHTML = `
      <div class="alerts-list">
        ${allAlerts.slice(0, 8).map(alert => `
          <div class="alert-item ${alert.type} ${alert.priority}">
            <div class="alert-icon">
              ${this.getAlertIcon(alert.type)}
            </div>
            <div class="alert-content">
              <div class="alert-message">${alert.message}</div>
              <div class="alert-meta">
                <span class="alert-type">${alert.type}</span>
                <span class="alert-priority ${alert.priority}">${alert.priority}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderBudgetIntelligence() {
    const container = document.getElementById('budget-intelligence-list');
    if (!container) return;

    const { budgets } = this.dashboardData;
    
    if (!budgets || budgets.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-wallet"></i>
          <p>No budgets with intelligence data</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="budget-intel-grid">
        ${budgets.map(budget => `
          <div class="budget-intel-card">
            <div class="budget-intel-header">
              <span class="budget-name">${budget.name || budget.category}</span>
              <span class="trend-indicator ${budget.intelligence?.trendDirection || 'stable'}">
                ${this.getTrendIcon(budget.intelligence?.trendDirection)}
              </span>
            </div>
            
            <div class="budget-intel-progress">
              <div class="progress-bar">
                <div class="progress-fill ${this.getUsageClass(budget.usagePercent)}" 
                     style="width: ${Math.min(budget.usagePercent || 0, 100)}%">
                </div>
              </div>
              <div class="progress-labels">
                <span>${this.formatCurrency(budget.spent || 0)}</span>
                <span>${this.formatCurrency(budget.limit)}</span>
              </div>
            </div>
            
            <div class="budget-intel-stats">
              <div class="stat-item">
                <span class="stat-label">Volatility</span>
                <span class="stat-value ${this.getVolatilityColorClass(budget.intelligence?.volatilityIndex)}">
                  ${(budget.intelligence?.volatilityIndex || 0).toFixed(1)}%
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Predicted</span>
                <span class="stat-value">
                  ${this.formatCurrency(budget.intelligence?.predictedSpend || 0)}
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Confidence</span>
                <span class="stat-value">
                  ${((budget.intelligence?.predictionConfidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            ${budget.intelligence?.anomalies?.length > 0 ? `
              <div class="budget-anomaly-badge">
                <i class="fas fa-exclamation-triangle"></i>
                ${budget.intelligence.anomalies.filter(a => !a.isResolved).length} active anomalies
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  switchTab(tabName) {
    document.querySelectorAll('.intelligence-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.intelligence-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabName}-panel`);
    });
  }

  async refreshIntelligence() {
    try {
      this.showLoading();
      
      await this.fetchAPI('/intelligence/update', { method: 'POST' });
      await this.loadDashboard();
      
      this.showNotification('Intelligence data updated successfully', 'success');
    } catch (error) {
      console.error('Failed to refresh intelligence:', error);
      this.showError('Failed to refresh intelligence data');
    } finally {
      this.hideLoading();
    }
  }

  async applyReallocation(fromBudgetId, toCategory, amount) {
    try {
      // First, find the target budget by category
      const budgets = await this.fetchAPI('/intelligence/budgets');
      const toBudget = budgets.data.find(b => b.category === toCategory);
      
      if (!toBudget) {
        this.showError(`No budget found for category: ${toCategory}`);
        return;
      }

      await this.fetchAPI('/intelligence/reallocations/apply', {
        method: 'POST',
        body: JSON.stringify({
          fromBudgetId,
          toBudgetId: toBudget._id,
          amount
        })
      });

      this.showNotification('Funds reallocated successfully', 'success');
      await this.loadDashboard();
    } catch (error) {
      console.error('Failed to apply reallocation:', error);
      this.showError('Failed to apply reallocation');
    }
  }

  async rejectReallocation(budgetId, toCategory) {
    try {
      await this.fetchAPI('/intelligence/reallocations/reject', {
        method: 'POST',
        body: JSON.stringify({ budgetId, toCategory })
      });

      this.showNotification('Suggestion dismissed', 'info');
      await this.loadDashboard();
    } catch (error) {
      console.error('Failed to reject reallocation:', error);
      this.showError('Failed to dismiss suggestion');
    }
  }

  async handleAnalyzeTransaction(e) {
    e.preventDefault();
    
    const form = e.target;
    const amount = parseFloat(form.querySelector('[name="amount"]').value);
    const category = form.querySelector('[name="category"]').value;
    const description = form.querySelector('[name="description"]').value;

    try {
      const result = await this.fetchAPI('/intelligence/analyze-transaction', {
        method: 'POST',
        body: JSON.stringify({ amount, category, description })
      });

      this.showAnalysisResult(result.data);
    } catch (error) {
      console.error('Failed to analyze transaction:', error);
      this.showError('Failed to analyze transaction');
    }
  }

  showAnalysisResult(analysis) {
    const container = document.getElementById('analysis-result');
    if (!container) return;

    container.innerHTML = `
      <div class="analysis-result ${analysis.isAnomaly ? 'anomaly' : 'normal'}">
        <div class="analysis-header">
          <i class="fas ${analysis.isAnomaly ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
          <span>${analysis.isAnomaly ? 'Anomaly Detected' : 'Normal Transaction'}</span>
        </div>
        <div class="analysis-details">
          <div class="detail-row">
            <span>Z-Score:</span>
            <span class="${this.getSeverityClass(analysis.zScore)}">${analysis.zScore.toFixed(2)}</span>
          </div>
          <div class="detail-row">
            <span>Deviation:</span>
            <span>${analysis.deviationPercent > 0 ? '+' : ''}${analysis.deviationPercent.toFixed(0)}%</span>
          </div>
          <div class="detail-row">
            <span>Category Average:</span>
            <span>${this.formatCurrency(analysis.categoryMean)}</span>
          </div>
          <div class="detail-row">
            <span>Standard Deviation:</span>
            <span>${this.formatCurrency(analysis.categoryStdDev)}</span>
          </div>
        </div>
        ${analysis.suggestion ? `
          <div class="analysis-suggestion">
            <i class="fas fa-lightbulb"></i>
            ${analysis.suggestion}
          </div>
        ` : ''}
      </div>
    `;
  }

  startAutoRefresh() {
    // Refresh every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.loadDashboard();
    }, 5 * 60 * 1000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Utility methods
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  getSeverityClass(zScore) {
    if (zScore >= 3) return 'critical';
    if (zScore >= 2.5) return 'high';
    if (zScore >= 2) return 'medium';
    return 'low';
  }

  getVolatilityColor(volatility) {
    if (volatility >= 50) return '#ef4444';
    if (volatility >= 30) return '#f59e0b';
    if (volatility >= 15) return '#eab308';
    return '#22c55e';
  }

  getVolatilityColorClass(volatility) {
    if (volatility >= 50) return 'high';
    if (volatility >= 30) return 'medium';
    return 'low';
  }

  getHealthColorClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  getUsageClass(percent) {
    if (percent >= 100) return 'over';
    if (percent >= 90) return 'warning';
    if (percent >= 75) return 'caution';
    return 'normal';
  }

  getTrendIcon(trend) {
    switch (trend) {
      case 'increasing': return '<i class="fas fa-arrow-up"></i>';
      case 'decreasing': return '<i class="fas fa-arrow-down"></i>';
      default: return '<i class="fas fa-minus"></i>';
    }
  }

  getAlertIcon(type) {
    switch (type) {
      case 'anomaly': return '<i class="fas fa-exclamation-triangle"></i>';
      case 'prediction': return '<i class="fas fa-chart-line"></i>';
      case 'reallocation': return '<i class="fas fa-exchange-alt"></i>';
      default: return '<i class="fas fa-bell"></i>';
    }
  }

  showLoading() {
    const loader = document.getElementById('intelligence-loader');
    if (loader) loader.classList.add('active');
  }

  hideLoading() {
    const loader = document.getElementById('intelligence-loader');
    if (loader) loader.classList.remove('active');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    const container = document.getElementById('notifications') || document.body;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('intelligence-dashboard')) {
    window.intelligenceDashboard = new IntelligenceDashboard();
    window.intelligenceDashboard.init();
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntelligenceDashboard;
}
