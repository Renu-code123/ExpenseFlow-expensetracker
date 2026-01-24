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

    // Show/hide workspace settings based on whether user is in a workspace
    const workspaceSettings = document.getElementById('workspace-settings');
    if (workspaceSettings) {
        workspaceSettings.style.display = activeWorkspace ? 'block' : 'none';
    }

    // Load workspace members if in a workspace
    if (activeWorkspace) {
        loadWorkspaceMembers();
        updateWorkspaceInfo();
    }
}

/**
 * Load workspace members and display them
 */
async function loadWorkspaceMembers() {
    if (!activeWorkspace) return;

    try {
        const response = await fetch(`${WORKSPACE_API_URL}/${activeWorkspace._id}`, {
            headers: await getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load workspace details');

        const data = await response.json();
        const workspace = data.data;
        activeWorkspace = workspace; // Update with latest data

        renderMembersList(workspace.members);
        updateInviteButtonVisibility(workspace);
    } catch (error) {
        console.error('Error loading workspace members:', error);
        showWorkspaceNotification('Failed to load workspace members', 'error');
    }
}

/**
 * Render the members list in the settings
 */
function renderMembersList(members) {
    const membersList = document.getElementById('members-list');
    if (!membersList) return;

    const currentUserId = localStorage.getItem('userId');
    const currentUserRole = members.find(m => m.user._id === currentUserId)?.role || 'viewer';
    const canManageMembers = ['owner', 'admin'].includes(currentUserRole);

    membersList.innerHTML = members.map(member => {
        const isCurrentUser = member.user._id === currentUserId;
        const canEditRole = canManageMembers && !isCurrentUser && member.role !== 'owner';
        const canRemove = canManageMembers && !isCurrentUser && member.role !== 'owner';

        return `
            <div class="member-item">
                <div class="member-info">
                    <div class="member-avatar">
                        ${member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div class="member-details">
                        <h6>${member.user.name || 'Unknown User'}</h6>
                        <small>${member.user.email}</small>
                    </div>
                    <span class="member-role ${member.role}">${member.role}</span>
                </div>
                <div class="member-actions">
                    ${canEditRole ? `
                        <select class="btn-role-change" onchange="changeMemberRole('${member.user._id}', this.value)">
                            <option value="">Change Role</option>
                            <option value="viewer" ${member.role === 'viewer' ? 'selected' : ''}>Viewer</option>
                            <option value="member" ${member.role === 'member' ? 'selected' : ''}>Member</option>
                            <option value="manager" ${member.role === 'manager' ? 'selected' : ''}>Manager</option>
                            <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    ` : ''}
                    ${canRemove ? `
                        <button class="btn-remove-member" onclick="removeMember('${member.user._id}')" title="Remove member">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Update workspace info display
 */
function updateWorkspaceInfo() {
    if (!activeWorkspace) return;

    const nameEl = document.getElementById('current-workspace-name');
    const descEl = document.getElementById('current-workspace-desc');
    const memberCountEl = document.getElementById('member-count');
    const userRoleEl = document.getElementById('your-role');

    if (nameEl) nameEl.textContent = activeWorkspace.name;
    if (descEl) descEl.textContent = activeWorkspace.description || 'No description provided';

    const currentUserId = localStorage.getItem('userId');
    const currentMember = activeWorkspace.members.find(m => m.user._id === currentUserId);
    const userRole = currentMember ? currentMember.role : 'viewer';

    if (memberCountEl) memberCountEl.textContent = `${activeWorkspace.members.length} member${activeWorkspace.members.length !== 1 ? 's' : ''}`;
    if (userRoleEl) userRoleEl.textContent = `Your role: ${userRole}`;
}

/**
 * Update invite button visibility based on user permissions
 */
function updateInviteButtonVisibility(workspace) {
    const inviteBtn = document.getElementById('invite-btn');
    if (!inviteBtn) return;

    const currentUserId = localStorage.getItem('userId');
    const currentMember = workspace.members.find(m => m.user._id === currentUserId);
    const canInvite = currentMember && ['owner', 'admin'].includes(currentMember.role);

    inviteBtn.style.display = canInvite ? 'block' : 'none';
}

/**
 * Change a member's role
 */
async function changeMemberRole(userId, newRole) {
    if (!activeWorkspace || !newRole) return;

    try {
        const response = await fetch(`${WORKSPACE_API_URL}/${activeWorkspace._id}/members/${userId}`, {
            method: 'PUT',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ role: newRole })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showWorkspaceNotification('Member role updated successfully!', 'success');
        await loadWorkspaceMembers();
    } catch (error) {
        showWorkspaceNotification(error.message, 'error');
    }
}

/**
 * Remove a member from the workspace
 */
async function removeMember(userId) {
    if (!activeWorkspace) return;

    if (!confirm('Are you sure you want to remove this member from the workspace?')) {
        return;
    }

    try {
        const response = await fetch(`${WORKSPACE_API_URL}/${activeWorkspace._id}/members/${userId}`, {
            method: 'DELETE',
            headers: await getAuthHeaders()
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showWorkspaceNotification('Member removed successfully!', 'success');
        await loadWorkspaceMembers();
    } catch (error) {
        showWorkspaceNotification(error.message, 'error');
    }
}

/**
 * Open invite modal
 */
function openInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (modal) modal.classList.add('active');
}

/**
 * Close invite modal
 */
function closeInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (modal) modal.classList.remove('active');
}

/**
 * Show settings section
 */
function showSettingsSection() {
    // Hide all sections
    const sections = document.querySelectorAll('main section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show settings section
    const settingsSection = document.getElementById('settings');
    if (settingsSection) {
        settingsSection.style.display = 'block';
        settingsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Update navigation active state
    updateNavActiveState('settings');
}

/**
 * Show a specific section
 */
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('main section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Update navigation active state
    updateNavActiveState(sectionId);
}

/**
 * Update navigation active state
 */
function updateNavActiveState(activeSection) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${activeSection}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
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

    // Handle invite form
    const inviteForm = document.getElementById('invite-form');
    if (inviteForm) {
        inviteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('invite-email').value;
            const role = document.getElementById('invite-role').value;

            if (!activeWorkspace) {
                showWorkspaceNotification('No active workspace selected', 'error');
                return;
            }

            await inviteToWorkspace(activeWorkspace._id, email, role);
            closeInviteModal();
            inviteForm.reset();
            updateRolePermissions(''); // Reset permissions display
        });
    }

    // Handle role selection change in invite modal
    const roleSelect = document.getElementById('invite-role');
    if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
            updateRolePermissions(e.target.value);
        });
    }

    // Handle invitation join from URL
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('token');
    if (inviteToken && window.location.pathname.includes('join-workspace.html')) {
        joinWorkspace(inviteToken);
    }

    // Handle navigation to settings
    const settingsLinks = document.querySelectorAll('a[href="#settings"]');
    settingsLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSettingsSection();
        });
    });

    // Handle other navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                showSection(href.substring(1));
            }
        });
    });
}

/**
 * Update role permissions display in invite modal
 */
function updateRolePermissions(role) {
    const display = document.getElementById('role-permissions-display');
    if (!display) return;

    const permissions = {
        viewer: ['View expenses and reports'],
        member: ['View expenses and reports', 'Add and edit expenses'],
        manager: ['All member permissions', 'Manage budgets', 'Approve expenses'],
        admin: ['All manager permissions', 'Manage workspace members', 'Change member roles']
    };

    const rolePermissions = permissions[role] || [];
    display.innerHTML = rolePermissions.length > 0
        ? rolePermissions.map(p => `<div>• ${p}</div>`).join('')
        : '<p>Select a role to see permissions</p>';
}

/**
 * Show settings section
 */
function showSettingsSection() {
    // Hide all sections
    const sections = document.querySelectorAll('main section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show settings section
    const settingsSection = document.getElementById('settings');
    if (settingsSection) {
        settingsSection.style.display = 'block';
        settingsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Update navigation active state
    updateNavActiveState('settings');
}

/**
 * Show a specific section
 */
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('main section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Update navigation active state
    updateNavActiveState(sectionId);
}

/**
 * Update navigation active state
 */
function updateNavActiveState(activeSection) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${activeSection}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
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
