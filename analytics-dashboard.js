// Analytics Dashboard Feature for ExpenseFlow
var ANALYTICS_API_URL = '/api/analytics';

// State management
let analyticsData = {
  trends: null,
  categoryBreakdown: null,
  insights: null,
  predictions: null,
  velocity: null,
  forecast: null
};

const getAnalyticsLocale = () => (window.i18n?.getLocale?.() && window.i18n.getLocale()) || 'en-US';
const getAnalyticsCurrency = () => (window.i18n?.getCurrency?.() && window.i18n.getCurrency()) || 'INR';

function formatAnalyticsCurrency(value, options = {}) {
  const currency = options.currency || getAnalyticsCurrency();
  if (window.i18n?.formatCurrency) {
    return window.i18n.formatCurrency(value, {
      currency,
      locale: getAnalyticsLocale(),
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
      maximumFractionDigits: options.maximumFractionDigits ?? 0
    });
  }

  const amount = Number(value || 0);
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// ========================
// API Functions
// ========================

async function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

/**
 * Fetch spending trends
 */
async function fetchSpendingTrends(period = 'monthly', months = 6) {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return { data: [] };

    const response = await fetch(
      `${ANALYTICS_API_URL}/spending-trends?period=${period}&months=${months}`,
      { headers: await getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch trends');
    const data = await response.json();
    analyticsData.trends = data.data;
    return data.data;
  } catch (error) {
    console.error('Error fetching spending trends:', error);
    throw error;
  }
}

/**
 * Fetch category breakdown
 */
async function fetchCategoryBreakdown(type = 'expense', startDate = null, endDate = null) {
  try {
    let url = `${ANALYTICS_API_URL}/category-breakdown?type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const response = await fetch(url, { headers: await getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch category breakdown');
    const data = await response.json();
    analyticsData.categoryBreakdown = data.data;
    return data.data;
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    throw error;
  }
}

/**
 * Fetch insights
 */
async function fetchInsights() {
  try {
    const response = await fetch(`${ANALYTICS_API_URL}/insights`, {
      headers: await getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch insights');
    const data = await response.json();
    analyticsData.insights = data.data;
    return data.data;
  } catch (error) {
    console.error('Error fetching insights:', error);
    throw error;
  }
}

/**
 * Fetch predictions
 */
async function fetchPredictions() {
  try {
    const response = await fetch(`${ANALYTICS_API_URL}/predictions`, {
      headers: await getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch predictions');
    const data = await response.json();
    analyticsData.predictions = data.data;
    return data.data;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    throw error;
  }
}

/**
 * Fetch spending velocity
 */
async function fetchSpendingVelocity() {
  try {
    const response = await fetch(`${ANALYTICS_API_URL}/velocity`, {
      headers: await getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch velocity');
    const data = await response.json();
    analyticsData.velocity = data.data;
    return data.data;
  } catch (error) {
    console.error('Error fetching velocity:', error);
    throw error;
  }
}

/**
 * Fetch financial forecast
 */
async function fetchForecast() {
  try {
    const response = await fetch(`${ANALYTICS_API_URL}/forecast`, {
      headers: await getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch forecast');
    const data = await response.json();
    analyticsData.forecast = data.data;
    return data.data;
  } catch (error) {
    console.error('Error fetching forecast:', error);
    throw error;
  }
}

/**
 * Fetch month-over-month comparison
 */
async function fetchComparison(months = 3) {
  try {
    const response = await fetch(`${ANALYTICS_API_URL}/comparison?months=${months}`, {
      headers: await getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch comparison');
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching comparison:', error);
    throw error;
  }
}

/**
 * Fetch complete analytics summary
 */
async function fetchAnalyticsSummary() {
  try {
    const response = await fetch(`${ANALYTICS_API_URL}/summary`, {
      headers: await getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch summary');
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching summary:', error);
    throw error;
  }
}

// ========================
// UI Rendering Functions
// ========================

/**
 * Render spending velocity widget
 */
function renderVelocityWidget(velocity) {
  const container = document.getElementById('velocity-widget');
  if (!container) return;

  const progressPercent = Math.min(100, (velocity.dayOfMonth / 30) * 100);

  container.innerHTML = `
    <div class="velocity-header">
      <h4><i class="fas fa-tachometer-alt"></i> Spending Velocity</h4>
      <span class="velocity-date">Day ${velocity.dayOfMonth} of month</span>
    </div>
    <div class="velocity-stats">
      <div class="velocity-stat">
        <span class="stat-value">${formatAnalyticsCurrency(velocity.currentSpent)}</span>
        <span class="stat-label">Spent this month</span>
      </div>
      <div class="velocity-stat">
        <span class="stat-value">${formatAnalyticsCurrency(velocity.dailyAverage)}</span>
        <span class="stat-label">Daily average</span>
      </div>
      <div class="velocity-stat projected">
        <span class="stat-value">${formatAnalyticsCurrency(velocity.projectedMonthEnd)}</span>
        <span class="stat-label">Projected month end</span>
      </div>
    </div>
    <div class="velocity-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>
      <span class="progress-text">${velocity.daysRemaining} days remaining</span>
    </div>
  `;
}

/**
 * Render category breakdown chart
 */
function renderCategoryChart(breakdown) {
    const container = document.getElementById('category-chart');
    if (!container) return;

    if (!breakdown || breakdown.categories.length === 0) {
        container.innerHTML = '<div class="no-data">No expense data available</div>';
        return;
    }

    // Clear previous chart
    container.innerHTML = '';

    const categoryColors = {
        food: '#FF6B6B',
        transport: '#4ECDC4',
        entertainment: '#96CEB4',
        utilities: '#FECA57',
        healthcare: '#FF9FF3',
        shopping: '#45B7D1',
        other: '#A55EEA'
    };

    const categoryIcons = {
        food: '🍽️',
        transport: '🚗',
        entertainment: '🎬',
        utilities: '💡',
        healthcare: '🏥',
        shopping: '🛒',
        other: '📋'
    };

    // Create chart header
    const header = document.createElement('div');
    header.className = 'category-chart-header';
    header.innerHTML = `
      <h4><i class="fas fa-pie-chart"></i> Category Breakdown</h4>
      <span class="total-amount">Total: ₹${breakdown.grandTotal.toLocaleString()}</span>
    `;
    container.appendChild(header);

    // Create canvas for Chart.js
    const canvas = document.createElement('canvas');
    canvas.id = 'category-pie-chart';
    canvas.style.maxWidth = '100%';
    canvas.style.height = '300px';
    container.appendChild(canvas);

    // Prepare data for Chart.js
    const chartData = {
        labels: breakdown.categories.map(cat => `${categoryIcons[cat.category] || '📋'} ${capitalizeFirst(cat.category)}`),
        datasets: [{
            data: breakdown.categories.map(cat => cat.total),
            backgroundColor: breakdown.categories.map(cat => categoryColors[cat.category] || '#999'),
            borderColor: breakdown.categories.map(cat => categoryColors[cat.category] || '#999'),
            borderWidth: 2,
            hoverOffset: 10
        }]
    };

    // Create pie chart
    new Chart(canvas, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif'
                        },
                        color: '#ffffff'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = breakdown.categories[context.dataIndex].percentage;
                            return `₹${value.toLocaleString()} (${percentage}%)`;
                        }
                    },
                    backgroundColor: 'rgba(15, 15, 35, 0.9)',
                    titleColor: '#64ffda',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(100, 255, 218, 0.3)',
                    borderWidth: 1
                }
            }
        }
    });
}

/**
 * Render spending trends chart
 */
function renderTrendsChart(trends) {
  const container = document.getElementById('trends-chart');
  if (!container) return;

  if (!trends || trends.data.length === 0) {
    container.innerHTML = '<div class="no-data">Not enough data for trends</div>';
    return;
  }

    // Clear previous chart
    container.innerHTML = '';

    // Create chart header
    const header = document.createElement('div');
    header.className = 'trends-header';
    header.innerHTML = `
      <h4><i class="fas fa-chart-line"></i> Spending Trends</h4>
    `;
    container.appendChild(header);

    // Create canvas for Chart.js
    const canvas = document.createElement('canvas');
    canvas.id = 'trends-line-chart';
    canvas.style.maxWidth = '100%';
    canvas.style.height = '300px';
    container.appendChild(canvas);

    // Prepare data for Chart.js
    const chartData = {
        labels: trends.data.map(item => formatPeriodLabel(item.period)),
        datasets: [
            {
                label: 'Income',
                data: trends.data.map(item => item.income),
                borderColor: '#00e676',
                backgroundColor: 'rgba(0, 230, 118, 0.1)',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#00e676',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            },
            {
                label: 'Expense',
                data: trends.data.map(item => item.expense),
                borderColor: '#ff5722',
                backgroundColor: 'rgba(255, 87, 34, 0.1)',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#ff5722',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }
        ]
    };

    // Create line chart
    new Chart(canvas, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12,
                            family: 'Inter, sans-serif'
                        },
                        color: '#ffffff'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ₹${context.raw.toLocaleString()}`;
                        }
                    },
                    backgroundColor: 'rgba(15, 15, 35, 0.9)',
                    titleColor: '#64ffda',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(100, 255, 218, 0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b4b4b4',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b4b4b4',
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Add summary section
    if (trends.summary) {
        const summary = document.createElement('div');
        summary.className = 'trends-summary';
        summary.innerHTML = `
          <div class="summary-item">
            <span class="summary-label">Avg Monthly Expense</span>
            <span class="summary-value expense">₹${trends.summary.avgMonthlyExpense.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Savings Rate</span>
            <span class="summary-value ${trends.summary.avgSavingsRate >= 0 ? 'positive' : 'negative'}">${trends.summary.avgSavingsRate}%</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Trend</span>
            <span class="summary-value ${trends.summary.spendingTrend === 'decreasing' ? 'positive' : 'negative'}">
              ${trends.summary.spendingTrend === 'decreasing' ? '↓' : '↑'} ${capitalizeFirst(trends.summary.spendingTrend)}
            </span>
          </div>
        `;
        container.appendChild(summary);
    }
}

/**
 * Render insights cards
 */
function renderInsights(insights) {
  const container = document.getElementById('insights-container');
  if (!container) return;

  if (!insights || insights.insights.length === 0) {
    container.innerHTML = '<div class="no-data">No insights available yet</div>';
    return;
  }

  const insightIcons = {
    savings: 'piggy-bank',
    category: 'tags',
    trend: 'chart-line',
    anomaly: 'exclamation-triangle',
    info: 'info-circle'
  };

  const statusClasses = {
    good: 'success',
    moderate: 'warning',
    warning: 'warning',
    critical: 'danger'
  };

  container.innerHTML = `
    <div class="insights-header">
      <h4><i class="fas fa-lightbulb"></i> Smart Insights</h4>
    </div>
    <div class="insights-list">
      ${insights.insights.map(insight => `
        <div class="insight-card ${statusClasses[insight.status] || ''}">
          <div class="insight-icon">
            <i class="fas fa-${insightIcons[insight.type] || 'info-circle'}"></i>
          </div>
          <div class="insight-content">
            <h5>${insight.title || capitalizeFirst(insight.type)}</h5>
            <p>${insight.message}</p>
            ${insight.suggestion ? `<span class="insight-suggestion">${insight.suggestion}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render predictions widget
 */
function renderPredictions(predictions) {
  const container = document.getElementById('predictions-widget');
  if (!container) return;

  if (!predictions || !predictions.nextMonthPrediction) {
    container.innerHTML = '<div class="no-data">Need more data for predictions</div>';
    return;
  }

  const trendIcon = predictions.trend === 'increasing' ? 'arrow-up' :
    predictions.trend === 'decreasing' ? 'arrow-down' : 'minus';
  const trendClass = predictions.trend === 'decreasing' ? 'positive' : 'negative';

  container.innerHTML = `
    <div class="predictions-header">
      <h4><i class="fas fa-crystal-ball"></i> Spending Predictions</h4>
      <span class="confidence-badge">Confidence: ${predictions.confidence}%</span>
    </div>
    <div class="prediction-main">
      <span class="prediction-label">Next Month Forecast</span>
      <span class="prediction-value">${formatAnalyticsCurrency(predictions.nextMonthPrediction)}</span>
      <span class="prediction-trend ${trendClass}">
        <i class="fas fa-${trendIcon}"></i>
        ${capitalizeFirst(predictions.trend)}
      </span>
    </div>
    <div class="prediction-details">
      <div class="detail-item">
        <span class="detail-label">Historical Avg</span>
        <span class="detail-value">${formatAnalyticsCurrency(predictions.historicalAverage)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Moving Avg</span>
        <span class="detail-value">${formatAnalyticsCurrency(predictions.movingAverage)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Based on</span>
        <span class="detail-value">${predictions.basedOnMonths} months</span>
      </div>
    </div>
  `;
}

/**
 * Render forecast widget (Safe-to-Spend)
 */
function renderForecastWidget(forecast) {
  const container = document.getElementById('forecast-widget');
  if (!container) return;

  const sts = forecast.safe_to_spend || forecast.safeToSpend;

  container.innerHTML = `
    <div class="forecast-header">
      <h4><i class="fas fa-shield-alt"></i> Safe-to-Spend</h4>
      <span class="forecast-days">${sts.remainingDays} days left in month</span>
    </div>
    <div class="sts-main">
      <div class="sts-daily">
        <span class="sts-label">Daily Limit</span>
        <span class="sts-value">₹${sts.daily.toLocaleString()}</span>
      </div>
      <div class="sts-total">
        <span class="sts-label">Total Available</span>
        <span class="sts-value">₹${sts.total.toLocaleString()}</span>
      </div>
    </div>
    <div class="sts-commitments">
      <div class="commitment-item shadow-none">
        <span class="comm-label">Recurring Bills</span>
        <span class="comm-value">₹${sts.commitments.recurring.toLocaleString()}</span>
      </div>
      <div class="commitment-item shadow-none">
        <span class="comm-label">Goal Targets</span>
        <span class="comm-value">₹${sts.commitments.goals.toLocaleString()}</span>
      </div>
    </div>
    <div class="anomalies-section" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1);">
      ${forecast.anomalies && forecast.anomalies.length > 0 ? `
        <div class="anomaly-alert" style="color: #ffca28; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;">
          <i class="fas fa-exclamation-triangle"></i>
          <span class="anomaly-text">${forecast.anomalies[0].message}</span>
        </div>
      ` : `
        <div class="anomaly-ok" style="color: #64ffda; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;">
          <i class="fas fa-check-circle"></i>
          <span>No spending anomalies detected this week</span>
        </div>
      `}
    </div>
  `;
}

// ========================
// Helper Functions
// ========================

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatPeriodLabel(period) {
  // Format: 2024-01 to Jan
  if (period.includes('-W')) {
    return `W${period.split('-W')[1]}`;
  }
  const parts = period.split('-');
  if (parts.length === 2) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(parts[1]) - 1] || period;
  }
  return period;
}

function showAnalyticsNotification(message, type = 'info') {
  if (typeof showNotification === 'function') {
    showNotification(message, type);
    return;
  }
  console.log(`[${type}] ${message}`);
}

// ========================
// Dashboard Loading
// ========================

async function loadAnalyticsDashboard() {
  const dashboardContainer = document.getElementById('analytics-dashboard');
  if (!dashboardContainer) return;

  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    // Show loading state
    dashboardContainer.classList.add('loading');

    // Fetch all analytics data in parallel
    const [velocity, breakdown, trends, insights, predictions, forecast] = await Promise.all([
      fetchSpendingVelocity().catch(() => null),
      fetchCategoryBreakdown().catch(() => null),
      fetchSpendingTrends().catch(() => null),
      fetchInsights().catch(() => null),
      fetchPredictions().catch(() => null),
      fetchForecast().catch(() => null)
    ]);

    // Render all widgets
    if (velocity) renderVelocityWidget(velocity);
    if (breakdown) renderCategoryChart(breakdown);
    if (trends) renderTrendsChart(trends);
    if (insights) renderInsights(insights);
    if (predictions) renderPredictions(predictions);
    if (forecast) renderForecastWidget(forecast);

    dashboardContainer.classList.remove('loading');
  } catch (error) {
    console.error('Error loading analytics dashboard:', error);
    showAnalyticsNotification('Failed to load analytics', 'error');
    dashboardContainer.classList.remove('loading');
  }
}

// ========================
// Initialization
// ========================

function initAnalyticsDashboard() {
  const dashboardContainer = document.getElementById('analytics-dashboard');
  if (!dashboardContainer) return;

  // Refresh button
  const refreshBtn = document.getElementById('refresh-analytics');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAnalyticsDashboard);
  }

  // Period selector for trends
  const periodSelect = document.getElementById('trends-period');
  if (periodSelect) {
    periodSelect.addEventListener('change', async (e) => {
      const trends = await fetchSpendingTrends(e.target.value);
      renderTrendsChart(trends);
    });
  }

  // Load initial data
  loadAnalyticsDashboard();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalyticsDashboard);
} else {
  initAnalyticsDashboard();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchSpendingTrends,
    fetchCategoryBreakdown,
    fetchInsights,
    fetchPredictions,
    fetchSpendingVelocity,
    fetchComparison,
    fetchAnalyticsSummary,
    loadAnalyticsDashboard
  };
}
