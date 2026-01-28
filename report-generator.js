/**
 * ExpenseFlow - Financial Report Generator (Plugin)
 * This is a standalone file that adds reporting capabilities.
 */

(function() {
    // 1. Create the floating button UI
    const reportBtn = document.createElement('button');
    reportBtn.innerHTML = '📋 Generate Report';
    reportBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
        padding: 12px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transition: transform 0.3s ease;
    `;

    reportBtn.onmouseover = () => reportBtn.style.transform = 'scale(1.1)';
    reportBtn.onmouseout = () => reportBtn.style.transform = 'scale(1)';

    // 2. Logic to generate the report
    reportBtn.onclick = () => {
        const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        
        if (transactions.length === 0) {
            alert("No transactions found to generate a report!");
            return;
        }

        let totalIncome = 0;
        let totalExpense = 0;
        let reportContent = "EXPENSEFLOW FINANCIAL REPORT\n";
        reportContent += "============================\n\n";
        reportContent += "ID | Date | Description | Amount\n";
        reportContent += "--------------------------------\n";

        transactions.forEach(t => {
            const amt = parseFloat(t.amount);
            if (amt > 0) totalIncome += amt;
            else totalExpense += amt;
            reportContent += `${t.id} | ${t.text} | ${amt.toFixed(2)}\n`;
        });

        reportContent += "\n============================\n";
        reportContent += `Total Income:  $${totalIncome.toFixed(2)}\n`;
        reportContent += `Total Expense: $${Math.abs(totalExpense).toFixed(2)}\n`;
        reportContent += `Net Balance:   $${(totalIncome + totalExpense).toFixed(2)}\n`;

        // 3. Create a download link
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ExpenseFlow_Report_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Add button to the page
    document.body.appendChild(reportBtn);
})();