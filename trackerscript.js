// ================= DOM ELEMENTS =================
const balance = document.getElementById("balance");
const money_plus = document.getElementById("money-plus");
const money_minus = document.getElementById("money-minus");
const list = document.getElementById("list");
const form = document.getElementById("form");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const category = document.getElementById("category");
const type = document.getElementById("type");
const importFileInput = document.getElementById("import-file");
const importDataBtn = document.getElementById("import-data");
const mergeDataCheckbox = document.getElementById("merge-data");

// State Management
const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));
let transactions = localStorage.getItem('transactions') !== null ? localStorageTransactions : [];
let currentFilter = 'all';
let currentCategoryFilter = 'all';
let searchQuery = '';
let dateRange = { from: null, to: null };
let amountRange = { min: null, max: null };

// Category definitions
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

// Mobile Navigation
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
  });
}

// Section Navigation System
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.app-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
    
    // Update URL hash
    window.history.pushState(null, null, `#${sectionId}`);
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
    
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update analytics if navigating to analytics section
    if (sectionId === 'analytics') {
      setTimeout(() => updateAnalytics(), 100);
    }
    
    // Update goals if navigating to goals section
    if (sectionId === 'goals') {
      setTimeout(() => displayGoals(), 100);
    }
  }
}

// Navigation Links
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    const targetId = link.getAttribute('href');
    if (targetId.startsWith('#')) {
      const sectionId = targetId.substring(1);
      showSection(sectionId);
    }
    
    // Close mobile menu if open
    if (navMenu && navMenu.classList.contains('active')) {
      navMenu.classList.remove('active');
      if (navToggle) navToggle.classList.remove('active');
    }
  });
});

// Footer Links Navigation
document.querySelectorAll('.footer-link').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const sectionId = href.substring(1);
      if (document.getElementById(sectionId)) {
        showSection(sectionId);
      }
    }
  });
});

// Filter functionality
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all buttons
    filterBtns.forEach(b => b.classList.remove('active'));
    
    // Add active class to clicked button
    btn.classList.add('active');
    
    // Set current filter
    currentFilter = btn.getAttribute('data-filter');
    
    // Re-render transactions with filter
    displayTransactions();
  });
});

// Category filter functionality
if (categoryFilter) {
  categoryFilter.addEventListener('change', () => {
    currentCategoryFilter = categoryFilter.value;
    displayTransactions();
  });
}

// Transaction type change handler
if (type) {
  type.addEventListener('change', () => {
    // Auto-set amount sign based on type
    const amountInput = document.getElementById('amount');
    if (type.value === 'expense' && amountInput.value > 0) {
      amountInput.value = -Math.abs(amountInput.value);
    } else if (type.value === 'income' && amountInput.value < 0) {
      amountInput.value = Math.abs(amountInput.value);
    }
  });
}

// Search functionality
if (searchInput) {
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.toLowerCase().trim();
    displayTransactions();
  });
}

// Date range filters
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

// Amount range filters
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

// Clear filters functionality
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', () => {
    // Reset all filters
    currentFilter = 'all';
    currentCategoryFilter = 'all';
    searchQuery = '';
    dateRange = { from: null, to: null };
    amountRange = { min: null, max: null };
    
    // Reset UI elements
    filterBtns.forEach(btn => btn.classList.remove('active'));
    filterBtns[0].classList.add('active'); // Set 'All' as active
    
    if (categoryFilter) categoryFilter.value = 'all';
    if (searchInput) searchInput.value = '';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    if (amountMin) amountMin.value = '';
    if (amountMax) amountMax.value = '';
    
    displayTransactions();
    showNotification('All filters cleared', 'info');
  });
}
// ================= LOADER =================
const globalLoader = document.getElementById("global-loader");

function showLoader() {
  if (globalLoader) globalLoader.classList.remove("hidden");
}

function hideLoader() {
  if (globalLoader) globalLoader.classList.add("hidden");
}

// ================= STATE =================
const localStorageTransactions = JSON.parse(localStorage.getItem("transactions"));
let transactions = localStorageTransactions !== null ? localStorageTransactions : [];

// ================= ADD TRANSACTION =================
function addTransaction(e) {
  e.preventDefault();

  if (
    text.value.trim() === "" ||
    amount.value.trim() === "" ||
    !category.value ||
    !type.value
  ) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  if (isNaN(amount.value) || amount.value === "0") {
    showNotification("Please enter a valid amount", "error");
    return;
  }

  let transactionAmount = +amount.value;

  if (type.value === "expense" && transactionAmount > 0) {
    transactionAmount = -transactionAmount;
  } else if (type.value === "income" && transactionAmount < 0) {
    transactionAmount = Math.abs(transactionAmount);
  }

  const transaction = {
    id: Math.floor(Math.random() * 1000000000),
    text: text.value.trim(),
    amount: transactionAmount,
    category: category.value,
    type: type.value,
    date: new Date().toISOString(),
  };
  
  transactions.push(transaction);
  
  displayTransactions();
  updateValues();
  updateLocalStorage();
  
  // Update analytics if on analytics page
  const analyticsSection = document.getElementById('analytics');
  if (analyticsSection && analyticsSection.classList.contains('active')) {
    updateAnalytics();
  }
  
  // Clear form
  text.value = '';
  amount.value = '';
  category.value = '';
  type.value = '';
  
  // Show success notification
  const transactionType = type.value || 'transaction';
  showNotification(`${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} added successfully!`, 'success');
}
  
// Generate Random ID
function generateID() {
  return Math.floor(Math.random() * 1000000000);
}

  showLoader();

  setTimeout(() => {
    transactions.push(transaction);
    updateLocalStorage();
    displayTransactions();
    updateValues();

    text.value = "";
    amount.value = "";
    category.value = "";
    type.value = "";

    hideLoader();
    showNotification("Transaction added successfully!", "success");
  }, 400);
}

// ================= DISPLAY TRANSACTIONS =================
function displayTransactions() {
  list.innerHTML = "";

  if (transactions.length === 0) {
    list.innerHTML = `
      <div style="text-align:center; padding:1rem; opacity:0.7;">
        No transactions found
      </div>
    `;
    return;
  }

  transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(addTransactionDOM);
}

function addTransactionDOM(transaction) {
  const item = document.createElement("li");
  item.classList.add(transaction.amount < 0 ? "minus" : "plus");

  item.innerHTML = `
    <div>
      <strong>${transaction.text}</strong>
      <span>₹${Math.abs(transaction.amount).toFixed(2)}</span>
    </div>
    <button class="delete-btn" onclick="removeTransaction(${transaction.id})">
      <i class="fas fa-trash"></i>
    </button>
  `;

  list.appendChild(item);
}

// ================= UPDATE VALUES =================
function updateValues() {
  const amounts = transactions.map((t) => t.amount);

  const total = amounts.reduce((acc, val) => acc + val, 0);
  const income = amounts.filter((v) => v > 0).reduce((a, b) => a + b, 0);
  const expense =
    amounts.filter((v) => v < 0).reduce((a, b) => a + b, 0) * -1;

  balance.innerHTML = `₹${total.toFixed(2)}`;
  money_plus.innerHTML = `+₹${income.toFixed(2)}`;
  money_minus.innerHTML = `-₹${expense.toFixed(2)}`;
}

// ================= REMOVE TRANSACTION =================
function removeTransaction(id) {
  const transactionToRemove = transactions.find(t => t.id === id);
  if (!transactionToRemove) return;
  
  transactions = transactions.filter(transaction => transaction.id !== id);
  updateLocalStorage();
  displayTransactions();
  updateValues();
  
  // Update analytics if on analytics page
  const analyticsSection = document.getElementById('analytics');
  if (analyticsSection && analyticsSection.classList.contains('active')) {
    updateAnalytics();
  }
  
  // Show notification
  showNotification('Transaction deleted successfully', 'success');
}

// Update Local Storage Transaction
function updateLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}
  showLoader();

  setTimeout(() => {
    transactions = transactions.filter((t) => t.id !== id);
    updateLocalStorage();
    displayTransactions();
    updateValues();
    hideLoader();
    showNotification("Transaction deleted successfully", "success");
  }, 300);
}

// ================= LOCAL STORAGE =================
function updateLocalStorage() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// ================= NOTIFICATION =================
function showNotification(message, type = "info") {
  alert(message);
}

// ================= IMPORT DATA =================
function importDataFromFile(file) {
  showLoader();

  const reader = new FileReader();
  const ext = file.name.split(".").pop().toLowerCase();

  reader.onload = function (e) {
    try {
      let importedTransactions = [];

      if (ext === "json") {
        const data = JSON.parse(e.target.result);
        importedTransactions = data.transactions || data;
      }

      if (!Array.isArray(importedTransactions)) {
        throw new Error("Invalid file format");
      }

      importedTransactions.forEach((t) => {
        t.id = t.id || Math.floor(Math.random() * 1000000000);
      });

      if (mergeDataCheckbox.checked) {
        transactions.push(...importedTransactions);
      } else {
        transactions = importedTransactions;
      }

      updateLocalStorage();
      displayTransactions();
      updateValues();

// PWA Installation
let deferredPrompt;
const installPrompt = document.getElementById('install-prompt');
const installButton = document.getElementById('install-button');
const installDismiss = document.getElementById('install-dismiss');
const offlineIndicator = document.getElementById('offline-indicator');
const updateNotification = document.getElementById('update-notification');
const updateButton = document.getElementById('update-button');

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Get the base path for service worker registration
    const basePath = window.location.pathname.split('/').slice(0, -1).join('/') || '.';
    const swPath = basePath === '.' ? './sw.js' : `${basePath}/sw.js`;
    
    navigator.serviceWorker.register(swPath, { scope: basePath === '.' ? './' : basePath })
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
        // Fallback to simple path
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.log('Fallback SW registration also failed: ', err);
        });
      });
  });
}
      importFileInput.value = "";
      importDataBtn.disabled = true;

      hideLoader();
      showNotification("Data imported successfully", "success");
    } catch (err) {
      hideLoader();
      showNotification("Import failed", "error");
    }
  };

  reader.readAsText(file);
}

// ================= INIT =================
function Init() {
  displayTransactions();
  updateValues();
}

form.addEventListener("submit", addTransaction);
Init();

// Event Listeners
form.addEventListener('submit', addTransaction);

// Analytics Functions
function updateAnalytics() {
  if (transactions.length === 0) {
    return;
  }
  
  // Calculate category totals
  const categoryTotals = {};
  transactions.forEach(transaction => {
    const category = transaction.category || 'other';
    if (!categoryTotals[category]) {
      categoryTotals[category] = { income: 0, expense: 0 };
    }
    if (transaction.amount > 0) {
      categoryTotals[category].income += transaction.amount;
    } else {
      categoryTotals[category].expense += Math.abs(transaction.amount);
    }
  });
  
  // Display top categories
  const categoryList = document.getElementById('category-list');
  if (categoryList) {
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => (b[1].expense + b[1].income) - (a[1].expense + a[1].income))
      .slice(0, 5);
    
    if (sortedCategories.length > 0) {
      categoryList.innerHTML = sortedCategories.map(([key, value]) => {
        const categoryInfo = categories[key] || categories.other;
        const total = value.income + value.expense;
        const incomePercent = total > 0 ? (value.income / total) * 100 : 0;
        const expensePercent = total > 0 ? (value.expense / total) * 100 : 0;
        return `
          <div class="category-stat-item">
            <div class="category-stat-header">
              <span class="category-icon">${categoryInfo.name}</span>
              <span class="category-total">₹${total.toFixed(2)}</span>
            </div>
            <div class="category-stat-bars">
              <div class="stat-bar income-bar" style="width: ${incomePercent}%"></div>
              <div class="stat-bar expense-bar" style="width: ${expensePercent}%"></div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      categoryList.innerHTML = '<p class="empty-message">No category data available</p>';
    }
  }
  
  // Update stats
  const totalTransactions = transactions.length;
  const expenses = transactions.filter(t => t.amount < 0);
  const incomes = transactions.filter(t => t.amount > 0);
  const avgExpense = expenses.length > 0 
    ? expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0) / expenses.length 
    : 0;
  const avgIncome = incomes.length > 0 
    ? incomes.reduce((sum, t) => sum + t.amount, 0) / incomes.length 
    : 0;
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;
  
  const totalTransactionsEl = document.getElementById('total-transactions');
  const avgExpenseEl = document.getElementById('avg-expense');
  const avgIncomeEl = document.getElementById('avg-income');
  const savingsRateEl = document.getElementById('savings-rate');
  
  if (totalTransactionsEl) totalTransactionsEl.textContent = totalTransactions;
  if (avgExpenseEl) avgExpenseEl.textContent = `₹${avgExpense.toFixed(2)}`;
  if (avgIncomeEl) avgIncomeEl.textContent = `₹${avgIncome.toFixed(2)}`;
  if (savingsRateEl) savingsRateEl.textContent = `${savingsRate}%`;
}

// Goals Management
let goals = JSON.parse(localStorage.getItem('goals')) || [];

function saveGoals() {
  localStorage.setItem('goals', JSON.stringify(goals));
}

function displayGoals() {
  const goalsGrid = document.getElementById('goals-grid');
  if (!goalsGrid) return;
  
  if (goals.length === 0) {
    goalsGrid.innerHTML = `
      <div class="empty-goals">
        <i class="fas fa-bullseye fa-4x"></i>
        <h3>No Goals Set Yet</h3>
        <p>Start by creating your first financial goal</p>
        <button class="btn-primary" onclick="document.getElementById('add-goal-btn').click()">
          <i class="fas fa-plus"></i> Create Goal
        </button>
      </div>
    `;
    return;
  }
  
  goalsGrid.innerHTML = goals.map((goal, index) => {
    const progress = (goal.current / goal.amount) * 100;
    const daysRemaining = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const remaining = goal.amount - goal.current;
    
    return `
      <div class="goal-card">
        <div class="goal-header">
          <h3>${goal.title}</h3>
          <button class="goal-delete" onclick="deleteGoal(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
          </div>
          <div class="progress-text">
            <span>₹${goal.current.toFixed(2)} / ₹${goal.amount.toFixed(2)}</span>
            <span>${progress.toFixed(1)}%</span>
          </div>
        </div>
        <div class="goal-details">
          <div class="goal-detail-item">
            <i class="fas fa-calendar"></i>
            <span>${daysRemaining > 0 ? `${daysRemaining} days left` : 'Deadline passed'}</span>
          </div>
          <div class="goal-detail-item">
            <i class="fas fa-rupee-sign"></i>
            <span>₹${remaining.toFixed(2)} remaining</span>
          </div>
        </div>
        ${goal.description ? `<p class="goal-description">${goal.description}</p>` : ''}
      </div>
    `;
  }).join('');
}

function deleteGoal(index) {
  if (confirm('Are you sure you want to delete this goal?')) {
    goals.splice(index, 1);
    saveGoals();
    displayGoals();
    showNotification('Goal deleted successfully', 'success');
  }
}

// Goals Form Handler
const goalForm = document.getElementById('goal-form');
const goalModal = document.getElementById('goal-modal');
const addGoalBtn = document.getElementById('add-goal-btn');
const closeGoalModal = document.getElementById('close-goal-modal');
const cancelGoal = document.getElementById('cancel-goal');

if (addGoalBtn) {
  addGoalBtn.addEventListener('click', () => {
    if (goalModal) goalModal.style.display = 'flex';
  });
}

if (closeGoalModal) {
  closeGoalModal.addEventListener('click', () => {
    if (goalModal) goalModal.style.display = 'none';
    if (goalForm) goalForm.reset();
  });
}

if (cancelGoal) {
  cancelGoal.addEventListener('click', () => {
    if (goalModal) goalModal.style.display = 'none';
    if (goalForm) goalForm.reset();
  });
}

if (goalForm) {
  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('goal-title').value;
    const amount = parseFloat(document.getElementById('goal-amount').value);
    const current = parseFloat(document.getElementById('goal-current').value) || 0;
    const deadline = document.getElementById('goal-deadline').value;
    const description = document.getElementById('goal-description').value;
    
    if (!title || !amount || !deadline) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    const newGoal = {
      id: Date.now(),
      title,
      amount,
      current,
      deadline,
      description,
      createdAt: new Date().toISOString()
    };
    
    goals.push(newGoal);
    saveGoals();
    displayGoals();
    goalForm.reset();
    if (goalModal) goalModal.style.display = 'none';
    showNotification('Goal created successfully!', 'success');
  });
}

// Settings Functions
const displayNameInput = document.getElementById('display-name');
const currencySelect = document.getElementById('currency-select');
const accentColorInput = document.getElementById('accent-color');
const notificationsEnabled = document.getElementById('notifications-enabled');
const budgetAlerts = document.getElementById('budget-alerts');
const exportAllDataBtn = document.getElementById('export-all-data');
const clearAllDataBtn = document.getElementById('clear-all-data');

// Load settings
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('settings')) || {};
  
  if (displayNameInput) displayNameInput.value = settings.displayName || 'John Doe';
  if (currencySelect) currencySelect.value = settings.currency || 'INR';
  if (accentColorInput) accentColorInput.value = settings.accentColor || '#64ffda';
  if (notificationsEnabled) notificationsEnabled.checked = settings.notificationsEnabled !== false;
  if (budgetAlerts) budgetAlerts.checked = settings.budgetAlerts !== false;
}

// Save settings
function saveSettings() {
  const settings = {
    displayName: displayNameInput ? displayNameInput.value : 'John Doe',
    currency: currencySelect ? currencySelect.value : 'INR',
    accentColor: accentColorInput ? accentColorInput.value : '#64ffda',
    notificationsEnabled: notificationsEnabled ? notificationsEnabled.checked : true,
    budgetAlerts: budgetAlerts ? budgetAlerts.checked : true
  };
  localStorage.setItem('settings', JSON.stringify(settings));
  
  // Update username display
  const usernameSpan = document.querySelector('.username');
  if (usernameSpan && displayNameInput) {
    usernameSpan.textContent = displayNameInput.value;
  }
  
  showNotification('Settings saved successfully', 'success');
}

// Settings event listeners
if (displayNameInput) {
  displayNameInput.addEventListener('change', saveSettings);
}
if (currencySelect) {
  currencySelect.addEventListener('change', saveSettings);
}
if (accentColorInput) {
  accentColorInput.addEventListener('change', () => {
    saveSettings();
    document.documentElement.style.setProperty('--accent-primary', accentColorInput.value);
  });
}
if (notificationsEnabled) {
  notificationsEnabled.addEventListener('change', saveSettings);
}
if (budgetAlerts) {
  budgetAlerts.addEventListener('change', saveSettings);
}

// Export all data
if (exportAllDataBtn) {
  exportAllDataBtn.addEventListener('click', () => {
    const allData = {
      transactions,
      goals,
      settings: JSON.parse(localStorage.getItem('settings')) || {},
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenseflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showNotification('All data exported successfully', 'success');
  });
}

// Clear all data
if (clearAllDataBtn) {
  clearAllDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL data? This action cannot be undone!')) {
      localStorage.clear();
      transactions = [];
      goals = [];
      updateLocalStorage();
      saveGoals();
      displayTransactions();
      updateValues();
      displayGoals();
      loadSettings();
      showNotification('All data cleared successfully', 'success');
    }
  });
}

// Theme switcher
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const theme = btn.getAttribute('data-theme');
    // Theme switching can be implemented here
    showNotification(`Theme changed to ${theme}`, 'info');
  });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Add loading animation
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    document.body.style.opacity = '1';
  }, 100);
  
  // Show dashboard section by default
  const hash = window.location.hash.substring(1);
  if (hash && document.getElementById(hash)) {
    showSection(hash);
  } else {
    showSection('dashboard');
  }
  
  // Handle hash changes
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
      showSection(hash);
    }
  });
  
  // Load settings
  loadSettings();
  
  // Display goals
  displayGoals();
  
  // Update analytics
  updateAnalytics();
  
  // Close modal when clicking outside
  if (goalModal) {
    goalModal.addEventListener('click', (e) => {
      if (e.target === goalModal) {
        goalModal.style.display = 'none';
        if (goalForm) goalForm.reset();
      }
    });
  }
  
  // Hook into transaction updates to refresh analytics
  const originalUpdateLocalStorage = updateLocalStorage;
  updateLocalStorage = function() {
    originalUpdateLocalStorage();
    if (document.getElementById('analytics') && document.getElementById('analytics').classList.contains('active')) {
      updateAnalytics();
    }
  };
});
