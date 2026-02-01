// API Configuration
var API_BASE_URL = '/api';

// State
let transactions = [];
let currentFilter = 'all';
let suggestionTimeout = null;
let currentSuggestions = [];
let selectedSuggestion = null;

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
const categorySuggestions = document.getElementById("category-suggestions");
const categoryConfidence = document.getElementById("category-confidence");
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");

// Constant labels and emojis
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

const categories = {
  food: { name: '🍽️ Food & Dining', color: '#FF6B6B' },
  transport: { name: '🚗 Transportation', color: '#4ECDC4' },
  shopping: { name: '🛒 Shopping', color: '#45B7D1' },
  entertainment: { name: '🎬 Entertainment', color: '#96CEB4' },
  utilities: { name: '💡 Bills & Utilities', color: '#FECA57' },
  healthcare: { name: '🏥 Healthcare', color: '#FF9FF3' },
  other: { name: '📋 Other', color: '#A55EEA' }
};

const formatAppCurrency = (value, { showPlus = false, absolute = false } = {}) => {
  const formatter = window.i18n?.formatCurrency;
  const numericValue = Number(absolute ? Math.abs(value) : value) || 0;
  const formatted = typeof formatter === 'function'
    ? formatter(numericValue)
    : (function(){ const sym = window.i18n?.getCurrencySymbol?.(window.i18n?.getCurrency?.() || '') || ''; return `${sym}${numericValue.toFixed(2)}`; })();
  if (showPlus && numericValue > 0 && !formatted.startsWith('+') && !formatted.startsWith('-')) {
    return `+${formatted}`;
  }
  return formatted;
};

// ========================
// API Functions
// ========================

function getAuthToken() {
  return localStorage.getItem('authToken');
}

async function fetchExpenses(page = 1, limit = 50, workspaceId = null) {
  try {
    const token = getAuthToken();
    if (!token) return [];

    let url = `${API_BASE_URL}/expenses?page=${page}&limit=${limit}`;
    const activeWs = localStorage.getItem('activeWorkspaceId');
    if (activeWs && activeWs !== 'personal') {
      url += `&workspaceId=${activeWs}`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    if (!response.ok) throw new Error('Failed to fetch expenses');
    const result = await response.json();
    return result.success ? result.data : result;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    showNotification('Failed to load expenses', 'error');
    return [];
  }
}

async function saveExpense(expense, workspaceId = null) {
  try {
    const payload = { ...expense };
    const activeWs = workspaceId || localStorage.getItem('activeWorkspaceId');
    if (activeWs && activeWs !== 'personal') {
      payload.workspaceId = activeWs;
    }

    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to save expense');
    return await response.json();
  } catch (error) {
    console.error('Error saving expense:', error);
    showNotification('Failed to save expense', 'error');
    throw error;
  }
}

async function deleteExpense(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    if (!response.ok) throw new Error('Failed to delete expense');
    return await response.json();
  } catch (error) {
    console.error('Error deleting expense:', error);
    showNotification('Failed to delete expense', 'error');
    throw error;
  }
}

async function fetchCategorySuggestions(description) {
  if (!description || description.trim().length < 3) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/categorization/suggest?description=${encodeURIComponent(description)}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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

// ========================
// CORE LOGIC
// ========================

async function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === '' || amount.value.trim() === '' || !category.value || !type.value) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }

  if (isNaN(amount.value) || amount.value === '0') {
    showNotification('Please enter a valid amount', 'error');
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

    // Convert to local format for state
    const transaction = {
      id: savedExpense.data ? savedExpense.data._id : savedExpense._id,
      text: savedExpense.data ? savedExpense.data.description : savedExpense.description,
      amount: transactionAmount,
      category: category.value,
      type: type.value,
      date: new Date().toISOString()
    };

    transactions.push(transaction);
    displayTransactions();
    updateValues();

    // Clear form
    text.value = '';
    amount.value = '';
    category.value = '';
    type.value = '';
    if (categoryConfidence) categoryConfidence.classList.add('hidden');
    selectedSuggestion = null;
    hideSuggestions();

    showNotification(`${type.value.charAt(0).toUpperCase() + type.value.slice(1)} added successfully!`, 'success');
  } catch (error) {
    console.error('Failed to add transaction:', error);
    showNotification('Failed to add transaction. Please check your connection.', 'error');
  }
}

async function removeTransaction(id) {
  const transactionToRemove = transactions.find(t => t.id === id);
  if (!transactionToRemove) return;

  try {
    await deleteExpense(id);
    transactions = transactions.filter(transaction => transaction.id !== id);
    displayTransactions();
    updateValues();
    showNotification('Transaction deleted successfully', 'success');
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    showNotification('Failed to delete transaction. Please check your connection.', 'error');
  }
}

// UI Helpers

function displayTransactions() {
  if (!list) return;
  list.innerHTML = '';

  if (transactions.length === 0) {
    list.innerHTML = `<li class="empty-message">No transactions yet</li>`;
    return;
  }

  transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(transaction => addTransactionDOM(transaction));
}

function addTransactionDOM(transaction) {
  const item = document.createElement("li");
  item.classList.add(transaction.amount < 0 ? "minus" : "plus");

  const categoryInfo = categories[transaction.category] || categories.other;
  const date = new Date(transaction.date);
  const formattedDate = date.toLocaleDateString(window.i18n?.getLocale?.() || 'en-US');

  item.innerHTML = `
    <div class="transaction-content">
      <div class="transaction-main">
        <span class="transaction-text">${transaction.text}</span>
        <span class="transaction-amount">${formatAppCurrency(transaction.amount, { absolute: true })}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
        <span class="transaction-category" style="background-color: ${categoryInfo.color}20; color: ${categoryInfo.color};">
          ${categoryInfo.name}
        </span>
        <div class="transaction-date">${formattedDate}</div>
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

  if (balance) balance.innerHTML = formatAppCurrency(total);
  if (money_plus) money_plus.innerHTML = formatAppCurrency(income, { showPlus: true });
  if (money_minus) money_minus.innerHTML = formatAppCurrency(-expense);

  // Update quick stats if they exist
  const quickBalance = document.getElementById('quick-balance');
  const quickIncome = document.getElementById('quick-income');
  const quickExpense = document.getElementById('quick-expense');
  if (quickBalance) quickBalance.textContent = formatAppCurrency(total);
  if (quickIncome) quickIncome.textContent = formatAppCurrency(income);
  if (quickExpense) quickExpense.textContent = formatAppCurrency(expense);
}



// AI Suggestion UI Functions
function showSuggestions(suggestions) {
  if (!categorySuggestions) return;
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
    const confidenceLevel = suggestion.confidence > 0.75 ? 'high' : suggestion.confidence > 0.5 ? 'medium' : 'low';

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
  if (!categorySuggestions) return;
  categorySuggestions.classList.remove('visible');
  setTimeout(() => { if (categorySuggestions) categorySuggestions.classList.add('hidden'); }, 300);
}

function selectSuggestion(suggestion) {
  if (!category || !categoryConfidence) return;
  selectedSuggestion = suggestion;
  category.value = suggestion.category;
  categoryConfidence.innerHTML = `<i class="fas fa-check-circle"></i> ${(suggestion.confidence * 100).toFixed(0)}% confident`;
  categoryConfidence.classList.remove('hidden');
}

// Global UI functions
if (!window.showNotification) {
  window.showNotification = function (message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    Object.assign(notification.style, {
      position: 'fixed', top: '20px', right: '20px', padding: '1rem',
      borderRadius: '5px', color: 'white', zIndex: '10000',
      background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'
    });
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };
}



// ========================
// INITIALIZATION
// ========================

async function initApp() {
  try {
    const expenses = await fetchExpenses();
    transactions = expenses.map(expense => ({
      id: expense._id,
      text: expense.description,
      amount: expense.type === 'expense' ? -expense.amount : expense.amount,
      category: expense.category,
      type: expense.type,
      date: expense.date
    }));
    displayTransactions();
    updateValues();
  } catch (error) {
    console.error('Failed to load transactions:', error);
    showNotification('Failed to load transactions. Please check your connection.', 'error');
    transactions = [];
    displayTransactions();
    updateValues();
  }
}

// Event Listeners
if (form) form.addEventListener('submit', addTransaction);

if (text) {
  text.addEventListener('input', (e) => {
    const description = e.target.value;
    if (suggestionTimeout) clearTimeout(suggestionTimeout);
    if (categoryConfidence) categoryConfidence.classList.add('hidden');
    selectedSuggestion = null;

    if (description.trim().length >= 3) {
      if (categorySuggestions) {
        categorySuggestions.innerHTML = '<div class="suggestions-loading"><i class="fas fa-spinner"></i> <span>Getting suggestions...</span></div>';
        categorySuggestions.classList.remove('hidden');
        categorySuggestions.classList.add('visible');
      }

      suggestionTimeout = setTimeout(async () => {
        const suggestions = await fetchCategorySuggestions(description);
        if (suggestions) {
          showSuggestions(suggestions);
          if (suggestions.primarySuggestion && suggestions.primarySuggestion.confidence > 0.8) {
            selectSuggestion(suggestions.primarySuggestion);
          }
        } else hideSuggestions();
      }, 500);
    } else hideSuggestions();
  });
}

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });
}

window.addEventListener('online', syncOfflineTransactions);

// Global Exposure
window.removeTransaction = removeTransaction;
window.updateAllData = initApp;

// Start the app
document.addEventListener('DOMContentLoaded', initApp);