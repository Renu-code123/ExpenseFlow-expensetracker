// Authentication API Functions
var API_BASE_URL = '/api';
var authToken = localStorage.getItem('authToken');
var currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Auth API calls
async function register(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    authToken = data.token;
    currentUser = data.user;

    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    return data;
  } catch (error) {
    throw error;
  }
}

async function login(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    authToken = data.token;
    currentUser = data.user;

    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    return data;
  } catch (error) {
    throw error;
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('transactions');
  showAuthForm();
}

// Updated API functions with authentication
async function fetchExpenses() {
  if (!authToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('Failed to fetch expenses');
    return await response.json();
  } catch (error) {
    if (error.message.includes('401')) {
      logout();
      throw new Error('Session expired');
    }
    throw error;
  }
}

async function saveExpense(expense) {
  if (!authToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(expense)
    });
    if (!response.ok) throw new Error('Failed to save expense');
    return await response.json();
  } catch (error) {
    if (error.message.includes('401')) {
      logout();
      throw new Error('Session expired');
    }
    throw error;
  }
}

async function deleteExpense(id) {
  if (!authToken) throw new Error('Not authenticated');

  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('Failed to delete expense');
    return await response.json();
  } catch (error) {
    if (error.message.includes('401')) {
      logout();
      throw new Error('Session expired');
    }
    throw error;
  }
}

// UI Functions
function showAuthForm() {
  document.body.innerHTML = `
    <div class="auth-container">
      <div class="auth-form">
        <h2 id="auth-title">Login to ExpenseFlow</h2>
        <form id="auth-form">
          <div id="name-field" style="display: none;">
            <input type="text" id="name" placeholder="Full Name">
          </div>
          <input type="email" id="email" placeholder="Email" required>
          <input type="password" id="password" placeholder="Password" required>
          <div id="password-requirements" style="display: none; font-size: 12px; color: #666; margin-bottom: 1rem;">
            Password must be 12-128 characters and contain:<br>
            • At least one uppercase letter (A-Z)<br>
            • At least one lowercase letter (a-z)<br>
            • At least one number (0-9)<br>
            • At least one special character (@$!%*?&)
          </div>
          <button type="submit" id="auth-submit">Login</button>
        </form>
        <p>
          <span id="auth-switch-text">Don't have an account?</span>
          <a href="#" id="auth-switch">Register</a>
        </p>
      </div>
    </div>
    <style>
      .auth-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .auth-form {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        width: 100%;
        max-width: 400px;
      }
      .auth-form h2 {
        text-align: center;
        margin-bottom: 1.5rem;
        color: #333;
      }
      .auth-form input {
        width: 100%;
        padding: 12px;
        margin-bottom: 1rem;
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 16px;
      }
      .auth-form button {
        width: 100%;
        padding: 12px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
      }
      .auth-form button:hover {
        background: #5a6fd8;
      }
      .auth-form p {
        text-align: center;
        margin-top: 1rem;
      }
      .auth-form a {
        color: #667eea;
        text-decoration: none;
      }
    </style>
  `;

  let isLogin = true;

  document.getElementById('auth-switch').addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;

    const title = document.getElementById('auth-title');
    const nameField = document.getElementById('name-field');
    const passwordRequirements = document.getElementById('password-requirements');
    const submitBtn = document.getElementById('auth-submit');
    const switchText = document.getElementById('auth-switch-text');
    const switchLink = document.getElementById('auth-switch');

    if (isLogin) {
      title.textContent = 'Login to ExpenseFlow';
      nameField.style.display = 'none';
      document.getElementById('name').required = false;
      passwordRequirements.style.display = 'none';
      submitBtn.textContent = 'Login';
      switchText.textContent = 'Don\'t have an account?';
      switchLink.textContent = 'Register';
    } else {
      title.textContent = 'Register for ExpenseFlow';
      nameField.style.display = 'block';
      document.getElementById('name').required = true;
      passwordRequirements.style.display = 'block';
      submitBtn.textContent = 'Register';
      switchText.textContent = 'Already have an account?';
      switchLink.textContent = 'Login';
    }
  });

  // Password validation function
  function validatePassword(password) {
    if (password.length < 12) {
      return 'Password must be at least 12 characters long';
    }
    if (password.length > 128) {
      return 'Password must not exceed 128 characters';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    return null; // Valid password
  }

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    // Client-side password validation for registration
    if (!isLogin) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        showNotification(passwordError, 'error');
        return;
      }
    }

    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }

      showMainApp();
      showNotification(`Welcome ${currentUser.name}!`, 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
}

function showMainApp() {
  // Restore original HTML structure
  location.reload();
}

// Notification system
if (!window.showNotification) {
  window.showNotification = function (message, type = 'info') {
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
  };
}

// Initialize authentication
function initAuth() {
  if (!authToken || !currentUser) {
    showAuthForm();
    return false;
  }

  // Add logout button to existing UI
  const header = document.querySelector('header') || document.querySelector('.header');
  if (header) {
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = `Logout (${currentUser.name})`;
    logoutBtn.onclick = logout;
    logoutBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;';
    header.appendChild(logoutBtn);
  }

  return true;
}

// Check authentication on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}