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
    
    // Reset AI state
    categoryConfidence.classList.add('hidden');
    selectedSuggestion = null;
    hideSuggestions();
  }

  list.appendChild(emptyMessage);
  return;
}

  
  filteredTransactions
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

lucide.createIcons();
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    scrollToTopBtn.classList.add("show");
  } else {
    scrollToTopBtn.classList.remove("show");
  }
});

scrollToTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});
