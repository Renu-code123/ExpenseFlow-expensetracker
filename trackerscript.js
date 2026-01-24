// =============================================
// ExpenseFlow - Main Application Script
// With Backend API Integration & Multi-Currency Support
// =============================================

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
  AUD: 'A$', CAD: 'C$', CHF: 'CHF', CNY: '¥', AED: 'د.إ',
  SGD: 'S$', HKD: 'HK$', KRW: '₩', MXN: '$', BRL: 'R$'
};

// State Management
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let baseCurrency = currentUser?.baseCurrency || 'INR';
let exchangeRates = {};
let transactions = [];
let currentFilter = 'all';
let currentCategoryFilter = 'all';
let searchQuery = '';
let dateRange = { from: null, to: null };
let amountRange = { min: null, max: null };
let isOnline = navigator.onLine;

// DOM Elements
const balance = document.getElementById("balance");
const money_plus = document.getElementById("money-plus");
const money_minus = document.getElementById("money-minus");
const list = document.getElementById("list");
const form = document.getElementById("form");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const category = document.getElementById("category");
const type = document.getElementById("type");
const currency = document.getElementById("currency");
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");
const filterBtns = document.querySelectorAll(".filter-btn");
const categoryFilter = document.getElementById("category-filter");
const searchInput = document.getElementById("search-input");
const dateFrom = document.getElementById("date-from");
const dateTo = document.getElementById("date-to");
const amountMin = document.getElementById("amount-min");
const amountMax = document.getElementById("amount-max");
const clearFiltersBtn = document.getElementById("clear-filters");
const exportCsvBtn = document.getElementById("export-csv");
const exportJsonBtn = document.getElementById("export-json");
const importFileInput = document.getElementById("import-file");
const importDataBtn = document.getElementById("import-data");
const mergeDataCheckbox = document.getElementById("merge-data");
const authButton = document.getElementById("auth-button");
const displayUsername = document.getElementById("display-username");
const authModal = document.getElementById("auth-modal");
const closeAuthModal = document.getElementById("close-auth-modal");
const authModalForm = document.getElementById("auth-modal-form");
const authModalTitle = document.getElementById("auth-modal-title");
const authNameField = document.getElementById("auth-name-field");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authSwitchLabel = document.getElementById("auth-switch-label");
const authSwitchLink = document.getElementById("auth-switch-link");
const amountConversion = document.getElementById("amount-conversion");
const convertedAmount = document.getElementById("converted-amount");

// Categories
const categories = {
  food: { name: '🍽️ Food & Dining', color: '#FF6B6B' },
  transport: { name: '🚗 Transportation', color: '#4ECDC4' },
  shopping: { name: '🛒 Shopping', color: '#45B7D1' },
  entertainment: { name: '🎬 Entertainment', color: '#96CEB4' },
  bills: { name: '💡 Bills & Utilities', color: '#FECA57' },
  healthcare: { name: '🏥 Healthcare', color: '#FF9FF3' },
  education: { name: '📚 Education', color: '#54A0FF' },
  travel: { name: '✈️ Travel', color: '#5F27CD' },
  salary: { name: '💼 Salary', color: '#00D2D3' },
  freelance: { name: '💻 Freelance', color: '#FF9F43' },
  investment: { name: '📈 Investment', color: '#10AC84' },
  other: { name: '📋 Other', color: '#A55EEA' }
};

// =============================================
// Authentication Functions
// =============================================

async function register(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const data = await response.json();
  authToken = data.token;
  currentUser = data.user;
  baseCurrency = currentUser.baseCurrency || 'INR';

  localStorage.setItem('authToken', authToken);
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  return data;
}

async function login(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  authToken = data.token;
  currentUser = data.user;
  baseCurrency = currentUser.baseCurrency || 'INR';

  localStorage.setItem('authToken', authToken);
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  return data;
}

function logout() {
  authToken = null;
  currentUser = null;
  transactions = [];

  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');

  updateAuthUI();
  displayTransactions();
  updateValues();
  showNotification('Logged out successfully', 'success');
}

function updateAuthUI() {
  if (currentUser && authToken) {
    displayUsername.textContent = currentUser.name;
    authButton.textContent = 'Logout';
    authButton.classList.add('logout-btn');
    authButton.onclick = logout;
  } else {
    displayUsername.textContent = 'Guest';
    authButton.textContent = 'Login';
    authButton.classList.remove('logout-btn');
    authButton.onclick = () => showAuthModal('login');
  }
}

// =============================================
// Auth Modal Functions
// =============================================

let isLoginMode = true;

function showAuthModal(mode = 'login') {
  isLoginMode = mode === 'login';
  updateAuthModalUI();
  authModal.style.display = 'flex';
}

function hideAuthModal() {
  authModal.style.display = 'none';
  authModalForm.reset();
}

function updateAuthModalUI() {
  if (isLoginMode) {
    authModalTitle.textContent = 'Login to ExpenseFlow';
    authNameField.style.display = 'none';
    authSubmitBtn.textContent = 'Login';
    authSwitchLabel.textContent = "Don't have an account?";
    authSwitchLink.textContent = 'Register';
  } else {
    authModalTitle.textContent = 'Create Account';
    authNameField.style.display = 'block';
    authSubmitBtn.textContent = 'Register';
    authSwitchLabel.textContent = 'Already have an account?';
    authSwitchLink.textContent = 'Login';
  }
}

if (closeAuthModal) {
  closeAuthModal.addEventListener('click', hideAuthModal);
}

if (authModal) {
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) hideAuthModal();
  });
}

if (authSwitchLink) {
  authSwitchLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    updateAuthModalUI();
  });
}

if (authModalForm) {
  authModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value;

    try {
      if (isLoginMode) {
        await login({ email, password });
        showNotification(`Welcome back, ${currentUser.name}!`, 'success');
      } else {
        if (!name.trim()) {
          showNotification('Please enter your name', 'error');
          return;
        }
        await register({ name, email, password });
        showNotification(`Welcome, ${currentUser.name}!`, 'success');
      }

      hideAuthModal();
      updateAuthUI();
      await loadTransactions();
      await loadExchangeRates();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
}

// =============================================
// Currency Functions
// =============================================

async function loadExchangeRates() {
  try {
    const response = await fetch(`${API_BASE_URL}/currency/rates?base=${baseCurrency}`);
    if (response.ok) {
      const data = await response.json();
      exchangeRates = data.rates || {};
      return exchangeRates;
    }
  } catch (error) {
    console.error('Failed to load exchange rates:', error);
  }
  return {};
}

function convertToBaseCurrency(amount, fromCurrency) {
  if (fromCurrency === baseCurrency) return amount;

  const rate = exchangeRates[fromCurrency];
  if (!rate) return amount;

  // Conversion logic: amount in fromCurrency * (1/rate) = amount in baseCurrency
  return amount / rate;
}

function formatCurrency(amount, currencyCode = baseCurrency) {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
}

// Update conversion preview when amount or currency changes
if (amount && currency) {
  const updateConversion = async () => {
    const amountValue = parseFloat(amount.value) || 0;
    const selectedCurrency = currency.value;

    if (selectedCurrency !== baseCurrency && amountValue > 0) {
      const converted = convertToBaseCurrency(amountValue, selectedCurrency);
      convertedAmount.textContent = formatCurrency(converted, baseCurrency);
      amountConversion.style.display = 'block';
    } else {
      amountConversion.style.display = 'none';
    }
  };

  amount.addEventListener('input', updateConversion);
  currency.addEventListener('change', updateConversion);
}

// =============================================
// API Functions
// =============================================

async function fetchExpenses() {
  if (!authToken) return [];

  const response = await fetch(`${API_BASE_URL}/expenses`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Session expired');
    }
    throw new Error('Failed to fetch expenses');
  }

  return await response.json();
}

async function saveExpenseAPI(expense) {
  if (!authToken) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(expense)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save expense');
  }

  return await response.json();
}

async function deleteExpenseAPI(id) {
  if (!authToken) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  if (!response.ok) throw new Error('Failed to delete expense');
  return await response.json();
}

// =============================================
// Transaction Functions
// =============================================

async function loadTransactions() {
  if (!authToken) {
    // Load from localStorage for guest mode
    transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    displayTransactions();
    updateValues();
    return;
  }

  try {
    const expenses = await fetchExpenses();
    transactions = expenses.map(expense => ({
      id: expense._id,
      text: expense.description,
      amount: expense.type === 'expense' ? -expense.amount : expense.amount,
      category: expense.category,
      type: expense.type,
      currency: expense.currency || 'INR',
      baseAmount: expense.baseAmount || expense.amount,
      date: expense.date
    }));

    displayTransactions();
    updateValues();
    updateLocalStorage();
  } catch (error) {
    console.error('Failed to load transactions:', error);
    // Fallback to localStorage
    transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    displayTransactions();
    updateValues();
    showNotification('Loaded offline data', 'warning');
  }
}

async function addTransaction(e) {
  e.preventDefault();

  if (!text.value.trim() || !amount.value.trim() || !category.value || !type.value) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }

  const amountValue = parseFloat(amount.value);
  if (isNaN(amountValue) || amountValue === 0) {
    showNotification('Please enter a valid amount', 'error');
    return;
  }

  const selectedCurrency = currency ? currency.value : 'INR';
  const transactionAmount = type.value === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue);

  const expense = {
    description: text.value.trim(),
    amount: Math.abs(amountValue),
    category: category.value,
    type: type.value,
    currency: selectedCurrency
  };

  if (authToken && isOnline) {
    try {
      const savedExpense = await saveExpenseAPI(expense);

      const transaction = {
        id: savedExpense._id,
        text: savedExpense.description,
        amount: savedExpense.type === 'expense' ? -savedExpense.amount : savedExpense.amount,
        category: savedExpense.category,
        type: savedExpense.type,
        currency: savedExpense.currency,
        baseAmount: savedExpense.baseAmount,
        date: savedExpense.date
      };

      transactions.push(transaction);
      displayTransactions();
      updateValues();
      updateLocalStorage();

      showNotification('Transaction added successfully!', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
      return;
    }
  } else {
    // Offline or guest mode - save locally
    const transaction = {
      id: generateID(),
      text: text.value.trim(),
      amount: transactionAmount,
      category: category.value,
      type: type.value,
      currency: selectedCurrency,
      baseAmount: convertToBaseCurrency(Math.abs(transactionAmount), selectedCurrency),
      date: new Date().toISOString(),
      offline: true
    };

    transactions.push(transaction);
    displayTransactions();
    updateValues();
    updateLocalStorage();

    const msg = authToken ? 'Saved offline. Will sync when online.' : 'Transaction saved locally (guest mode)';
    showNotification(msg, 'warning');
  }

  // Clear form
  text.value = '';
  amount.value = '';
  category.value = '';
  type.value = '';
  if (currency) currency.value = baseCurrency;
  if (amountConversion) amountConversion.style.display = 'none';
}

async function removeTransaction(id) {
  const transactionToRemove = transactions.find(t => t.id === id);
  if (!transactionToRemove) return;

  if (authToken && isOnline && !transactionToRemove.offline) {
    try {
      await deleteExpenseAPI(id);
    } catch (error) {
      showNotification('Failed to delete from server', 'error');
      return;
    }
  }

  transactions = transactions.filter(t => t.id !== id);
  updateLocalStorage();
  displayTransactions();
  updateValues();
  showNotification('Transaction deleted', 'success');
}

// =============================================
// Display Functions
// =============================================

function generateID() {
  return Math.floor(Math.random() * 1000000000);
}

function getFilteredTransactions() {
  let filtered = transactions;

  if (currentFilter === 'income') {
    filtered = filtered.filter(t => t.amount > 0);
  } else if (currentFilter === 'expense') {
    filtered = filtered.filter(t => t.amount < 0);
  }

  if (currentCategoryFilter !== 'all') {
    filtered = filtered.filter(t => t.category === currentCategoryFilter);
  }

  if (searchQuery) {
    filtered = filtered.filter(t => {
      const searchText = t.text.toLowerCase();
      const categoryName = categories[t.category]?.name.toLowerCase() || '';
      return searchText.includes(searchQuery) || categoryName.includes(searchQuery);
    });
  }

  if (dateRange.from || dateRange.to) {
    filtered = filtered.filter(t => {
      const transactionDate = new Date(t.date);
      if (dateRange.from && transactionDate < dateRange.from) return false;
      if (dateRange.to && transactionDate > dateRange.to) return false;
      return true;
    });
  }

  if (amountRange.min !== null || amountRange.max !== null) {
    filtered = filtered.filter(t => {
      const absAmount = Math.abs(t.amount);
      if (amountRange.min !== null && absAmount < amountRange.min) return false;
      if (amountRange.max !== null && absAmount > amountRange.max) return false;
      return true;
    });
  }

  return filtered;
}

function displayTransactions() {
  list.innerHTML = '';

  const filteredTransactions = getFilteredTransactions();

  if (filteredTransactions.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p>No transactions found.</p>
        <small>${authToken ? 'Add your first transaction below.' : 'Login or add transactions as a guest.'}</small>
      </div>
    `;
    return;
  }

  filteredTransactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(transaction => addTransactionDOM(transaction));
}

function addTransactionDOM(transaction) {
  const item = document.createElement("li");
  item.classList.add(transaction.amount < 0 ? "minus" : "plus");

  const date = new Date(transaction.date || Date.now());
  const formattedDate = date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const categoryInfo = categories[transaction.category] || categories.other;
  const transactionCurrency = transaction.currency || baseCurrency;
  const showCurrencyBadge = transactionCurrency !== baseCurrency;

  item.innerHTML = `
    <div class="transaction-content">
      <div class="transaction-main">
        <span class="transaction-text">${transaction.text}</span>
        <span class="transaction-amount">
          ${formatCurrency(Math.abs(transaction.amount), transactionCurrency)}
          ${showCurrencyBadge ? `<span class="currency-badge">${transactionCurrency}</span>` : ''}
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
        <span class="transaction-category" style="background-color: ${categoryInfo.color}20; color: ${categoryInfo.color}; border: 1px solid ${categoryInfo.color}40;">
          ${categoryInfo.name}
        </span>
        <div class="transaction-date">${formattedDate}</div>
      </div>
      ${showCurrencyBadge ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">≈ ${formatCurrency(transaction.baseAmount || transaction.amount, baseCurrency)}</div>` : ''}
    </div>
    <button class="delete-btn" onclick="removeTransaction('${transaction.id}')">
      <i class="fas fa-trash"></i>
    </button>
  `;

  list.appendChild(item);
}

function updateValues() {
  // Calculate totals in base currency
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(t => {
    const baseAmount = t.baseAmount || Math.abs(t.amount);
    if (t.amount > 0) {
      totalIncome += baseAmount;
    } else {
      totalExpense += baseAmount;
    }
  });

  const total = totalIncome - totalExpense;

  balance.innerHTML = formatCurrency(total, baseCurrency);
  money_plus.innerHTML = `+${formatCurrency(totalIncome, baseCurrency)}`;
  money_minus.innerHTML = `-${formatCurrency(totalExpense, baseCurrency)}`;

  // Visual feedback
  const balanceCard = document.querySelector('.balance-card');
  if (balanceCard) {
    balanceCard.classList.remove('positive', 'negative', 'neutral');
    balanceCard.classList.add(total > 0 ? 'positive' : total < 0 ? 'negative' : 'neutral');
  }
}

function updateLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// =============================================
// Event Listeners
// =============================================

// Navigation
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
  });
}

// Filter buttons
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.getAttribute('data-filter');
    displayTransactions();
  });
});

// Category filter
if (categoryFilter) {
  categoryFilter.addEventListener('change', () => {
    currentCategoryFilter = categoryFilter.value;
    displayTransactions();
  });
}

// Search
if (searchInput) {
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.toLowerCase().trim();
    displayTransactions();
  });
}

// Date filters
if (dateFrom) {
  dateFrom.addEventListener('change', () => {
    dateRange.from = dateFrom.value ? new Date(dateFrom.value) : null;
    displayTransactions();
  });
}

if (dateTo) {
  dateTo.addEventListener('change', () => {
    dateRange.to = dateTo.value ? new Date(dateTo.value + 'T23:59:59') : null;
    displayTransactions();
  });
}

// Amount filters
if (amountMin) {
  amountMin.addEventListener('input', () => {
    amountRange.min = amountMin.value ? parseFloat(amountMin.value) : null;
    displayTransactions();
  });
}

if (amountMax) {
  amountMax.addEventListener('input', () => {
    amountRange.max = amountMax.value ? parseFloat(amountMax.value) : null;
    displayTransactions();
  });
}

// Clear filters
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', () => {
    currentFilter = 'all';
    currentCategoryFilter = 'all';
    searchQuery = '';
    dateRange = { from: null, to: null };
    amountRange = { min: null, max: null };

    filterBtns.forEach(btn => btn.classList.remove('active'));
    filterBtns[0]?.classList.add('active');

    if (categoryFilter) categoryFilter.value = 'all';
    if (searchInput) searchInput.value = '';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    if (amountMin) amountMin.value = '';
    if (amountMax) amountMax.value = '';

    displayTransactions();
    showNotification('Filters cleared', 'info');
  });
}

// Export CSV
if (exportCsvBtn) {
  exportCsvBtn.addEventListener('click', exportDataToCSV);
}

// Export JSON
if (exportJsonBtn) {
  exportJsonBtn.addEventListener('click', exportDataToJSON);
}

// Import file
if (importFileInput) {
  importFileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      importDataBtn.disabled = false;
      importDataBtn.textContent = `Import ${e.target.files[0].name}`;
    } else {
      importDataBtn.disabled = true;
      importDataBtn.innerHTML = '<i class="fas fa-download"></i> Import Data';
    }
  });
}

if (importDataBtn) {
  importDataBtn.addEventListener('click', () => {
    const file = importFileInput.files[0];
    if (file) importDataFromFile(file);
  });
}

// Form submit
if (form) {
  form.addEventListener('submit', addTransaction);
}

// Online/Offline status
window.addEventListener('online', async () => {
  isOnline = true;
  document.getElementById('offline-indicator').style.display = 'none';
  showNotification('Back online!', 'success');

  if (authToken) {
    await syncOfflineTransactions();
  }
});

window.addEventListener('offline', () => {
  isOnline = false;
  document.getElementById('offline-indicator').style.display = 'flex';
  showNotification('You are offline', 'warning');
});

// =============================================
// Export/Import Functions
// =============================================

function exportDataToCSV() {
  if (transactions.length === 0) {
    showNotification('No data to export', 'warning');
    return;
  }

  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency'];
  const csvContent = [headers.join(',')];

  transactions.forEach(t => {
    const date = new Date(t.date).toLocaleDateString('en-IN');
    const categoryName = categories[t.category]?.name.replace(/[^\w\s]/gi, '') || 'Other';
    const type = t.amount > 0 ? 'Income' : 'Expense';
    const row = [`"${date}"`, `"${t.text.replace(/"/g, '""')}"`, `"${categoryName}"`, `"${type}"`, Math.abs(t.amount).toFixed(2), t.currency || 'INR'];
    csvContent.push(row.join(','));
  });

  const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `expenseflow-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  showNotification('Exported to CSV', 'success');
}

function exportDataToJSON() {
  if (transactions.length === 0) {
    showNotification('No data to export', 'warning');
    return;
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    baseCurrency,
    totalTransactions: transactions.length,
    transactions
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `expenseflow-${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  showNotification('Exported to JSON', 'success');
}

function importDataFromFile(file) {
  const reader = new FileReader();
  const ext = file.name.split('.').pop().toLowerCase();

  reader.onload = (e) => {
    try {
      let imported = [];

      if (ext === 'json') {
        const data = JSON.parse(e.target.result);
        imported = data.transactions || data;
      } else if (ext === 'csv') {
        imported = parseCSV(e.target.result);
      } else {
        throw new Error('Unsupported file format');
      }

      const valid = imported.filter(t => t.text && typeof t.amount === 'number' && t.date);

      if (valid.length === 0) {
        showNotification('No valid transactions found', 'error');
        return;
      }

      valid.forEach(t => {
        if (!t.id) t.id = generateID();
        if (!t.category) t.category = 'other';
        if (!t.type) t.type = t.amount > 0 ? 'income' : 'expense';
        if (!t.currency) t.currency = 'INR';
        t.offline = true;
      });

      if (mergeDataCheckbox?.checked) {
        transactions.push(...valid);
      } else {
        transactions = valid;
      }

      updateLocalStorage();
      displayTransactions();
      updateValues();

      importFileInput.value = '';
      importDataBtn.disabled = true;
      importDataBtn.innerHTML = '<i class="fas fa-download"></i> Import Data';

      showNotification(`Imported ${valid.length} transactions`, 'success');
    } catch (error) {
      showNotification('Import failed: ' + error.message, 'error');
    }
  };

  reader.readAsText(file);
}

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    if (values.length >= 5) {
      result.push({
        id: generateID(),
        date: new Date(values[0]).toISOString(),
        text: values[1],
        category: values[2].toLowerCase().replace(/[^\w]/g, '') || 'other',
        type: values[3].toLowerCase(),
        amount: values[3].toLowerCase() === 'expense' ? -parseFloat(values[4]) : parseFloat(values[4]),
        currency: values[5] || 'INR'
      });
    }
  }

  return result;
}

// =============================================
// Sync Offline Transactions
// =============================================

async function syncOfflineTransactions() {
  const offline = transactions.filter(t => t.offline);
  if (offline.length === 0) return;

  let synced = 0;

  for (const t of offline) {
    try {
      const expense = {
        description: t.text,
        amount: Math.abs(t.amount),
        category: t.category,
        type: t.type,
        currency: t.currency
      };

      const saved = await saveExpenseAPI(expense);
      t.id = saved._id;
      t.offline = false;
      synced++;
    } catch (error) {
      console.error('Sync failed for:', t, error);
    }
  }

  updateLocalStorage();

  if (synced > 0) {
    showNotification(`Synced ${synced} transactions`, 'success');
  }
}

// =============================================
// Notification System
// =============================================

function showNotification(message, type = 'info') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="notification-close"><i class="fas fa-times"></i></button>
  `;

  Object.assign(notification.style, {
    position: 'fixed',
    top: '100px',
    right: '20px',
    background: type === 'success' ? 'rgba(76, 175, 80, 0.9)' :
      type === 'error' ? 'rgba(244, 67, 54, 0.9)' :
        type === 'warning' ? 'rgba(255, 152, 0, 0.9)' :
          'rgba(33, 150, 243, 0.9)',
    color: 'white',
    padding: '1rem 1.5rem',
    borderRadius: '10px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    zIndex: '10000',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    minWidth: '300px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    animation: 'slideInRight 0.3s ease-out'
  });

  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }
  }, 3000);
}

// Add notification animation styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  .notification-content { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
  .notification-close { background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; padding: 0.25rem; border-radius: 50%; display: flex; }
  .notification-close:hover { background: rgba(255,255,255,0.2); }
`;
document.head.appendChild(notificationStyles);

// =============================================
// PWA Support
// =============================================

let deferredPrompt;
const installPrompt = document.getElementById('install-prompt');
const installButton = document.getElementById('install-button');
const installDismiss = document.getElementById('install-dismiss');
const offlineIndicator = document.getElementById('offline-indicator');
const updateNotification = document.getElementById('update-notification');
const updateButton = document.getElementById('update-button');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('SW registered:', reg))
      .catch((err) => console.log('SW registration failed:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => {
    if (installPrompt && !localStorage.getItem('pwa-install-dismissed')) {
      installPrompt.style.display = 'block';
    }
  }, 10000);
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        showNotification('ExpenseFlow installed!', 'success');
      }
      deferredPrompt = null;
      installPrompt.style.display = 'none';
    }
  });
}

if (installDismiss) {
  installDismiss.addEventListener('click', () => {
    installPrompt.style.display = 'none';
    localStorage.setItem('pwa-install-dismissed', 'true');
  });
}

if (updateButton) {
  updateButton.addEventListener('click', () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

// =============================================
// Initialization
// =============================================

async function Init() {
  updateAuthUI();
  await loadExchangeRates();
  await loadTransactions();

  // Set default currency in form
  if (currency) {
    currency.value = baseCurrency;
  }

  // Add loading animation
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    document.body.style.opacity = '1';
  }, 100);
}

// Start the app
Init();
