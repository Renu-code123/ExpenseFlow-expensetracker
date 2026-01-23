import "./chatbot.css";

fetch("./chatbot/chatbot.html")
  .then((res) => res.text())
  .then((html) => {
    document.body.insertAdjacentHTML("beforeend", html);

    const toggleBtn = document.getElementById("chatbot-toggle");
    const closeBtn = document.getElementById("chatbot-close");
    const windowEl = document.getElementById("chatbot-window");

    toggleBtn.addEventListener("click", () => {
      windowEl.classList.toggle("hidden");
    });

    closeBtn.addEventListener("click", () => {
      windowEl.classList.add("hidden");
    });
  });
