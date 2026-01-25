class Dashboard {
    constructor() {
        this.token = localStorage.getItem('token');
        this.init();
    }

    init() {
        if (!this.token) {
            window.location.href = 'login.html';
            return;
        }

        this.loadDashboardData();
        this.setupEventListeners();
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadUserInfo(),
                this.loadStats(),
                this.loadRecentTransactions()
            ]);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async loadUserInfo() {
        try {
            const response = await fetch('/api/auth/profile', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const user = await response.json();
            document.getElementById('user-name').textContent = `Welcome, ${user.name}`;
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/expenses/stats', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const stats = await response.json();
            
            document.getElementById('total-balance').textContent = `$${stats.totalBalance || 0}`;
            document.getElementById('month-expenses').textContent = `$${stats.monthExpenses || 0}`;
            document.getElementById('budget-left').textContent = `$${stats.budgetLeft || 0}`;
            document.getElementById('transaction-count').textContent = stats.transactionCount || 0;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadRecentTransactions() {
        try {
            const response = await fetch('/api/expenses?limit=5', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            const transactionsList = document.getElementById('transactions-list');
            transactionsList.innerHTML = '';
            
            if (data.data && data.data.length > 0) {
                data.data.forEach(transaction => {
                    const item = document.createElement('div');
                    item.className = 'transaction-item';
                    item.innerHTML = `
                        <div>
                            <strong>${transaction.description}</strong>
                            <br>
                            <small>${new Date(transaction.date).toLocaleDateString()}</small>
                        </div>
                        <div>
                            <span class="${transaction.type === 'expense' ? 'expense' : 'income'}">
                                ${transaction.type === 'expense' ? '-' : '+'}$${transaction.amount}
                            </span>
                        </div>
                    `;
                    transactionsList.appendChild(item);
                });
            } else {
                transactionsList.innerHTML = '<p>No transactions found</p>';
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });

        document.getElementById('add-expense-btn').addEventListener('click', () => {
            window.location.href = 'add-expense.html';
        });

        document.getElementById('view-budgets-btn').addEventListener('click', () => {
            window.location.href = 'budgets.html';
        });

        document.getElementById('export-data-btn').addEventListener('click', () => {
            this.exportData();
        });
    }

    async exportData() {
        try {
            const response = await fetch('/api/expenses/export?format=csv', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'expenses.csv';
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});