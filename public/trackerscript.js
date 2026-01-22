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
  let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  let suggestionTimeout = null;
  let currentSuggestions = [];
  let selectedSuggestion = null;

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
      const token = localStorage.getItem('authToken');
      if (!token) return null;
      const response = await fetch(`/api/categorization/suggest?description=${encodeURIComponent(description)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
    categorySuggestions.classList.remove('visible');
    setTimeout(() => { categorySuggestions.classList.add('hidden'); }, 300);
  }

  function selectSuggestion(suggestion) {
    selectedSuggestion = suggestion;
    category.value = suggestion.category;
    categoryConfidence.innerHTML = `<i class="fas fa-check-circle"></i> ${(suggestion.confidence * 100).toFixed(0)}% confident`;
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
     TRANSACTION LOGIC
  ====================== */

  function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === "" || amount.value.trim() === "") {
      showNotification("Please add text and amount", "error");
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
    updateLocalStorage();
    displayTransactions();
    updateValues();

    text.value = "";
    amount.value = "";
    category.value = "";
    type.value = "";
    categoryConfidence.classList.add('hidden');
    selectedSuggestion = null;
    hideSuggestions();

    showNotification("Transaction added successfully", "success");
  }

  function displayTransactions() {
    list.innerHTML = "";
    if (transactions.length === 0) {
      list.innerHTML = `<li class="empty-message">No transactions yet</li>`;
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
        <span>${formatCurrency(Math.abs(transaction.amount))}</span>
      </div>
      <button class="delete-btn" onclick="removeTransaction(${transaction.id})">
        <i class="fas fa-trash"></i>
      </button>
    `;

    list.appendChild(item);
  }

  function updateValues() {
    const amounts = transactions.map((t) => t.amount);
    const total = amounts.reduce((acc, val) => acc + val, 0);
    const income = amounts.filter((v) => v > 0).reduce((a, b) => a + b, 0);
    const expense = amounts.filter((v) => v < 0).reduce((a, b) => a + b, 0) * -1;

    if (balance) balance.innerHTML = formatCurrency(total);
    if (moneyPlus) moneyPlus.innerHTML = `+${formatCurrency(income)}`;
    if (moneyMinus) moneyMinus.innerHTML = `-${formatCurrency(expense)}`;
  }

  function removeTransaction(id) {
    transactions = transactions.filter((t) => t.id !== id);
    updateLocalStorage();
    displayTransactions();
    updateValues();
    showNotification("Transaction deleted successfully", "success");
  }

  function updateLocalStorage() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }

  function showNotification(message, type = "info") {
    // If auth-integration's showNotification is available, use it
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      alert(message);
    }
  }

  function Init() {
    displayTransactions();
    updateValues();
  }

  // Event Listeners
  if (form) form.addEventListener("submit", addTransaction);

  // Global functions for onclick handlers
  window.removeTransaction = removeTransaction;

  Init();

  // Scroll to top functionality
  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  if (scrollToTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) scrollToTopBtn.classList.add("show");
      else scrollToTopBtn.classList.remove("show");
    });

    scrollToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});
