// Workspace Management Feature for ExpenseFlow
var WORKSPACE_API_URL = '/api/workspaces';

// State management
let currentWorkspaces = [];
let activeWorkspace = null;

// ========================
// API Functions
// ========================

async function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

/**
 * Fetch all workspaces for the user
 */
async function fetchWorkspaces() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return [];

        const response = await fetch(WORKSPACE_API_URL, {
            headers: await getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch workspaces');
        const data = await response.json();
        currentWorkspaces = data.data;
        renderWorkspaceSelection();
        return currentWorkspaces;
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        showWorkspaceNotification('Failed to load workspaces', 'error');
    }
}

/**
 * Create a new workspace
 */
async function createWorkspace(name, description) {
    try {
        const response = await fetch(WORKSPACE_API_URL, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ name, description })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showWorkspaceNotification('Workspace created successfully!', 'success');
        await fetchWorkspaces();
        return data.data;
    } catch (error) {
        showWorkspaceNotification(error.message, 'error');
    }
}

/**
 * Invite user to workspace
 */
async function inviteToWorkspace(workspaceId, email, role) {
    try {
        const response = await fetch(`${WORKSPACE_API_URL}/${workspaceId}/invite`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ email, role })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showWorkspaceNotification('Invitation sent successfully!', 'success');
    } catch (error) {
        showWorkspaceNotification(error.message, 'error');
    }
}

/**
 * Join workspace using token
 */
async function joinWorkspace(token) {
    try {
        const response = await fetch(`${WORKSPACE_API_URL}/join`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ token })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showWorkspaceNotification(data.message, 'success');
        await fetchWorkspaces();
        // Redirect to main page or refresh
        window.location.href = 'index.html';
    } catch (error) {
        showWorkspaceNotification(error.message, 'error');
    }
}

// ========================
// UI Rendering Functions
// ========================

/**
 * Multi-user Workspace Selection UI
 */
function renderWorkspaceSelection() {
    const container = document.getElementById('workspace-selector');
    if (!container) return;

    container.innerHTML = `
    <div class="workspace-current" onclick="toggleWorkspaceDropdown()">
      <div class="workspace-avatar">
        ${activeWorkspace ? activeWorkspace.name.charAt(0).toUpperCase() : '<i class="fas fa-user"></i>'}
      </div>
      <div class="workspace-info">
        <span class="workspace-label">Current Workspace</span>
        <span class="workspace-name">${activeWorkspace ? activeWorkspace.name : 'Personal Account'}</span>
      </div>
      <i class="fas fa-chevron-down dropdown-arrow"></i>
    </div>
    <div class="workspace-dropdown" id="workspace-dropdown">
      <div class="workspace-item ${!activeWorkspace ? 'active' : ''}" onclick="selectWorkspace(null)">
        <i class="fas fa-user"></i>
        <span>Personal Account</span>
      </div>
      <div class="workspace-divider">Shared Workspaces</div>
      ${currentWorkspaces.map(ws => `
        <div class="workspace-item ${activeWorkspace && activeWorkspace._id === ws._id ? 'active' : ''}" onclick="selectWorkspace('${ws._id}')">
          <div class="workspace-avatar-sm">${ws.name.charAt(0).toUpperCase()}</div>
          <span>${ws.name}</span>
          ${ws.owner._id === localStorage.getItem('userId') ? '<span class="owner-badge">Owner</span>' : ''}
        </div>
      `).join('')}
      <div class="workspace-footer">
        <button class="add-workspace-btn" onclick="openCreateWorkspaceModal()">
          <i class="fas fa-plus"></i> Create Workspace
        </button>
      </div>
    </div>
  `;
}

/**
 * Select active workspace and update dashboard
 */
function selectWorkspace(id) {
    if (!id) {
        activeWorkspace = null;
    } else {
        activeWorkspace = currentWorkspaces.find(ws => ws._id === id);
    }

    // Close dropdown
    document.getElementById('workspace-dropdown')?.classList.remove('active');

    // Update UI and trigger data re-fetch
    renderWorkspaceSelection();
    updateWorkspaceDashboard();

    // Save preference
    localStorage.setItem('activeWorkspaceId', id || 'personal');
}

function toggleWorkspaceDropdown() {
    document.getElementById('workspace-dropdown')?.classList.toggle('active');
}

/**
 * Open create workspace modal
 */
function openCreateWorkspaceModal() {
    const modal = document.getElementById('workspace-modal');
    if (modal) modal.classList.add('active');
}

function closeWorkspaceModal() {
    document.getElementById('workspace-modal')?.classList.remove('active');
}

/**
 * Show workspace notification
 */
function showWorkspaceNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
        return;
    }
    const statusColors = {
        success: '#4caf50',
        error: '#f44336',
        info: '#2196f3'
    };
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: statusColors[type] || statusColors.info
    }).showToast();
}

/**
 * Update dashboard context based on workspace
 */
function updateWorkspaceDashboard() {
    // This would ideally trigger a refresh of all stats and lists with a workspaceId query param
    if (typeof updateAllData === 'function') {
        updateAllData(activeWorkspace ? activeWorkspace._id : null);
    }
}

// ========================
// Initialization
// ========================

function initWorkspaceFeature() {
    const workspaceIdPref = localStorage.getItem('activeWorkspaceId');

    fetchWorkspaces().then(() => {
        if (workspaceIdPref && workspaceIdPref !== 'personal') {
            selectWorkspace(workspaceIdPref);
        }
    });

    // Handle create workspace form
    const createForm = document.getElementById('create-workspace-form');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('workspace-name-input').value;
            const desc = document.getElementById('workspace-desc-input').value;
            await createWorkspace(name, desc);
            closeWorkspaceModal();
            createForm.reset();
        });
    }

    // Handle invitation join from URL
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('token');
    if (inviteToken && window.location.pathname.includes('join-workspace.html')) {
        joinWorkspace(inviteToken);
    }

    // Global click to close dropdown
    document.addEventListener('click', (e) => {
        const selector = document.getElementById('workspace-selector');
        if (selector && !selector.contains(e.target)) {
            document.getElementById('workspace-dropdown')?.classList.remove('active');
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWorkspaceFeature);
} else {
    initWorkspaceFeature();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchWorkspaces,
        createWorkspace,
        selectWorkspace,
        inviteToWorkspace
    };
}
