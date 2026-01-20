// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// API Functions
async function fetchExpenses() {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses`);
    if (!response.ok) throw new Error('Failed to fetch expenses');
    return await response.json();
  } catch (error) {
    console.error('Error fetching expenses:', error);
    showNotification('Failed to load expenses', 'error');
    return [];
  }
}

async function saveExpense(expense) {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    if (!response.ok) throw new Error('Failed to save expense');
    return await response.json();
  } catch (error) {
    console.error('Error saving expense:', error);
    showNotification('Failed to save expense', 'error');
    throw error;
  }
}

async function updateExpense(id, expense) {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    if (!response.ok) throw new Error('Failed to update expense');
    return await response.json();
  } catch (error) {
    console.error('Error updating expense:', error);
    showNotification('Failed to update expense', 'error');
    throw error;
  }
}

async function deleteExpense(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete expense');
    return await response.json();
  } catch (error) {
    console.error('Error deleting expense:', error);
    showNotification('Failed to delete expense', 'error');
    throw error;
  }
}

// Modified Add Transaction Function
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
    updateLocalStorage();
    
    // Clear form
    text.value = '';
    amount.value = '';
    category.value = '';
    type.value = '';
    
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

// Modified Remove Transaction Function
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
    transactions = expenses.map(expense => ({
      id: expense._id,
      text: expense.description,
      amount: expense.type === 'expense' ? -expense.amount : expense.amount,
      category: expense.category,
      type: expense.type,
      date: expense.date
    }));
    
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

// Modified initialization
async function Init() {
  await loadTransactions();
  
  // Sync offline data when online
  if (navigator.onLine) {
    await syncOfflineTransactions();
  }
}

// Online event listener for syncing
window.addEventListener('online', async () => {
  await syncOfflineTransactions();
});

// Keep existing code for DOM elements, categories, and other functions...
const balance = document.getElementById("balance");
const money_plus = document.getElementById("money-plus");
const money_minus = document.getElementById("money-minus");
const list = document.getElementById("list");
const form = document.getElementById("form");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const category = document.getElementById("category");
const type = document.getElementById("type");

let transactions = [];
let currentFilter = 'all';

const categories = {
  food: { name: '🍽️ Food & Dining', color: '#FF6B6B' },
  transport: { name: '🚗 Transportation', color: '#4ECDC4' },
  shopping: { name: '🛒 Shopping', color: '#45B7D1' },
  entertainment: { name: '🎬 Entertainment', color: '#96CEB4' },
  utilities: { name: '💡 Bills & Utilities', color: '#FECA57' },
  healthcare: { name: '🏥 Healthcare', color: '#FF9FF3' },
  other: { name: '📋 Other', color: '#A55EEA' }
};

function generateID() {
  return Math.floor(Math.random() * 1000000000);
}

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
  
  transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(transaction => addTransactionDOM(transaction));
}

function addTransactionDOM(transaction) {
  const item = document.createElement("li");
  item.classList.add(transaction.amount < 0 ? "minus" : "plus");
  
  const date = new Date(transaction.date);
  const formattedDate = date.toLocaleDateString('en-IN');
  const categoryInfo = categories[transaction.category] || categories.other;
  
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
  
  balance.innerHTML = `₹${total.toFixed(2)}`;
  money_plus.innerHTML = `+₹${income.toFixed(2)}`;
  money_minus.innerHTML = `-₹${expense.toFixed(2)}`;
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

// Initialize app
Init();

// Event listeners
form.addEventListener('submit', addTransaction);