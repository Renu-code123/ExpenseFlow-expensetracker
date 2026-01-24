(function () {
  // ❌ DO NOT RUN ON LOGIN / SIGNUP
  if (
    location.pathname.includes('login') ||
    location.pathname.includes('signup')
  ) {
    return;
  }

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const user = JSON.parse(userStr);
    const usernameEl = document.getElementById('navUsername');

    if (usernameEl && user.name) {
      usernameEl.textContent = user.name;
    }
  } catch (err) {
    localStorage.clear();
    window.location.href = '/login.html';
  }
})();



