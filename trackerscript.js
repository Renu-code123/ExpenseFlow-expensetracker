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
  list.innerHTML = '';
  list.style.animation = 'none';  // ✅ ADD THIS LINE 
  
  const filteredTransactions = getFilteredTransactions();
  
if (filteredTransactions.length === 0) {
  const emptyMessage = document.createElement('li');
  emptyMessage.className = 'empty-state';

  // 👇 FIRST TIME USER
  if (transactions.length === 0) {
    emptyMessage.innerHTML = `
      <div class="empty-state-content" role="status" aria-live="polite">
      <i class="fas fa-wallet empty-icon" aria-hidden="true"></i>

        <h3>No expenses yet</h3>
        <p>Add your first transaction to start tracking your money.</p>
        <button class="empty-cta" onclick="document.getElementById('text')?.focus()">
>
          + Add Transaction
        </button>
      </div>
    `;
  } 
  // 👇 FILTER RESULT EMPTY
  else {
    emptyMessage.innerHTML = `
      <div class="empty-state-content">
        <i class="fas fa-filter empty-icon"></i>
        <h3>No matching transactions</h3>
        <p>Try clearing or adjusting your filters.</p>
      </div>
    `;
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
