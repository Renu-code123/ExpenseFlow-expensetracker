document.addEventListener("DOMContentLoaded", () => {

  /* =====================
     DOM ELEMENTS
  ====================== */
  const balance = document.getElementById("balance");
  const moneyPlus = document.getElementById("money-plus");
  const moneyMinus = document.getElementById("money-minus");
  const list = document.getElementById("list");
  const form = document.getElementById("form");
  const text = document.getElementById("text");
  const amount = document.getElementById("amount");
  const category = document.getElementById("category");
  const type = document.getElementById("type");
  const categorySuggestions = document.getElementById("category-suggestions");
  const categoryConfidence = document.getElementById("category-confidence");

  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");

  /* =====================
     STATE
  ====================== */
  let transactions = [];
  let suggestionTimeout = null;
  let currentSuggestions = [];
  let selectedSuggestion = null;
  let socket = null;
  let isOnline = navigator.onLine;
  let currentFilter = 'all';

  /* =====================
     API CONFIGURATION
  ====================== */
  const API_BASE_URL = 'http://localhost:3000/api';

  // Get auth headers
  function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /* =====================
     REAL-TIME SYNC
  ====================== */
  function initializeSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;

    socket = io('http://localhost:3000', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Connected to real-time sync');
    });

    socket.on('expense_created', (expense) => {
      const transaction = {
        id: expense._id,
        text: expense.description,
        amount: expense.type === 'expense' ? -expense.amount : expense.amount,
        category: expense.category,
        type: expense.type,
        date: expense.date
      };
      transactions.push(transaction);
      displayTransactions();
      updateValues();
      showNotification('New expense synced from another device', 'info');
    });

    socket.on('expense_updated', (expense) => {
      const index = transactions.findIndex(t => t.id === expense._id);
      if (index !== -1) {
        transactions[index] = {
          id: expense._id,
          text: expense.description,
          amount: expense.type === 'expense' ? -expense.amount : expense.amount,
          category: expense.category,
          type: expense.type,
          date: expense.date
        };
        displayTransactions();
        updateValues();
        showNotification('Expense updated from another device', 'info');
      }
    });

    socket.on('expense_deleted', (data) => {
      transactions = transactions.filter(t => t.id !== data.id);
      displayTransactions();
      updateValues();
      showNotification('Expense deleted from another device', 'info');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from real-time sync');
    });
  }

  /* =====================
     API FUNCTIONS
  ====================== */
  async function fetchExpenses() {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const expenses = await response.json();
      return expenses.map(expense => ({
        id: expense._id,
        text: expense.description,
        amount: expense.type === 'expense' ? -expense.amount : expense.amount,
        category: expense.category,
        type: expense.type,
        date: expense.date,
        approvalStatus: expense.approvalStatus || 'approved' // Default to approved for backward compatibility
      }));
    } catch (error) {
      console.error('Error fetching expenses:', error);
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('transactions') || '[]');
    }
  }

  async function saveExpense(expense) {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(expense)
      });
      if (!response.ok) throw new Error('Failed to save expense');
      return await response.json();
    } catch (error) {
      console.error('Error saving expense:', error);
      throw error;
    }
  }

  async function updateExpense(id, expense) {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(expense)
      });
      if (!response.ok) throw new Error('Failed to update expense');
      return await response.json();
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  async function deleteExpense(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete expense');
      return await response.json();
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  /* =====================
     I18N & CURRENCY HELPERS
  ====================== */
  const getActiveLocale = () => (window.i18n?.getLocale?.() && window.i18n.getLocale()) || 'en-US';
  const getActiveCurrency = () => (window.i18n?.getCurrency?.() && window.i18n.getCurrency()) || window.currentUserCurrency || 'INR';

  function formatCurrency(amount, options = {}) {
    const currency = options.currency || getActiveCurrency();
    if (window.i18n?.formatCurrency) {
      return window.i18n.formatCurrency(amount, {
        currency,
        locale: getActiveLocale(),
        minimumFractionDigits: options.minimumFractionDigits ?? 2,
        maximumFractionDigits: options.maximumFractionDigits ?? 2
      });
    }

    const symbol = window.i18n?.getCurrencySymbol?.(currency) || currency;
    return `${symbol}${Number(amount || 0).toFixed(options.minimumFractionDigits ?? 2)}`;
  }

  /* =====================
     AI CATEGORIZATION
  ====================== */

  const categoryEmojis = {
    food: '🍽️',
    transport: '🚗',
    shopping: '🛒',
    entertainment: '🎬',
    bills: '💡',
    utilities: '💡',
    healthcare: '🏥',
    education: '📚',
    travel: '✈️',
    salary: '💼',
    freelance: '💻',
    investment: '📈',
    other: '📋'
  };

  const categoryLabels = {
    food: 'Food & Dining',
    transport: 'Transportation',
    shopping: 'Shopping',
    entertainment: 'Entertainment',
    bills: 'Bills & Utilities',
    utilities: 'Bills & Utilities',
    healthcare: 'Healthcare',
    education: 'Education',
    travel: 'Travel',
    salary: 'Salary',
    freelance: 'Freelance',
    investment: 'Investment',
    other: 'Other'
  };

  async function fetchCategorySuggestions(description) {
    if (!description || description.trim().length < 3) return null;
    try {
      const response = await fetch(`${API_BASE_URL}/categorization/suggest?description=${encodeURIComponent(description)}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
    return null;
  }

  function showSuggestions(suggestions) {
    if (!suggestions || !suggestions.suggestions || suggestions.suggestions.length === 0) {
      hideSuggestions();
      return;
    }

    currentSuggestions = suggestions.suggestions;
    categorySuggestions.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'suggestions-header';
    header.innerHTML = `<i class="fas fa-brain"></i><span>AI Suggestions</span>`;
    categorySuggestions.appendChild(header);

    suggestions.suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = `suggestion-item ${index === 0 ? 'primary' : ''}`;

      const confidenceLevel = suggestion.confidence > 0.75 ? 'high' :
                              suggestion.confidence > 0.5 ? 'medium' : 'low';

      item.innerHTML = `
        <div class="suggestion-content">
          <div class="suggestion-category">
            <span class="suggestion-category-icon">${categoryEmojis[suggestion.category] || '📋'}</span>
            <span>${categoryLabels[suggestion.category] || suggestion.category}</span>
          </div>
          <div class="suggestion-reason"><i class="fas fa-info-circle"></i><span>${suggestion.reason}</span></div>
        </div>
        <div class="suggestion-confidence confidence-${confidenceLevel}">
          <span class="confidence-value">${(suggestion.confidence * 100).toFixed(0)}%</span>
          <div class="confidence-bar"><div class="confidence-fill" style="width: ${suggestion.confidence * 100}%"></div></div>
        </div>
      `;

      item.addEventListener('click', () => {
        selectSuggestion(suggestion);
        hideSuggestions();
      });
      categorySuggestions.appendChild(item);
    });

    categorySuggestions.classList.remove('hidden');
    categorySuggestions.classList.add('visible');
  }

  function hideSuggestions() {
    categorySuggestions.classList.remove('visible');
    setTimeout(() => { categorySuggestions.classList.add('hidden'); }, 300);
  }

  function selectSuggestion(suggestion) {
    selectedSuggestion = suggestion;
    category.value = suggestion.category;

    // Show confidence badge
    categoryConfidence.innerHTML = `
      <i class="fas fa-check-circle"></i> ${(suggestion.confidence * 100).toFixed(0)}% confident
    `;
    categoryConfidence.classList.remove('hidden');
  }

  text.addEventListener('input', (e) => {
    const description = e.target.value;
    if (suggestionTimeout) clearTimeout(suggestionTimeout);
    categoryConfidence.classList.add('hidden');
    selectedSuggestion = null;

    if (description.trim().length >= 3) {
      categorySuggestions.innerHTML = '<div class="suggestions-loading"><i class="fas fa-spinner"></i> <span>Getting suggestions...</span></div>';
      categorySuggestions.classList.remove('hidden');
      categorySuggestions.classList.add('visible');

      suggestionTimeout = setTimeout(async () => {
        const suggestions = await fetchCategorySuggestions(description);
        if (suggestions) {
          showSuggestions(suggestions);

          // Auto-select primary suggestion if confidence is high
          if (suggestions.primarySuggestion && suggestions.primarySuggestion.confidence > 0.8) {
            selectSuggestion(suggestions.primarySuggestion);
          }
        } else hideSuggestions();
      }, 500);
    } else hideSuggestions();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.description-input-wrapper')) hideSuggestions();
  });

  /* =====================
     MOBILE NAV
  ====================== */
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }

  /* =====================
     TRANSACTION MANAGEMENT
  ====================== */

  // Add Transaction
  async function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === '' || amount.value.trim() === '' || !category.value || !type.value) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    if (isNaN(amount.value) || amount.value <= 0) {
      showNotification('Please enter a valid positive amount', 'error');
      return;
    }

    let transactionAmount = +amount.value;

    if (type.value === 'expense' && transactionAmount > 0) {
      transactionAmount = -transactionAmount;
    } else if (type.value === 'income' && transactionAmount < 0) {
      transactionAmount = Math.abs(transactionAmount);
    }

    const expense = {
      description: text.value.trim(),
      amount: Math.abs(transactionAmount),
      category: category.value,
      type: type.value
    };

    try {
      const savedExpense = await saveExpense(expense);

      // Convert to local format
      const transaction = {
        id: savedExpense._id,
        text: savedExpense.description,
        amount: savedExpense.type === 'expense' ? -savedExpense.amount : savedExpense.amount,
        category: savedExpense.category,
        type: savedExpense.type,
        date: savedExpense.date
      };

      transactions.push(transaction);
      displayTransactions();
      updateValues();

      // Clear form
      text.value = '';
      amount.value = '';
      category.value = '';
      type.value = '';

      // Reset AI state
      categoryConfidence.classList.add('hidden');
      selectedSuggestion = null;
      hideSuggestions();

      showNotification(`${type.value.charAt(0).toUpperCase() + type.value.slice(1)} added successfully!`, 'success');
    } catch (error) {
      // Handle offline mode - save to localStorage
      const transaction = {
        id: generateID(),
        text: text.value.trim(),
        amount: transactionAmount,
        category: category.value,
        type: type.value,
        date: new Date().toISOString(),
        offline: true
      };

      transactions.push(transaction);
      displayTransactions();
      updateValues();
      updateLocalStorage();

      text.value = '';
      amount.value = '';
      category.value = '';
      type.value = '';

      showNotification('Saved offline. Will sync when online.', 'warning');
    }
  }

  // Remove Transaction
  async function removeTransaction(id) {
    const transactionToRemove = transactions.find(t => t.id === id);
    if (!transactionToRemove) return;

    try {
      if (!transactionToRemove.offline) {
        await deleteExpense(id);
      }

      transactions = transactions.filter(transaction => transaction.id !== id);
      updateLocalStorage();
      displayTransactions();
      updateValues();

      showNotification('Transaction deleted successfully', 'success');
    } catch (error) {
      // Mark for deletion when online
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        transaction.pendingDelete = true;
        updateLocalStorage();
        displayTransactions();
        updateValues();
        showNotification('Marked for deletion. Will sync when online.', 'warning');
      }
    }
  }

  // Load transactions from API
  async function loadTransactions() {
    try {
      const expenses = await fetchExpenses();
      transactions = expenses;
      updateLocalStorage();
      displayTransactions();
      updateValues();
    } catch (error) {
      // Load from localStorage if API fails
      const localTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      transactions = localTransactions;
      displayTransactions();
      updateValues();
      showNotification('Loaded offline data', 'warning');
    }
  }

  // Sync offline transactions when online
  async function syncOfflineTransactions() {
    const offlineTransactions = transactions.filter(t => t.offline || t.pendingDelete);

    for (const transaction of offlineTransactions) {
      try {
        if (transaction.pendingDelete) {
          await deleteExpense(transaction.id);
          transactions = transactions.filter(t => t.id !== transaction.id);
        } else if (transaction.offline) {
          const expense = {
            description: transaction.text,
            amount: Math.abs(transaction.amount),
            category: transaction.category,
            type: transaction.type
          };

          const savedExpense = await saveExpense(expense);

          // Update local transaction with server ID
          transaction.id = savedExpense._id;
          transaction.offline = false;
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    }

    updateLocalStorage();
    showNotification('Data synced successfully', 'success');
  }

  /* =====================
     UI FUNCTIONS
  ====================== */

  function displayTransactions() {
    list.innerHTML = '';

    if (transactions.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666;">
          <p>No transactions found.</p>
        </div>
      `;
      list.appendChild(emptyMessage);
      return;
    }

    let filteredTransactions = transactions;

    // Apply filters
    if (currentFilter !== 'all') {
      filteredTransactions = transactions.filter(t => t.type === currentFilter);
    }

    filteredTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(transaction => addTransactionDOM(transaction));
  }

  function addTransactionDOM(transaction) {
    const item = document.createElement("li");
    item.classList.add(transaction.amount < 0 ? "minus" : "plus");

    const date = new Date(transaction.date);
    const formattedDate = date.toLocaleDateString('en-IN');
    const categoryInfo = categories[transaction.category] || categories.other;

    // Determine approval status
    let statusBadge = '';
    if (transaction.approvalStatus) {
      const status = transaction.approvalStatus.toLowerCase();
      const statusText = transaction.approvalStatus.charAt(0).toUpperCase() + transaction.approvalStatus.slice(1);
      statusBadge = `<span class="approval-badge status-${status}">${statusText}</span>`;
    }

    item.innerHTML = `
      <div class="transaction-content">
        <div class="transaction-main">
          <span class="transaction-text">${transaction.text}</span>
          <span class="transaction-amount">₹${Math.abs(transaction.amount).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
          <span class="transaction-category" style="background-color: ${categoryInfo.color}20; color: ${categoryInfo.color};">
            ${categoryInfo.name}
          </span>
          <div class="transaction-meta">
            <div class="transaction-date">${formattedDate}</div>
            ${statusBadge}
          </div>
        </div>
      </div>
      <button class="delete-btn" onclick="removeTransaction('${transaction.id}')">
        <i class="fas fa-trash"></i>
      </button>
    `;

    list.appendChild(item);
  }

  function updateValues() {
    const amounts = transactions.map(transaction => transaction.amount);

    const total = amounts.reduce((acc, item) => acc + item, 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => acc + item, 0);
    const expense = amounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0) * -1;

    balance.innerHTML = `₹${total.toFixed(2)}`;
    moneyPlus.innerHTML = `+₹${income.toFixed(2)}`;
    moneyMinus.innerHTML = `-₹${expense.toFixed(2)}`;
  }

  function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '1rem',
      borderRadius: '5px',
      color: 'white',
      background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
      zIndex: '10000'
    });

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  function generateID() {
    return Math.floor(Math.random() * 1000000000);
  }

  const categories = {
    food: { name: '🍽️ Food & Dining', color: '#FF6B6B' },
    transport: { name: '🚗 Transportation', color: '#4ECDC4' },
    shopping: { name: '🛒 Shopping', color: '#45B7D1' },
    entertainment: { name: '🎬 Entertainment', color: '#96CEB4' },
    utilities: { name: '💡 Bills & Utilities', color: '#FECA57' },
    healthcare: { name: '🏥 Healthcare', color: '#FF9FF3' },
    other: { name: '📋 Other', color: '#A55EEA' }
  };

  /* =====================
     FILTERS
  ====================== */
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      displayTransactions();
    }
  });

  /* =====================
     OFFLINE HANDLING
  ====================== */
  window.addEventListener('online', async () => {
    isOnline = true;
    showNotification('Back online! Syncing data...', 'info');
    await syncOfflineTransactions();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    showNotification('You are offline. Changes will be saved locally.', 'warning');
  });

  /* =====================
     INITIALIZATION
  ====================== */
  async function Init() {
    await loadTransactions();
    initializeSocket();

    // Sync offline data when online
    if (navigator.onLine) {
      await syncOfflineTransactions();
    }
  }

  // Event listeners
  form.addEventListener('submit', addTransaction);

  Init();
});
