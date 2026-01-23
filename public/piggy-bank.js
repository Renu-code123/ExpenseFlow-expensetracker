//console.log("🐷 Piggy Bank JS LOADED");

document.addEventListener("DOMContentLoaded", () => {

  const addBtn = document.getElementById("piggy-add-btn");
  const viewBtn = document.getElementById("piggy-view-btn");
  const amountEl = document.getElementById("piggy-amount");

  const modal = document.getElementById("piggy-modal");
  const input = document.getElementById("piggy-input");
  const saveBtn = document.getElementById("piggy-save-btn");
  const cancelBtn = document.getElementById("piggy-cancel-btn");

  const details = document.getElementById("piggy-details");
  const total = document.getElementById("piggy-total");

  if (!addBtn || !viewBtn || !amountEl || !details || !total) {
    console.error("❌ Piggy elements not found");
    return;
  }

  let saved = parseInt(localStorage.getItem("piggy_saved")) || 0;
  amountEl.innerText = saved;

  /* OPEN MODAL */
  addBtn.onclick = () => {
    input.value = "";
    input.style.border = "none";
    modal.classList.add("active");
    input.focus();
  };

  /* SAVE */
  saveBtn.onclick = () => {
    const num = parseInt(input.value);

    if (!num || num <= 0) {
      input.style.border = "2px solid red";
      input.oninput = () => {
        input.style.border = "none";
      };
      return;
    }

    saved += num;
    localStorage.setItem("piggy_saved", saved);
    amountEl.innerText = saved;

    modal.classList.remove("active");
  };

  /* CANCEL */
  cancelBtn.onclick = () => {
    modal.classList.remove("active");
  };

  /* VIEW SAVINGS (TOGGLE DETAILS) */
  viewBtn.onclick = () => {
    if (details.style.display === "none" || details.style.display === "") {
      total.innerText = saved;
      details.style.display = "block";
      viewBtn.innerText = "Hide Savings";
    } else {
      details.style.display = "none";
      viewBtn.innerText = "View Savings";
    }
  };

});
