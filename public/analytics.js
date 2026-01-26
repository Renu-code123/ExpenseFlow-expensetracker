// Analytics Page JavaScript
class AnalyticsManager {
    constructor() {
        this.charts = {};
        this.currentPeriod = 'daily';
        this.currentTimeRange = 30;
        this.mockData = this.generateMockData();
        this.init();
    }

    init() {
        this.initializeCharts();
        this.bindEvents();
        this.updateTimeRange();
    }

    generateMockData() {
        const categories = [
            { name: 'Food & Dining', icon: '🍔', color: '#f87171' },
            { name: 'Shopping', icon: '🛒', color: '#60a5fa' },
            { name: 'Transportation', icon: '🚗', color: '#4ade80' },
            { name: 'Entertainment', icon: '🎬', color: '#a78bfa' },
            { name: 'Healthcare', icon: '💊', color: '#fb7185' },
            { name: 'Bills & Utilities', icon: '⚡', color: '#fbbf24' }
        ];

        const merchants = ['Amazon', 'Swiggy', 'Uber', 'Zomato', 'Netflix', 'Spotify'];
        
        return {
            categories,
            merchants,
            dailySpending: this.generateDailyData(30),
            monthlyData: this.generateMonthlyData(12),
            categoryData: this.generateCategoryData(categories),
            merchantData: this.generateMerchantData(merchants)
        };
    }

    generateDailyData(days) {
        const data = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            data.push({
                date: date.toISOString().split('T')[0],
                expense: Math.floor(Math.random() * 2000) + 500,
                income: i % 7 === 0 ? Math.floor(Math.random() * 5000) + 3000 : 0
            });
        }
        
        return data;
    }

    generateMonthlyData(months) {
        const data = [];
        const today = new Date();
        
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setMonth(date.getMonth() - i);
            
            data.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                expense: Math.floor(Math.random() * 30000) + 20000,
                income: Math.floor(Math.random() * 20000) + 35000
            });
        }
        
        return data;
    }

    generateCategoryData(categories) {
        return categories.map(cat => ({
            ...cat,
            amount: Math.floor(Math.random() * 15000) + 2000,
            transactions: Math.floor(Math.random() * 50) + 10,
            trend: Math.floor(Math.random() * 40) - 20
        }));
    }

    generateMerchantData(merchants) {
        return merchants.map(merchant => ({
            name: merchant,
            amount: Math.floor(Math.random() * 10000) + 1000,
            transactions: Math.floor(Math.random() * 30) + 5
        })).sort((a, b) => b.amount - a.amount);
    }

    initializeCharts() {
        this.createSpendingTrendChart();
        this.createCategoryChart();
        this.createIncomeExpenseChart();
        this.updateMerchantsDisplay();
    }

    createSpendingTrendChart() {
        const ctx = document.getElementById('spendingTrendChart').getContext('2d');
        const data = this.mockData.dailySpending.slice(-14);
        
        this.charts.spendingTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                datasets: [{
                    label: 'Daily Spending',
                    data: data.map(d => d.expense),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { 
                            color: '#a0a0a0',
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#a0a0a0' }
                    }
                }
            }
        });
    }

    createCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        const categoryData = this.mockData.categoryData.slice(0, 6);
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.map(c => c.name),
                datasets: [{
                    data: categoryData.map(c => c.amount),
                    backgroundColor: categoryData.map(c => c.color),
                    borderWidth: 0,
                    hoverBorderWidth: 3,
                    hoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e0e0e0',
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ₹${context.parsed.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    createIncomeExpenseChart() {
        const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
        const data = this.mockData.monthlyData.slice(-6);
        
        this.charts.incomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.month),
                datasets: [
                    {
                        label: 'Income',
                        data: data.map(d => d.income),
                        backgroundColor: 'rgba(74, 222, 128, 0.8)',
                        borderColor: '#4ade80',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Expenses',
                        data: data.map(d => d.expense),
                        backgroundColor: 'rgba(248, 113, 113, 0.8)',
                        borderColor: '#f87171',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e0e0e0' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { 
                            color: '#a0a0a0',
                            callback: function(value) {
                                return '₹' + (value / 1000) + 'K';
                            }
                        }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#a0a0a0' }
                    }
                }
            }
        });
    }

    updateMerchantsDisplay() {
        const merchantsList = document.querySelector('.merchants-list');
        const topMerchants = this.mockData.merchantData.slice(0, 4);
        const maxAmount = Math.max(...topMerchants.map(m => m.amount));
        
        merchantsList.innerHTML = topMerchants.map(merchant => `
            <div class="merchant-item">
                <span class="merchant-name">${merchant.name}</span>
                <span class="merchant-amount">₹${merchant.amount.toLocaleString()}</span>
                <div class="merchant-bar" style="width: ${(merchant.amount / maxAmount) * 100}%"></div>
            </div>
        `).join('');
    }

    bindEvents() {
        // Time range selector
        document.getElementById('timeRange').addEventListener('change', (e) => {
            this.currentTimeRange = parseInt(e.target.value);
            this.updateTimeRange();
        });

        // Chart period buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.updateSpendingChart();
            });
        });

        // Report type selector
        document.getElementById('reportType').addEventListener('change', (e) => {
            this.updateReportTable(e.target.value);
        });
    }

    updateTimeRange() {
        // Update summary cards based on time range
        this.updateSummaryCards();
        // Update charts with new data
        this.updateChartsData();
    }

    updateSummaryCards() {
        const data = this.mockData.dailySpending.slice(-this.currentTimeRange);
        const totalExpenses = data.reduce((sum, d) => sum + d.expense, 0);
        const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
        const netSavings = totalIncome - totalExpenses;
        const avgDaily = totalExpenses / this.currentTimeRange;

        // Update the display (simplified for demo)
        console.log('Updated summary for', this.currentTimeRange, 'days');
    }

    updateChartsData() {
        if (this.charts.spendingTrend) {
            const data = this.mockData.dailySpending.slice(-this.currentTimeRange);
            this.charts.spendingTrend.data.labels = data.map(d => 
                new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            );
            this.charts.spendingTrend.data.datasets[0].data = data.map(d => d.expense);
            this.charts.spendingTrend.update();
        }
    }

    updateSpendingChart() {
        // Update chart based on selected period
        let data, labels;
        
        switch (this.currentPeriod) {
            case 'weekly':
                data = this.generateWeeklyData();
                break;
            case 'monthly':
                data = this.mockData.monthlyData.slice(-6);
                labels = data.map(d => d.month);
                break;
            default:
                data = this.mockData.dailySpending.slice(-14);
                labels = data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        
        if (this.charts.spendingTrend) {
            this.charts.spendingTrend.data.labels = labels;
            this.charts.spendingTrend.data.datasets[0].data = data.map(d => d.expense);
            this.charts.spendingTrend.update();
        }
    }

    generateWeeklyData() {
        const weeks = [];
        const today = new Date();
        
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            
            weeks.push({
                week: `Week ${8 - i}`,
                expense: Math.floor(Math.random() * 8000) + 3000
            });
        }
        
        return weeks;
    }

    updateReportTable(reportType) {
        const tbody = document.getElementById('reportTableBody');
        let data = [];
        
        switch (reportType) {
            case 'category':
                data = this.mockData.categoryData;
                break;
            case 'monthly':
                data = this.generateMonthlyReport();
                break;
            case 'yearly':
                data = this.generateYearlyReport();
                break;
            default:
                data = this.mockData.categoryData;
        }
        
        tbody.innerHTML = data.slice(0, 5).map(item => `
            <tr>
                <td><span class="category-icon">${item.icon || '📊'}</span> ${item.name}</td>
                <td class="amount">₹${item.amount.toLocaleString()}</td>
                <td>${item.transactions}</td>
                <td>${item.percentage || '0'}%</td>
                <td>₹${Math.floor(item.amount / item.transactions)}</td>
                <td><span class="trend ${item.trend > 0 ? 'up' : item.trend < 0 ? 'down' : 'neutral'}">
                    ${item.trend > 0 ? '↗️' : item.trend < 0 ? '↘️' : '➡️'} ${Math.abs(item.trend)}%
                </span></td>
            </tr>
        `).join('');
    }

    generateMonthlyReport() {
        return this.mockData.monthlyData.map(month => ({
            name: month.month,
            amount: month.expense,
            transactions: Math.floor(Math.random() * 100) + 50,
            trend: Math.floor(Math.random() * 40) - 20
        }));
    }

    generateYearlyReport() {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 3 }, (_, i) => ({
            name: (currentYear - i).toString(),
            amount: Math.floor(Math.random() * 300000) + 200000,
            transactions: Math.floor(Math.random() * 1000) + 500,
            trend: Math.floor(Math.random() * 30) - 15
        }));
    }
}

// Chart type toggle function
function toggleChartType(chartId) {
    const analytics = window.analyticsManager;
    if (chartId === 'categoryChart' && analytics.charts.category) {
        const chart = analytics.charts.category;
        chart.config.type = chart.config.type === 'doughnut' ? 'bar' : 'doughnut';
        chart.update();
    }
}

// Export functionality
function exportReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('ExpenseFlow Analytics Report', 20, 30);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Add summary
    doc.setFontSize(14);
    doc.text('Financial Summary', 20, 65);
    doc.setFontSize(10);
    doc.text('Total Income: ₹45,250', 20, 80);
    doc.text('Total Expenses: ₹32,180', 20, 90);
    doc.text('Net Savings: ₹13,070', 20, 100);
    doc.text('Average Daily Spend: ₹1,073', 20, 110);
    
    // Add insights
    doc.setFontSize(14);
    doc.text('Key Insights', 20, 130);
    doc.setFontSize(10);
    doc.text('• You spend 40% more on weekends', 20, 145);
    doc.text('• You are 15% under budget this month', 20, 155);
    doc.text('• Reduce food delivery by 20% to save ₹2,500 monthly', 20, 165);
    
    // Save the PDF
    doc.save('expense-analytics-report.pdf');
    
    // Show success message
    showNotification('Report exported successfully!', 'success');
}

// Generate report function
function generateReport() {
    const reportType = document.getElementById('reportType').value;
    showNotification(`Generating ${reportType} report...`, 'info');
    
    setTimeout(() => {
        window.analyticsManager.updateReportTable(reportType);
        showNotification('Report generated successfully!', 'success');
    }, 1000);
}

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : '#60a5fa'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize analytics when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsManager = new AnalyticsManager();
});

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);