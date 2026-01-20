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
     AI CATEGORIZATION
  ====================== */

  // Category emoji mapping
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

  // Category labels mapping
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

  // Fetch category suggestions from API
  async function fetchCategorySuggestions(description) {
    if (!description || description.trim().length < 3) {
      return null;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch(`/api/categorization/suggest?description=${encodeURIComponent(description)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  // Show category suggestions
  function showSuggestions(suggestions) {
    if (!suggestions || !suggestions.suggestions || suggestions.suggestions.length === 0) {
      hideSuggestions();
      return;
    }

    currentSuggestions = suggestions.suggestions;
    categorySuggestions.innerHTML = '';

    // Add header
    const header = document.createElement('div');
    header.className = 'suggestions-header';
    header.innerHTML = `
      <i class="fas fa-brain"></i>
      <span>AI Suggestions</span>
    `;
    categorySuggestions.appendChild(header);

    // Add suggestions
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
          <div class="suggestion-reason">
            <i class="fas fa-info-circle"></i>
            <span>${suggestion.reason}</span>
          </div>
        </div>
        <div class="suggestion-confidence confidence-${confidenceLevel}">
          <span class="confidence-value">${(suggestion.confidence * 100).toFixed(0)}%</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${suggestion.confidence * 100}%"></div>
          </div>
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

  // Hide suggestions
  function hideSuggestions() {
    categorySuggestions.classList.remove('visible');
    setTimeout(() => {
      categorySuggestions.classList.add('hidden');
    }, 300);
  }

  // Select a suggestion
  function selectSuggestion(suggestion) {
    selectedSuggestion = suggestion;
    category.value = suggestion.category;
    
    // Show confidence badge
    categoryConfidence.innerHTML = `
      <i class="fas fa-check-circle"></i> ${(suggestion.confidence * 100).toFixed(0)}% confident
    `;
    categoryConfidence.classList.remove('hidden');
  }

  // Handle description input
  text.addEventListener('input', (e) => {
    const description = e.target.value;

    // Clear previous timeout
    if (suggestionTimeout) {
      clearTimeout(suggestionTimeout);
    }

    // Clear confidence badge when typing
    categoryConfidence.classList.add('hidden');
    selectedSuggestion = null;

    // Debounce API call
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
        } else {
          hideSuggestions();
        }
      }, 500);
    } else {
      hideSuggestions();
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.description-input-wrapper')) {
      hideSuggestions();
    }
  });

  /* =====================
     MOBILE NAV
  ====================== */
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
    });
  });

  /* =====================
     ADD TRANSACTION
  ====================== */
  function addTransaction(e) {
    e.preventDefault();

    let value = +amount.value;
    if (type.value === "expense") value = -Math.abs(value);

    const transaction = {
      id: Date.now(),
      text: text.value,
      amount: value
    };

    transactions.push(transaction);
    updateLocalStorage();
    init();

    text.value = "";
    amount.value = "";
    category.value = "";
    type.value = "";
    
    // Reset AI state
    categoryConfidence.classList.add('hidden');
    selectedSuggestion = null;
    hideSuggestions();
  }

  function updateValues() {
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((a, b) => a + b, 0);
    const income = amounts.filter(v => v > 0).reduce((a, b) => a + b, 0);
    const expense = amounts.filter(v => v < 0).reduce((a, b) => a + b, 0) * -1;

    balance.textContent = `₹${total.toFixed(2)}`;
    moneyPlus.textContent = `+₹${income.toFixed(2)}`;
    moneyMinus.textContent = `-₹${expense.toFixed(2)}`;
  }

  function init() {
    list.innerHTML = "";
    transactions.forEach(addTransactionDOM);
    updateValues();
  }

  function updateLocalStorage() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }

  /* =====================
     GLOBAL DELETE
  ====================== */
  window.removeTransaction = function(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    init();
  };

  form.addEventListener("submit", addTransaction);

  init();
});
