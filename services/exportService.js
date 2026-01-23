const PDFDocument = require('pdfkit');
const Expense = require('../models/Expense');

class ExportService {
    formatCurrency(amount, user, options = {}) {
        const currency = user?.preferredCurrency || 'INR';
        const locale = user?.locale || 'en-US';

        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
                minimumFractionDigits: options.minimumFractionDigits ?? 2,
                maximumFractionDigits: options.maximumFractionDigits ?? 2
            }).format(Number(amount) || 0);
        } catch (err) {
            return `${currency} ${Number(amount || 0).toFixed(options.minimumFractionDigits ?? 2)}`;
        }
    }

    /**
     * Generate CSV content from expenses
     * @param {Array} expenses - Array of expense objects
     * @param {Object} options - Export options
     * @returns {String} CSV content
     */
    generateCSV(expenses, options = {}) {
        const { includeHeaders = true, dateFormat = 'en-US' } = options;

        // CSV Headers
        const headers = [
            'Date',
            'Amount',
            'Category',
            'Description',
            'Merchant'
        ];

        const rows = [];

        if (includeHeaders) {
            rows.push(headers.join(','));
        }

        // Generate rows
        expenses.forEach(expense => {
            const date = new Date(expense.date).toISOString().split('T')[0]; // YYYY-MM-DD format

            const row = [
                date,
                expense.amount.toFixed(2),
                expense.category,
                `"${this.escapeCSV(expense.description)}"`,
                `"${this.escapeCSV(expense.merchant || '')}"`
            ];

            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    /**
     * Escape special characters for CSV
     */
    escapeCSV(str) {
        if (!str) return '';
        return str.replace(/"/g, '""').replace(/\n/g, ' ');
    }

    /**
     * Generate PDF report from expenses
     * @param {Array} expenses - Array of expense objects
     * @param {Object} user - User object
     * @param {Object} options - Export options (startDate, endDate)
     * @returns {Promise<Buffer>} PDF buffer
     */
    async generatePDF(expenses, user, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 50,
                    size: 'A4'
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Calculate summary statistics
                const stats = this.calculateStatistics(expenses);
                const dateRange = this.getDateRangeText(options.startDate, options.endDate, user?.locale || 'en-US');

                // Header
                this.addPDFHeader(doc, user, dateRange);

                // Summary Section
                this.addPDFSummary(doc, stats, user);

                // Category Breakdown
                this.addPDFCategoryBreakdown(doc, stats.categoryBreakdown, user);

                // Transaction Table
                this.addPDFTransactionTable(doc, expenses, user);

                // Footer
                this.addPDFFooter(doc);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Add PDF header with branding
     */
    addPDFHeader(doc, user, dateRange) {
        // Logo/Brand
        doc.fontSize(24)
            .fillColor('#667eea')
            .text('ExpenseFlow', 50, 50);

        doc.fontSize(10)
            .fillColor('#666666')
            .text('Expense Report', 50, 80);

        // User info
        doc.fontSize(10)
            .fillColor('#333333')
            .text(`Generated for: ${user.name}`, 350, 50, { align: 'right' })
            .text(`Email: ${user.email}`, 350, 65, { align: 'right' })
            .text(`Date: ${new Date().toLocaleDateString(user?.locale || 'en-US')}`, 350, 80, { align: 'right' });

        // Date range
        doc.fontSize(12)
            .fillColor('#667eea')
            .text(`Period: ${dateRange}`, 50, 110);

        // Divider
        doc.moveTo(50, 130)
            .lineTo(545, 130)
            .strokeColor('#e0e0e0')
            .stroke();

        doc.y = 145;
    }

    /**
     * Add summary section to PDF
     */
    addPDFSummary(doc, stats, user) {
        doc.fontSize(14)
            .fillColor('#333333')
            .text('Summary', 50, doc.y);

        doc.y += 15;

        // Summary boxes
        const boxWidth = 150;
        const boxHeight = 60;
        const startX = 50;
        const startY = doc.y;

        // Total Income Box
        doc.rect(startX, startY, boxWidth, boxHeight)
            .fillAndStroke('#e8f5e9', '#4caf50');
        doc.fontSize(10)
            .fillColor('#2e7d32')
            .text('Total Income', startX + 10, startY + 10);
        doc.fontSize(16)
            .fillColor('#1b5e20')
            .text(this.formatCurrency(stats.totalIncome, user), startX + 10, startY + 30);

        // Total Expense Box
        doc.rect(startX + boxWidth + 20, startY, boxWidth, boxHeight)
            .fillAndStroke('#ffebee', '#f44336');
        doc.fontSize(10)
            .fillColor('#c62828')
            .text('Total Expenses', startX + boxWidth + 30, startY + 10);
        doc.fontSize(16)
            .fillColor('#b71c1c')
            .text(this.formatCurrency(stats.totalExpense, user), startX + boxWidth + 30, startY + 30);

        // Net Balance Box
        const balanceColor = stats.netBalance >= 0 ? '#e3f2fd' : '#fff3e0';
        const balanceStroke = stats.netBalance >= 0 ? '#2196f3' : '#ff9800';
        const balanceTextColor = stats.netBalance >= 0 ? '#1565c0' : '#e65100';

        doc.rect(startX + (boxWidth + 20) * 2, startY, boxWidth, boxHeight)
            .fillAndStroke(balanceColor, balanceStroke);
        doc.fontSize(10)
            .fillColor(balanceTextColor)
            .text('Net Balance', startX + (boxWidth + 20) * 2 + 10, startY + 10);
        doc.fontSize(16)
            .text(this.formatCurrency(stats.netBalance, user), startX + (boxWidth + 20) * 2 + 10, startY + 30);

        doc.y = startY + boxHeight + 25;
    }

    /**
     * Add category breakdown chart to PDF
     */
    addPDFCategoryBreakdown(doc, categoryBreakdown, user) {
        if (Object.keys(categoryBreakdown).length === 0) return;

        doc.fontSize(14)
            .fillColor('#333333')
            .text('Category Breakdown', 50, doc.y);

        doc.y += 15;

        const categories = Object.entries(categoryBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        const total = categories.reduce((sum, [, amount]) => sum + amount, 0);

        const categoryColors = {
            food: '#FF6B6B',
            transport: '#4ECDC4',
            entertainment: '#96CEB4',
            utilities: '#FECA57',
            healthcare: '#FF9FF3',
            shopping: '#45B7D1',
            other: '#A55EEA'
        };

        let yPos = doc.y;
        categories.forEach(([category, amount], index) => {
            const percentage = ((amount / total) * 100).toFixed(1);
            const barWidth = (amount / total) * 200;
            const color = categoryColors[category] || '#999999';

            doc.fontSize(10)
                .fillColor('#333333')
                .text(this.capitalizeFirst(category), 50, yPos);

            // Progress bar background
            doc.rect(150, yPos + 2, 200, 12)
                .fillColor('#f0f0f0')
                .fill();

            // Progress bar
            doc.rect(150, yPos + 2, barWidth, 12)
                .fillColor(color)
                .fill();

            // Amount
            doc.fontSize(9)
                .fillColor('#666666')
                .text(`${this.formatCurrency(amount, user)} (${percentage}%)`, 360, yPos);

            yPos += 22;
        });

        doc.y = yPos + 15;
    }

    /**
     * Add transaction table to PDF
     */
    addPDFTransactionTable(doc, expenses, user) {
        if (expenses.length === 0) {
            doc.fontSize(12)
                .fillColor('#666666')
                .text('No transactions found for the selected period.', 50, doc.y);
            return;
        }

        doc.fontSize(14)
            .fillColor('#333333')
            .text('Transaction Details', 50, doc.y);

        doc.y += 15;

        // Table headers
        const tableTop = doc.y;
        const colWidths = [80, 180, 80, 60, 80];
        const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];

        // Header background
        doc.rect(50, tableTop, 495, 20)
            .fillColor('#667eea')
            .fill();

        doc.fontSize(9)
            .fillColor('#ffffff');

        let xPos = 55;
        headers.forEach((header, i) => {
            doc.text(header, xPos, tableTop + 5);
            xPos += colWidths[i];
        });

        // Table rows
        let yPos = tableTop + 25;
        const maxRows = 25; // Limit rows per page

        expenses.slice(0, maxRows).forEach((expense, index) => {
            // Check if we need a new page
            if (yPos > 700) {
                doc.addPage();
                yPos = 50;
            }

            const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
            doc.rect(50, yPos - 3, 495, 18)
                .fillColor(bgColor)
                .fill();

            const date = new Date(expense.date).toLocaleDateString(user?.locale || 'en-US');
            const description = expense.description.length > 30
                ? expense.description.substring(0, 27) + '...'
                : expense.description;
            const amountColor = expense.type === 'income' ? '#4caf50' : '#f44336';
            const amountPrefix = expense.type === 'income' ? '+' : '-';
            const formattedAmount = this.formatCurrency(Math.abs(expense.amount), user);

            doc.fontSize(8)
                .fillColor('#333333')
                .text(date, 55, yPos)
                .text(description, 135, yPos)
                .text(this.capitalizeFirst(expense.category), 315, yPos)
                .text(this.capitalizeFirst(expense.type), 395, yPos);

            doc.fillColor(amountColor)
                .text(`${amountPrefix}${formattedAmount}`, 455, yPos);

            yPos += 18;
        });

        if (expenses.length > maxRows) {
            doc.fontSize(9)
                .fillColor('#666666')
                .text(`... and ${expenses.length - maxRows} more transactions`, 50, yPos + 10);
        }

        doc.y = yPos + 20;
    }

    /**
     * Add footer to PDF
     */
    addPDFFooter(doc) {
        const bottomY = doc.page.height - 50;

        doc.moveTo(50, bottomY - 15)
            .lineTo(545, bottomY - 15)
            .strokeColor('#e0e0e0')
            .stroke();

        doc.fontSize(8)
            .fillColor('#999999')
            .text(
                'Generated by ExpenseFlow | This is a computer-generated document.',
                50,
                bottomY,
                { align: 'center', width: 495 }
            );
    }

    /**
     * Calculate statistics from expenses
     */
    calculateStatistics(expenses) {
        const stats = {
            totalIncome: 0,
            totalExpense: 0,
            netBalance: 0,
            transactionCount: expenses.length,
            categoryBreakdown: {}
        };

        expenses.forEach(expense => {
            if (expense.type === 'income') {
                stats.totalIncome += expense.amount;
            } else {
                stats.totalExpense += expense.amount;

                // Category breakdown for expenses only
                if (!stats.categoryBreakdown[expense.category]) {
                    stats.categoryBreakdown[expense.category] = 0;
                }
                stats.categoryBreakdown[expense.category] += expense.amount;
            }
        });

        stats.netBalance = stats.totalIncome - stats.totalExpense;
        return stats;
    }

    /**
     * Generate monthly summary report
     */
    async generateMonthlySummary(userId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const expenses = await Expense.find({
            user: userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });

        const stats = this.calculateStatistics(expenses);

        // Daily breakdown
        const dailyData = {};
        expenses.forEach(expense => {
            const day = new Date(expense.date).getDate();
            if (!dailyData[day]) {
                dailyData[day] = { income: 0, expense: 0 };
            }
            if (expense.type === 'income') {
                dailyData[day].income += expense.amount;
            } else {
                dailyData[day].expense += expense.amount;
            }
        });

        return {
            period: `${this.getMonthName(month)} ${year}`,
            stats,
            dailyBreakdown: dailyData,
            transactionCount: expenses.length,
            averageDaily: stats.totalExpense / new Date(year, month, 0).getDate()
        };
    }

    /**
     * Get expenses for export with filters
     */
    async getExpensesForExport(userId, filters = {}) {
        const query = { user: userId };

        // Date range filter
        if (filters.startDate || filters.endDate) {
            query.date = {};
            if (filters.startDate) {
                query.date.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                query.date.$lte = endDate;
            }
        }

        // Category filter
        if (filters.category && filters.category !== 'all') {
            query.category = filters.category;
        }

        // Type filter
        if (filters.type && filters.type !== 'all') {
            query.type = filters.type;
        }

        return await Expense.find(query).sort({ date: -1 });
    }

    /**
     * Helper: Get date range text
     */
    getDateRangeText(startDate, endDate, locale = 'en-US') {
        if (!startDate && !endDate) {
            return 'All Time';
        }

        const formatDate = (date) => new Date(date).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        if (startDate && endDate) {
            return `${formatDate(startDate)} - ${formatDate(endDate)}`;
        } else if (startDate) {
            return `From ${formatDate(startDate)}`;
        } else {
            return `Until ${formatDate(endDate)}`;
        }
    }

    /**
     * Helper: Get month name
     */
    getMonthName(month) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1];
    }

    /**
     * Helper: Capitalize first letter
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

module.exports = new ExportService();
