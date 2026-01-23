// Real-time synchronization with Socket.IO
var API_BASE_URL = '/api';
let socket = null;
var authToken = localStorage.getItem('authToken');
var currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
let deviceId = localStorage.getItem('deviceId') || generateDeviceId();

// Generate unique device ID
function generateDeviceId() {
  const id = 'device_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('deviceId', id);
  return id;
}

// Initialize Socket.IO connection
function initSocket() {
  if (!authToken) return;

  socket = io({
    auth: { token: authToken }
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    showNotification('Connected - Real-time sync enabled', 'success');
    syncOfflineData();
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showNotification('Disconnected - Working offline', 'warning');
  });

  // Real-time expense events
  socket.on('expense_created', (expense) => {
    if (!isFromCurrentDevice(expense)) {
      addExpenseToUI(expense);
      showNotification('New expense synced from another device', 'info');
    }
  });

  socket.on('expense_updated', (expense) => {
    if (!isFromCurrentDevice(expense)) {
      updateExpenseInUI(expense);
      showNotification('Expense updated from another device', 'info');
    }
  });

  socket.on('expense_deleted', (data) => {
    if (!isFromCurrentDevice(data)) {
      removeExpenseFromUI(data.id);
      showNotification('Expense deleted from another device', 'info');
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    showNotification('Connection error - Working offline', 'error');
  });
}

// Check if action is from current device
function isFromCurrentDevice(data) {
  return data.deviceId === deviceId;
}

// Add expense to UI without API call
function addExpenseToUI(expense) {
  const transaction = {
    id: expense._id,
    text: expense.description,
    amount: expense.type === 'expense' ? -expense.amount : expense.amount,
    category: expense.category,
    type: expense.type,
    date: expense.date
  };

  transactions.push(transaction);
  displayTransactions();
  updateValues();
  updateLocalStorage();
}

// Update expense in UI
function updateExpenseInUI(expense) {
  const index = transactions.findIndex(t => t.id === expense._id);
  if (index !== -1) {
    transactions[index] = {
      id: expense._id,
      text: expense.description,
      amount: expense.type === 'expense' ? -expense.amount : expense.amount,
      category: expense.category,
      type: expense.type,
      date: expense.date
    };
    displayTransactions();
    updateValues();
    updateLocalStorage();
  }
}

// Remove expense from UI
function removeExpenseFromUI(expenseId) {
  transactions = transactions.filter(t => t.id !== expenseId);
  displayTransactions();
  updateValues();
  updateLocalStorage();
}

// Queue offline operations
function queueOfflineOperation(action, resourceType, resourceId, data = null) {
  const operation = {
    action,
    resourceType,
    resourceId,
    data,
    deviceId,
    timestamp: Date.now()
  };

  offlineQueue.push(operation);
  localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
}

// Sync offline data when online
async function syncOfflineData() {
  if (offlineQueue.length === 0) return;

  try {
    const response = await fetch(`${API_BASE_URL}/sync/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ operations: offlineQueue })
    });

    if (response.ok) {
      const result = await response.json();

      // Process sync results
      result.results.forEach((syncResult, index) => {
        if (syncResult.success) {
          // Update local IDs with server IDs for CREATE operations
          if (offlineQueue[index].action === 'CREATE' && syncResult.data) {
            const localTransaction = transactions.find(t => t.id === offlineQueue[index].resourceId);
            if (localTransaction) {
              localTransaction.id = syncResult.data._id;
            }
          }
        }
      });

      // Clear synced operations
      offlineQueue = [];
      localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
      updateLocalStorage();

      showNotification(`Synced ${result.results.length} operations`, 'success');
    }
  } catch (error) {
    console.error('Sync error:', error);
    showNotification('Sync failed - Will retry later', 'error');
  }
}

// Modified API functions with offline support
async function saveExpense(expense) {
  const tempId = 'temp_' + Date.now();

  try {
    if (navigator.onLine && socket?.connected) {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ ...expense, deviceId })
      });

      if (!response.ok) throw new Error('Failed to save expense');
      return await response.json();
    } else {
      throw new Error('Offline');
    }
  } catch (error) {
    // Queue for offline sync
    queueOfflineOperation('CREATE', 'expense', tempId, expense);

    // Return temporary expense for UI
    return {
      _id: tempId,
      ...expense,
      date: new Date().toISOString(),
      user: currentUser.id
    };
  }
}

async function deleteExpense(id) {
  try {
    if (navigator.onLine && socket?.connected) {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deviceId })
      });

      if (!response.ok) throw new Error('Failed to delete expense');
      return await response.json();
    } else {
      throw new Error('Offline');
    }
  } catch (error) {
    // Queue for offline sync if not a temp ID
    if (!id.startsWith('temp_')) {
      queueOfflineOperation('DELETE', 'expense', id);
    }
    throw error;
  }
}

// Connection status monitoring
window.addEventListener('online', () => {
  showNotification('Back online - Syncing data...', 'success');
  if (socket) {
    socket.connect();
  } else {
    initSocket();
  }
});

window.addEventListener('offline', () => {
  showNotification('Gone offline - Changes will be queued', 'warning');
});

// Initialize real-time sync
function initRealTimeSync() {
  if (authToken && currentUser) {
    initSocket();

    // Periodic sync check
    setInterval(() => {
      if (navigator.onLine && offlineQueue.length > 0) {
        syncOfflineData();
      }
    }, 30000); // Check every 30 seconds
  }
}

// Enhanced notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' :
      type === 'error' ? 'fa-exclamation-circle' :
        type === 'warning' ? 'fa-exclamation-triangle' :
          'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;

  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '1rem',
    borderRadius: '8px',
    color: 'white',
    background: type === 'success' ? '#4CAF50' :
      type === 'error' ? '#f44336' :
        type === 'warning' ? '#ff9800' : '#2196F3',
    zIndex: '10000',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: '300px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideIn 0.3s ease-out'
  });

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  .notification-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  if (authToken && currentUser) {
    initRealTimeSync();
  }
});

// Export functions for use in other scripts
window.ExpenseSync = {
  initRealTimeSync,
  syncOfflineData,
  saveExpense,
  deleteExpense,
  showNotification
};