// Helper to get auth token
function getAuthToken() {
  return localStorage.getItem('token');
}
// Workspace and Settings Management
let currentWorkspace = null;
let currentUser = null;

// Initialize workspace features
document.addEventListener('DOMContentLoaded', function() {
  initializeWorkspaceFeatures();
  loadCurrentUser();
  loadWorkspaceData();
});

function initializeWorkspaceFeatures() {
  // Settings tab switching
  window.switchSettingsTab = switchSettingsTab;

  // Workspace functions
  window.switchWorkspace = switchWorkspace;
  window.openCreateWorkspaceModal = openCreateWorkspaceModal;
  window.openInviteModal = openInviteModal;

  // Approval functions
  window.saveApprovalSettings = saveApprovalSettings;

  // Profile functions
  window.updateProfile = updateProfile;
}

async function loadCurrentUser() {
  try {
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      currentUser = data.user;
      updateUserDisplay();
    }
  } catch (error) {
    console.error('Error loading user:', error);
  }
}

function updateUserDisplay() {
  if (!currentUser) return;

  const usernameEl = document.getElementById('navUsername');
  if (usernameEl) {
    usernameEl.textContent = currentUser.name || currentUser.email;
  }

  // Update profile settings
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');

  if (profileName) profileName.value = currentUser.name || '';
  if (profileEmail) profileEmail.value = currentUser.email || '';
}

async function loadWorkspaceData() {
  try {
    const token = getAuthToken();
    if (!token) return;

    // Load current workspace
    const workspaceResponse = await fetch('/api/workspaces/current', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const workspaceData = await workspaceResponse.json();
    if (workspaceData.success) {
      currentWorkspace = workspaceData.workspace;
      updateWorkspaceDisplay();
      loadMembers();
    }

    // Load approval settings
    loadApprovalSettings();

    // Load pending approvals
    loadPendingApprovals();

    // Load approval history
    loadApprovalHistory();

  } catch (error) {
    console.error('Error loading workspace data:', error);
  }
}

function updateWorkspaceDisplay() {
  if (!currentWorkspace) return;

  const workspaceNameEl = document.getElementById('current-workspace-name');
  if (workspaceNameEl) {
    workspaceNameEl.textContent = currentWorkspace.name;
  }
}

async function loadMembers() {
  try {
    const token = getAuthToken();
    if (!token || !currentWorkspace) return;

    const response = await fetch(`/api/workspaces/${currentWorkspace._id}/members`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      renderMembersList(data.members);
    }
  } catch (error) {
    console.error('Error loading members:', error);
  }
}

function renderMembersList(members) {
  const membersList = document.getElementById('members-list');
  if (!membersList) return;

  membersList.innerHTML = '';

  members.forEach(member => {
    const memberItem = document.createElement('div');
    memberItem.className = 'member-item';

    memberItem.innerHTML = `
      <div class="member-info">
        <div class="member-avatar">
          ${member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
        </div>
        <div class="member-details">
          <h5>${member.name || member.email}</h5>
          <span class="member-role">${member.role}</span>
        </div>
      </div>
      <div class="member-actions">
        ${canManageMember(member) ? `
          <select class="btn-role" onchange="changeMemberRole('${member._id}', this.value)">
            <option value="viewer" ${member.role === 'viewer' ? 'selected' : ''}>Viewer</option>
            <option value="member" ${member.role === 'member' ? 'selected' : ''}>Member</option>
            <option value="manager" ${member.role === 'manager' ? 'selected' : ''}>Manager</option>
            <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          ${member._id !== currentUser._id ? `
            <button class="btn-remove" onclick="removeMember('${member._id}')">
              <i class="fas fa-user-minus"></i>
            </button>
          ` : ''}
        ` : ''}
      </div>
    `;

    membersList.appendChild(memberItem);
  });
}

function canManageMember(member) {
  if (!currentUser || !currentWorkspace) return false;

  // Owner can manage everyone
  if (currentWorkspace.owner.toString() === currentUser._id.toString()) {
    return true;
  }

  // Admins can manage members and viewers
  if (currentUser.role === 'admin' && ['member', 'viewer'].includes(member.role)) {
    return true;
  }

  return false;
}

async function changeMemberRole(memberId, newRole) {
  try {
    const token = getAuthToken();
    if (!token || !currentWorkspace) return;

    const response = await fetch(`/api/workspaces/${currentWorkspace._id}/members/${memberId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: newRole })
    });

    const data = await response.json();
    if (data.success) {
      loadMembers(); // Reload members list
      showNotification('Member role updated successfully', 'success');
    } else {
      showNotification(data.message || 'Failed to update member role', 'error');
    }
  } catch (error) {
    console.error('Error updating member role:', error);
    showNotification('Error updating member role', 'error');
  }
}

async function removeMember(memberId) {
  if (!confirm('Are you sure you want to remove this member from the workspace?')) {
    return;
  }

  try {
    const token = getAuthToken();
    if (!token || !currentWorkspace) return;

    const response = await fetch(`/api/workspaces/${currentWorkspace._id}/members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      loadMembers(); // Reload members list
      showNotification('Member removed successfully', 'success');
    } else {
      showNotification(data.message || 'Failed to remove member', 'error');
    }
  } catch (error) {
    console.error('Error removing member:', error);
    showNotification('Error removing member', 'error');
  }
}

function switchSettingsTab(tabName) {
  // Hide all settings content
  const contents = document.querySelectorAll('.settings-content');
  contents.forEach(content => content.classList.remove('active'));

  // Remove active class from all tabs
  const tabs = document.querySelectorAll('.settings-tab');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Show selected content and activate tab
  const selectedContent = document.getElementById(`${tabName}-settings`);
  const selectedTab = Array.from(tabs).find(tab => tab.textContent.toLowerCase() === tabName);

  if (selectedContent) selectedContent.classList.add('active');
  if (selectedTab) selectedTab.classList.add('active');
}

function switchWorkspace() {
  const select = document.getElementById('workspace-select');
  if (!select) return;

  const workspaceId = select.value;
  // TODO: Implement workspace switching
  showNotification('Workspace switching not yet implemented', 'info');
}

function openCreateWorkspaceModal() {
  // TODO: Implement create workspace modal
  showNotification('Create workspace feature not yet implemented', 'info');
}

function openInviteModal() {
  // TODO: Implement invite modal
  showNotification('Invite member feature not yet implemented', 'info');
}

// Approval Settings Functions
async function loadApprovalSettings() {
  try {
    const token = getAuthToken();
    if (!token || !currentWorkspace) return;

    const response = await fetch(`/api/workspaces/${currentWorkspace._id}/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      const approvalRequired = document.getElementById('approval-required');
      if (approvalRequired && data.settings.approvalThreshold) {
        approvalRequired.value = data.settings.approvalThreshold;
      }
    }
  } catch (error) {
    console.error('Error loading approval settings:', error);
  }
}

async function saveApprovalSettings() {
  try {
    const token = localStorage.getItem('token');
    if (!token || !currentWorkspace) return;

    const approvalRequired = document.getElementById('approval-required');
    if (!approvalRequired) return;

    const threshold = parseFloat(approvalRequired.value) || 0;

    const response = await fetch(`/api/workspaces/${currentWorkspace._id}/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        approvalThreshold: threshold
      })
    });

    const data = await response.json();
    if (data.success) {
      showNotification('Approval settings saved successfully', 'success');
    } else {
      showNotification(data.message || 'Failed to save approval settings', 'error');
    }
  } catch (error) {
    console.error('Error saving approval settings:', error);
    showNotification('Error saving approval settings', 'error');
  }
}

async function loadPendingApprovals() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch('/api/approvals/pending', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      renderApprovalsList('pending-approvals', data.approvals, true);
    }
  } catch (error) {
    console.error('Error loading pending approvals:', error);
  }
}

async function loadApprovalHistory() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch('/api/approvals/history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      renderApprovalsList('approval-history', data.approvals, false);
    }
  } catch (error) {
    console.error('Error loading approval history:', error);
  }
}

function renderApprovalsList(containerId, approvals, showActions = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  if (approvals.length === 0) {
    container.innerHTML = '<p class="no-approvals">No approvals found</p>';
    return;
  }

  approvals.forEach(approval => {
    const approvalItem = document.createElement('div');
    approvalItem.className = 'approval-item';

    const statusClass = `status-${approval.status.toLowerCase()}`;

    approvalItem.innerHTML = `
      <div class="approval-info">
        <h5>${approval.expense.description}</h5>
        <div class="approval-details">
          Amount: ₹${approval.expense.amount} |
          Submitted by: ${approval.submittedBy.name || approval.submittedBy.email} |
          Date: ${new Date(approval.createdAt).toLocaleDateString()}
        </div>
      </div>
      <div class="approval-status ${statusClass}">${approval.status}</div>
      ${showActions ? `
        <div class="approval-actions">
          <button class="btn-approve" onclick="approveExpense('${approval._id}')">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="btn-reject" onclick="rejectExpense('${approval._id}')">
            <i class="fas fa-times"></i> Reject
          </button>
        </div>
      ` : ''}
    `;

    container.appendChild(approvalItem);
  });
}

async function approveExpense(approvalId) {
  await processApproval(approvalId, 'approved');
}

async function rejectExpense(approvalId) {
  await processApproval(approvalId, 'rejected');
}

async function processApproval(approvalId, status) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`/api/approvals/${approvalId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    const data = await response.json();
    if (data.success) {
      showNotification(`Expense ${status} successfully`, 'success');
      loadPendingApprovals();
      loadApprovalHistory();
      // Refresh expense list to show updated status
      if (typeof loadExpenses === 'function') {
        loadExpenses();
      }
    } else {
      showNotification(data.message || `Failed to ${status} expense`, 'error');
    }
  } catch (error) {
    console.error(`Error ${status} expense:`, error);
    showNotification(`Error ${status} expense`, 'error');
  }
}

// Profile Functions
async function updateProfile() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const nameInput = document.getElementById('profile-name');
    if (!nameInput) return;

    const newName = nameInput.value.trim();
    if (!newName) {
      showNotification('Name cannot be empty', 'error');
      return;
    }

    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newName })
    });

    const data = await response.json();
    if (data.success) {
      currentUser.name = newName;
      updateUserDisplay();
      showNotification('Profile updated successfully', 'success');
    } else {
      showNotification(data.message || 'Failed to update profile', 'error');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    showNotification('Error updating profile', 'error');
  }
}

// Utility function for notifications
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;

  // Add to page
  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => notification.classList.add('show'), 100);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}