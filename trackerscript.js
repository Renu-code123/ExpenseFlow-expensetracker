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

  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");

  /* =====================
     STATE
  ====================== */
  let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

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
  }

  /* =====================
     RENDER
  ====================== */
  function addTransactionDOM(tx) {
    const item = document.createElement("li");
    item.className = tx.amount < 0 ? "minus" : "plus";
    item.innerHTML = `
      ${tx.text}
      <span>${tx.amount < 0 ? "-" : "+"}₹${Math.abs(tx.amount)}</span>
      <button onclick="removeTransaction(${tx.id})">x</button>
    `;
    list.appendChild(item);
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
