class SettingsManager {
    constructor() {
        this.currentTab = 'profile';
        this.init();
    }

    init() {
        this.setupTabNavigation();
        this.setupEventListeners();
        this.loadUserData();
    }

    setupTabNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const tabContents = document.querySelectorAll('.tab-content');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.getAttribute('data-tab');
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Update active tab content
                tabContents.forEach(tab => tab.classList.remove('active'));
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                this.currentTab = tabId;
            });
        });
    }

    setupEventListeners() {
        // Profile actions
        document.getElementById('save-profile-btn').addEventListener('click', () => {
            this.saveProfile();
        });

        document.getElementById('change-avatar-btn').addEventListener('click', () => {
            this.changeAvatar();
        });

        // Preferences actions
        document.getElementById('save-preferences-btn').addEventListener('click', () => {
            this.savePreferences();
        });

        // Security actions
        document.getElementById('change-password-btn').addEventListener('click', () => {
            this.changePassword();
        });

        document.getElementById('manage-2fa-btn').addEventListener('click', () => {
            this.manage2FA();
        });

        document.getElementById('revoke-all-btn').addEventListener('click', () => {
            this.revokeAllSessions();
        });

        // Notifications actions
        document.getElementById('save-notifications-btn').addEventListener('click', () => {
            this.saveNotificationSettings();
        });

        // Data & Privacy actions
        document.getElementById('export-csv-btn').addEventListener('click', () => {
            this.exportData('csv');
        });

        document.getElementById('export-json-btn').addEventListener('click', () => {
            this.exportData('json');
        });

        document.getElementById('export-pdf-btn').addEventListener('click', () => {
            this.exportData('pdf');
        });

        document.getElementById('delete-data-btn').addEventListener('click', () => {
            this.deleteAllData();
        });

        document.getElementById('delete-account-btn').addEventListener('click', () => {
            this.deleteAccount();
        });

        // Theme toggle
        document.getElementById('dark-mode').addEventListener('change', (e) => {
            this.toggleTheme(e.target.checked);
        });
    }

    loadUserData() {
        // Mock user data
        const userData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1 (555) 123-4567',
            bio: 'Financial enthusiast focused on smart money management and achieving financial goals.',
            currency: 'USD',
            timezone: 'UTC-5',
            language: 'en',
            preferences: {
                darkMode: true,
                compactView: false,
                animations: true
            },
            notifications: {
                budgetAlerts: true,
                weeklyReports: true,
                goalReminders: false,
                transactionAlerts: true,
                securityAlerts: true
            },
            privacy: {
                analyticsConsent: true,
                marketingConsent: false
            }
        };

        // Populate form fields
        document.getElementById('first-name').value = userData.firstName;
        document.getElementById('last-name').value = userData.lastName;
        document.getElementById('email').value = userData.email;
        document.getElementById('phone').value = userData.phone;
        document.getElementById('bio').value = userData.bio;
        document.getElementById('currency').value = userData.currency;
        document.getElementById('timezone').value = userData.timezone;
        document.getElementById('language').value = userData.language;

        // Set preferences
        document.getElementById('dark-mode').checked = userData.preferences.darkMode;
        document.getElementById('compact-view').checked = userData.preferences.compactView;
        document.getElementById('animations').checked = userData.preferences.animations;

        // Set notifications
        document.getElementById('budget-alerts').checked = userData.notifications.budgetAlerts;
        document.getElementById('weekly-reports').checked = userData.notifications.weeklyReports;
        document.getElementById('goal-reminders').checked = userData.notifications.goalReminders;
        document.getElementById('transaction-alerts').checked = userData.notifications.transactionAlerts;
        document.getElementById('security-alerts').checked = userData.notifications.securityAlerts;

        // Set privacy settings
        document.getElementById('analytics-consent').checked = userData.privacy.analyticsConsent;
        document.getElementById('marketing-consent').checked = userData.privacy.marketingConsent;
    }

    saveProfile() {
        const profileData = {
            firstName: document.getElementById('first-name').value,
            lastName: document.getElementById('last-name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            bio: document.getElementById('bio').value
        };

        // Validate required fields
        if (!profileData.firstName || !profileData.lastName || !profileData.email) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Update profile display
        document.getElementById('profile-name').textContent = `${profileData.firstName} ${profileData.lastName}`;
        document.getElementById('profile-email').textContent = profileData.email;

        this.showNotification('Profile updated successfully!', 'success');
    }

    changeAvatar() {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('profile-image').src = e.target.result;
                    this.showNotification('Profile picture updated!', 'success');
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    }

    savePreferences() {
        const preferences = {
            currency: document.getElementById('currency').value,
            timezone: document.getElementById('timezone').value,
            language: document.getElementById('language').value,
            darkMode: document.getElementById('dark-mode').checked,
            compactView: document.getElementById('compact-view').checked,
            animations: document.getElementById('animations').checked
        };

        this.showNotification('Preferences saved successfully!', 'success');
    }

    changePassword() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showNotification('Please fill in all password fields', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showNotification('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 8) {
            this.showNotification('Password must be at least 8 characters long', 'error');
            return;
        }

        // Clear password fields
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';

        this.showNotification('Password changed successfully!', 'success');
    }

    manage2FA() {
        this.showNotification('2FA management coming soon!', 'info');
    }

    revokeAllSessions() {
        if (confirm('Are you sure you want to sign out of all devices? You will need to log in again.')) {
            this.showNotification('All sessions revoked successfully!', 'success');
        }
    }

    saveNotificationSettings() {
        const notifications = {
            budgetAlerts: document.getElementById('budget-alerts').checked,
            weeklyReports: document.getElementById('weekly-reports').checked,
            goalReminders: document.getElementById('goal-reminders').checked,
            transactionAlerts: document.getElementById('transaction-alerts').checked,
            securityAlerts: document.getElementById('security-alerts').checked
        };

        this.showNotification('Notification settings saved!', 'success');
    }

    exportData(format) {
        // Mock data export
        const mockData = {
            user: {
                name: 'John Doe',
                email: 'john.doe@example.com'
            },
            transactions: [
                { date: '2024-01-20', description: 'Grocery Shopping', amount: -85.50, category: 'food' },
                { date: '2024-01-19', description: 'Salary Deposit', amount: 3500.00, category: 'income' },
                { date: '2024-01-18', description: 'Netflix Subscription', amount: -15.99, category: 'entertainment' }
            ],
            budgets: [
                { category: 'food', amount: 600, spent: 425.50 },
                { category: 'transport', amount: 300, spent: 185.20 }
            ]
        };

        let content, filename, mimeType;

        switch (format) {
            case 'csv':
                content = this.convertToCSV(mockData.transactions);
                filename = 'expenseflow-data.csv';
                mimeType = 'text/csv';
                break;
            case 'json':
                content = JSON.stringify(mockData, null, 2);
                filename = 'expenseflow-data.json';
                mimeType = 'application/json';
                break;
            case 'pdf':
                this.showNotification('PDF export coming soon!', 'info');
                return;
        }

        // Create download
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showNotification(`Data exported as ${format.toUpperCase()}!`, 'success');
    }

    convertToCSV(data) {
        const headers = ['Date', 'Description', 'Amount', 'Category'];
        const rows = data.map(item => [
            item.date,
            item.description,
            item.amount,
            item.category
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    deleteAllData() {
        if (confirm('Are you sure you want to delete ALL your data? This action cannot be undone.')) {
            if (confirm('This will permanently delete all transactions, budgets, and goals. Type "DELETE" to confirm.')) {
                this.showNotification('All data deleted successfully!', 'success');
            }
        }
    }

    deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            if (confirm('This will permanently delete your account and all data. Type "DELETE ACCOUNT" to confirm.')) {
                this.showNotification('Account deletion initiated. You will receive a confirmation email.', 'info');
            }
        }
    }

    toggleTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        this.showNotification(`${isDark ? 'Dark' : 'Light'} theme enabled!`, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;

        switch (type) {
            case 'success':
                notification.style.background = '#43e97b';
                notification.style.color = '#0f0f23';
                break;
            case 'error':
                notification.style.background = '#ef5350';
                notification.style.color = '#ffffff';
                break;
            case 'info':
                notification.style.background = '#64ffda';
                notification.style.color = '#0f0f23';
                break;
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Add CSS animation
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

// Initialize settings manager when page loads
let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
    settingsManager = new SettingsManager();
});