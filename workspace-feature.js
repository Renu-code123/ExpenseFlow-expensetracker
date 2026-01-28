// Workspace Management Feature for ExpenseFlow
var WORKSPACE_API_URL = '/api/workspaces';

// State management with persistence
let currentWorkspaces = [];
let activeWorkspace = null;
let isInitialized = false;

// Enhanced API Functions with better error handling
async function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('No authentication token found. Please log in again.');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Enhanced workspace fetching with caching
 */
async function fetchWorkspaces(forceRefresh = false) {
    try {
        // Check cache first
        const cacheKey = 'workspaces_cache';
        const cacheTimeKey = 'workspaces_cache_time';
        
        if (!forceRefresh) {
            const cached = localStorage.getItem(cacheKey);
            const cacheTime = localStorage.getItem(cacheTimeKey);
            
            if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 5 * 60 * 1000) {
                currentWorkspaces = JSON.parse(cached);
                renderWorkspaceSelection();
                return currentWorkspaces;
            }
        }

        const response = await fetch(WORKSPACE_API_URL, {
            headers: await getAuthHeaders()
        });
        
        if (response.status === 401) {
            // Token expired, redirect to login
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
            return [];
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch workspaces: ${response.status}`);
        }
        
        const data = await response.json();
        currentWorkspaces = data.data || [];
        
        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify(currentWorkspaces));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
        
        renderWorkspaceSelection();
        showNotification('Workspaces loaded successfully', 'success');
        return currentWorkspaces;
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        showNotification(error.message, 'error');
        return currentWorkspaces; // Return cached data if available
    }
}

/**
 * Enhanced create workspace with validation
 */
async function createWorkspace(name, description, settings = {}) {
    try {
        // Validation
        if (!name || name.trim().length < 3) {
            throw new Error('Workspace name must be at least 3 characters long');
        }

        const response = await fetch(WORKSPACE_API_URL, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ 
                name: name.trim(), 
                description: description?.trim(),
                settings: {
                    defaultCurrency: settings.currency || 'USD',
                    monthlyBudget: settings.budget || null,
                    ...settings
                }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to create workspace');
        }

        // Clear cache
        localStorage.removeItem('workspaces_cache');
        
        showNotification('🎉 Workspace created successfully!', 'success');
        
        // Play success sound if available
        if (typeof playSuccessSound === 'function') {
            playSuccessSound();
        }
        
        await fetchWorkspaces(true); // Force refresh
        return data.data;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}

/**
 * Enhanced invite with email validation
 */
async function inviteToWorkspace(workspaceId, email, role = 'member', personalMessage = '') {
    try {
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address');
        }

        const response = await fetch(`${WORKSPACE_API_URL}/${workspaceId}/invite`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ 
                email, 
                role,
                message: personalMessage
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to send invitation');
        }

        showNotification(`📧 Invitation sent to ${email}`, 'success');
        return data.data;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}

/**
 * Enhanced join workspace with detailed error handling
 */
async function joinWorkspace(token) {
    const loadingEl = document.getElementById('join-loading');
    const successEl = document.getElementById('join-success');
    const errorEl = document.getElementById('join-error');

    try {
        if (!token) {
            throw new Error('Invalid invitation link');
        }

        const response = await fetch(`${WORKSPACE_API_URL}/join`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ token })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to join workspace');
        }

        // Show success state
        if (loadingEl) loadingEl.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
        if (errorEl) errorEl.style.display = 'none';

        // Update workspace info in UI
        const workspace = data.data?.workspace;
        const inviter = data.data?.inviter;
        
        if (workspace) {
            document.getElementById('workspace-name')?.textContent = workspace.name;
            document.getElementById('workspace-desc')?.textContent = workspace.description || 'No description provided';
        }
        
        if (inviter) {
            document.getElementById('inviter-name')?.textContent = inviter.name || inviter.email;
            document.getElementById('inviter-avatar')?.textContent = inviter.name?.[0]?.toUpperCase() || 'U';
        }

        // Clear cache and refresh workspaces
        localStorage.removeItem('workspaces_cache');
        await fetchWorkspaces(true);
        
        // Auto-redirect after 5 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 5000);
        
    } catch (error) {
        console.error('Error joining workspace:', error);
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
        if (errorEl) {
            errorEl.style.display = 'block';
            document.getElementById('error-title')?.textContent = 'Invitation Error';
            document.getElementById('error-message')?.textContent = error.message;
        }
    }
}

// Enhanced UI Rendering Functions
function renderWorkspaceSelection() {
    const container = document.getElementById('workspace-selector');
    if (!container) return;

    const currentUserId = localStorage.getItem('userId');
    const userWorkspaces = currentWorkspaces.filter(ws => 
        ws.members?.some(m => m.user?._id === currentUserId)
    );

    container.innerHTML = `
        <div class="workspace-dropdown-container">
            <div class="workspace-header" onclick="toggleWorkspaceDropdown()">
                <div class="workspace-current">
                    <div class="workspace-avatar ${activeWorkspace ? 'active' : ''}">
                        ${activeWorkspace ? 
                            activeWorkspace.name.charAt(0).toUpperCase() : 
                            '<i class="fas fa-user"></i>'
                        }
                    </div>
                    <div class="workspace-info">
                        <span class="workspace-label">Active Workspace</span>
                        <span class="workspace-name">${activeWorkspace ? activeWorkspace.name : 'Personal Account'}</span>
                    </div>
                    <i class="fas fa-chevron-down dropdown-arrow"></i>
                </div>
            </div>
            
            <div class="workspace-dropdown" id="workspace-dropdown">
                <div class="dropdown-section">
                    <h6>Personal</h6>
                    <div class="workspace-item ${!activeWorkspace ? 'active' : ''}" 
                         onclick="selectWorkspace(null)">
                        <div class="workspace-icon">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="workspace-details">
                            <span class="workspace-title">Personal Account</span>
                            <small class="workspace-subtitle">Your personal expenses</small>
                        </div>
                    </div>
                </div>
                
                ${userWorkspaces.length > 0 ? `
                <div class="dropdown-section">
                    <h6>Team Workspaces</h6>
                    ${userWorkspaces.map(ws => `
                        <div class="workspace-item ${activeWorkspace?._id === ws._id ? 'active' : ''}" 
                             onclick="selectWorkspace('${ws._id}')">
                            <div class="workspace-avatar-sm" style="background: ${getWorkspaceColor(ws.name)}">
                                ${ws.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="workspace-details">
                                <span class="workspace-title">${ws.name}</span>
                                <small class="workspace-subtitle">
                                    ${ws.members?.length || 0} members
                                    ${ws.owner?._id === currentUserId ? ' • Owner' : ''}
                                </small>
                            </div>
                            ${ws.owner?._id === currentUserId ? 
                                '<span class="badge owner">Owner</span>' : 
                                ws.members?.find(m => m.user?._id === currentUserId)?.role === 'admin' ?
                                '<span class="badge admin">Admin</span>' : ''
                            }
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                <div class="dropdown-footer">
                    <button class="btn-create-workspace" onclick="openCreateWorkspaceModal()">
                        <i class="fas fa-plus"></i>
                        <span>Create New Workspace</span>
                    </button>
                    <button class="btn-manage-workspaces" onclick="showWorkspaceManagement()">
                        <i class="fas fa-cog"></i>
                        <span>Manage Workspaces</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Helper function for consistent workspace colors
function getWorkspaceColor(name) {
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

/**
 * Enhanced workspace selection with animation
 */
async function selectWorkspace(id) {
    const previousWorkspace = activeWorkspace;
    
    // Close dropdown with animation
    const dropdown = document.getElementById('workspace-dropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
    }

    // Update active workspace
    if (!id) {
        activeWorkspace = null;
    } else {
        activeWorkspace = currentWorkspaces.find(ws => ws._id === id) || null;
    }

    // Save preference
    localStorage.setItem('activeWorkspaceId', id || 'personal');

    // Update UI
    renderWorkspaceSelection();
    
    // Show transition effect
    if (previousWorkspace !== activeWorkspace) {
        showNotification(
            activeWorkspace ? 
                `Switched to ${activeWorkspace.name}` : 
                'Switched to Personal Account',
            'info'
        );
        
        // Update dashboard with fade transition
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.style.opacity = '0.5';
            mainContent.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                updateWorkspaceDashboard();
                mainContent.style.opacity = '1';
            }, 300);
        }
    }
}

/**
 * Enhanced workspace dashboard update
 */
async function updateWorkspaceDashboard() {
    // Show loading state
    const loadingStates = document.querySelectorAll('.data-loading');
    loadingStates.forEach(el => {
        el.classList.add('loading');
    });

    try {
        // Fetch workspace-specific data
        if (activeWorkspace) {
            // Update workspace info
            await updateWorkspaceInfo();
            
            // Load workspace members
            await loadWorkspaceMembers();
            
            // Fetch workspace expenses
            if (typeof fetchExpenses === 'function') {
                await fetchExpenses({ workspaceId: activeWorkspace._id });
            }
            
            // Fetch workspace analytics
            if (typeof fetchAnalytics === 'function') {
                await fetchAnalytics({ workspaceId: activeWorkspace._id });
            }
        } else {
            // Fetch personal data
            if (typeof fetchExpenses === 'function') {
                await fetchExpenses({ personal: true });
            }
        }
    } catch (error) {
        console.error('Error updating dashboard:', error);
        showNotification('Failed to load workspace data', 'error');
    } finally {
        // Remove loading states
        loadingStates.forEach(el => {
            el.classList.remove('loading');
        });
    }
}

/**
 * Enhanced notification system
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Use existing notification system if available
    if (typeof window.showToast === 'function') {
        window.showToast(message, type, duration);
        return;
    }
    
    // Fallback to Toastify
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };

    Toastify({
        text: message,
        duration: duration,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: colors[type] || colors.info,
        stopOnFocus: true,
        style: {
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500'
        }
    }).showToast();
}

// Initialize workspace feature with enhanced setup
function initWorkspaceFeature() {
    if (isInitialized) return;
    
    try {
        // Load saved preferences
        const savedWorkspaceId = localStorage.getItem('activeWorkspaceId');
        
        // Initialize event listeners
        setupEventListeners();
        
        // Initial fetch of workspaces
        fetchWorkspaces().then(() => {
            if (savedWorkspaceId && savedWorkspaceId !== 'personal') {
                selectWorkspace(savedWorkspaceId);
            }
        });
        
        isInitialized = true;
        console.log('Workspace feature initialized');
    } catch (error) {
        console.error('Failed to initialize workspace feature:', error);
        showNotification('Failed to initialize workspace system', 'error');
    }
}

// Enhanced event listeners setup
function setupEventListeners() {
    // Create workspace form
    const createForm = document.getElementById('create-workspace-form');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('workspace-name-input')?.value;
            const desc = document.getElementById('workspace-desc-input')?.value;
            const currency = document.getElementById('workspace-currency')?.value;
            const budget = document.getElementById('workspace-budget')?.value;
            
            if (!name) {
                showNotification('Please enter a workspace name', 'error');
                return;
            }
            
            try {
                await createWorkspace(name, desc, {
                    currency: currency || 'USD',
                    budget: budget ? parseFloat(budget) : null
                });
                
                closeWorkspaceModal();
                createForm.reset();
            } catch (error) {
                // Error handled in createWorkspace
            }
        });
    }

    // Handle clicks outside dropdown
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('workspace-dropdown');
        const selector = document.getElementById('workspace-selector');
        
        if (dropdown && selector && !selector.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            toggleWorkspaceDropdown();
        }
        
        if (e.key === 'Escape') {
            const dropdown = document.getElementById('workspace-dropdown');
            if (dropdown?.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
    });
}

// Toggle dropdown with animation
function toggleWorkspaceDropdown() {
    const dropdown = document.getElementById('workspace-dropdown');
    if (!dropdown) return;
    
    dropdown.classList.toggle('show');
    
    if (dropdown.classList.contains('show')) {
        dropdown.style.opacity = '1';
        dropdown.style.transform = 'translateY(0)';
    } else {
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
    }
}

// Export functions for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchWorkspaces,
        createWorkspace,
        selectWorkspace,
        inviteToWorkspace,
        joinWorkspace,
        initWorkspaceFeature
    };
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWorkspaceFeature);
} else {
    initWorkspaceFeature();
}