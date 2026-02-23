// Dashboard JavaScript - Dynamic Data Loading
// Attendee Administrator Dashboard

// Configuration
const API_BASE_URL = '/api/dashboard';
const USER_API_BASE_URL = '/api/users';
const ADMIN_API_BASE_URL = '/api/admin/users';
const ROLES_API_URL = '/api/admin/roles';
const PERMISSIONS_API_URL = '/api/admin/permissions';
const REFRESH_INTERVAL = 30000; // 30 seconds
let refreshTimer = null;
let allUsers = []; // Cache for filtering
let allRoles = [];
let allPermissions = [];

// Hierarchy Filter State
let currentCycleFilter = 'all';
let currentDeptFilter = 'all';

document.addEventListener('DOMContentLoaded', function () {
    console.log('Dashboard initializing... v20260216-2'); // Version check

    // Initialize all components
    initializeDashboard();
    initializeSidebar();
    initializeNavigation();
    initializeMobileMenu();
    initializeProfileDropdown();

    // Load initial data
    // loadDashboardData(); // Disabled as DashboardController is removed
    loadRoleAndPermissionData();
    loadAcademicYears();

    // Set up auto-refresh
    setupAutoRefresh();

    // Set up user search
    setupUserSearch();

    // Set up academic year form
    const ayForm = document.getElementById('academicYearForm');
    if (ayForm) {
        ayForm.addEventListener('submit', handleCreateAcademicYear);
    }

    // Deep linking for sections
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    if (section) {
        const navItem = document.querySelector(`[data-section="${section}"]`);
        if (navItem) navItem.click();
    }
});

/**
 * Initialize Dashboard
 */
function initializeDashboard() {
    console.log('Dashboard initialized');
    document.documentElement.style.scrollBehavior = 'smooth';
    loadThemePreference();
}

/**
 * Load Dashboard Data from API
 */
async function loadDashboardData() {
    try {
        showLoading(true);

        // Load all data in parallel
        const [stats, activities, tasks] = await Promise.all([
            fetchStats(),
            fetchActivities(),
            fetchTasks()
        ]);

        // Update UI with fetched data
        updateStats(stats);
        updateActivities(activities);
        updateTasks(tasks);

        showLoading(false);
        console.log('Dashboard data loaded successfully');

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
        showLoading(false);
    }
}

/**
 * Load Users from API
 */
async function loadUsers() {
    try {
        const tableBody = document.getElementById('userTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center gap-2">
                            <div class="w-8 h-8 border-4 border-[#00B0FF] border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading users...</span>
                        </div>
                    </td>
                </tr>
            `;
        }

        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Failed to fetch users');

        allUsers = await response.json();
        renderUserTable(allUsers);
        console.log('Users loaded successfully');

    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users', 'error');
        const tableBody = document.getElementById('userTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Error loading users</td></tr>';
        }
    }
}

/**
 * Render User Table
 */
function renderUserTable(users) {
    const tableBody = document.getElementById('userTableBody');
    if (!tableBody) return;

    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-500">No users found</td></tr>';
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 text-sm font-medium text-gray-400 text-center">#${user.userId}</td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-[#00B0FF] bg-opacity-10 rounded-full flex items-center justify-center text-[#00B0FF] font-semibold">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="text-sm font-semibold text-gray-800">${escapeHtml(user.username)}</div>
                        <div class="text-xs text-gray-500">${escapeHtml(user.email || 'No email')}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                    ${user.roles.map(role => `
                        <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-tight">
                            ${escapeHtml(role.name)}
                        </span>
                    `).join('')}
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                    ${user.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="handleResetPassword(${user.userId})" class="p-2 text-gray-400 hover:text-[#00B0FF] transition-colors" title="Reset Password">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                        </svg>
                    </button>
                    <button onclick="handleToggleStatus(${user.userId}, ${user.isActive})" class="p-2 text-gray-400 hover:text-orange-500 transition-colors" title="${user.isActive ? 'Deactivate' : 'Activate'}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                        </svg>
                    </button>
                    <button onclick="handleDeleteUser(${user.userId})" class="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Delete User">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                    <div class="relative group">
                        <button class="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="Manage Roles">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                            </svg>
                        </button>
                        <div class="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                            <div class="p-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-50">Assign Role</div>
                            ${allRoles.map(role => {
        const hasRole = user.roles.some(r => r.roleId === role.roleId);
        return `
                                    <button onclick="handleUpdateUserRole(${user.userId}, ${role.roleId}, ${!hasRole})" 
                                        class="w-full text-left px-4 py-2 text-sm ${hasRole ? 'text-[#00B0FF] bg-blue-50' : 'text-gray-600 hover:bg-gray-50'} transition-colors flex items-center justify-between">
                                        ${escapeHtml(role.name)}
                                        ${hasRole ? '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>' : ''}
                                    </button>
                                `;
    }).join('')}
                        </div>
                    </div>
                    <!-- Permissions Dropdown -->
                    <div class="relative group">
                        <button class="p-2 text-gray-400 hover:text-emerald-500 transition-colors" title="View Permissions">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                        <div class="hidden group-hover:block absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                            <div class="p-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-50 italic">Effective Permissions</div>
                            <div class="max-h-60 overflow-y-auto">
                                ${(() => {
            const userPermissions = new Set();
            user.roles.forEach(role => {
                (role.permissions || []).forEach(p => userPermissions.add(p.name));
            });
            if (userPermissions.size === 0) return '<div class="p-4 text-xs text-gray-400 text-center italic">No permissions granted</div>';
            return Array.from(userPermissions).sort().map(pName => `
                                        <div class="px-4 py-2 text-xs text-emerald-600 flex items-center gap-2 border-b border-gray-50 last:border-0 hover:bg-emerald-50">
                                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                                            ${escapeHtml(pName)}
                                        </div>
                                    `).join('');
        })()}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Load Role and Permission Data
 */
async function loadRoleAndPermissionData() {
    try {
        const [rolesResponse, permissionsResponse] = await Promise.all([
            fetch('/api/admin/roles'),
            fetch('/api/admin/permissions')
        ]);

        if (!rolesResponse.ok) throw new Error(`Failed to fetch roles: ${rolesResponse.status}`);
        if (!permissionsResponse.ok) throw new Error(`Failed to fetch permissions: ${permissionsResponse.status}`);

        const roles = await rolesResponse.json();
        const permissions = await permissionsResponse.json();

        allRoles = roles || [];
        allPermissions = permissions || [];
        console.log('Roles and permissions loaded', { roles: allRoles.length, permissions: allPermissions.length });
        renderRolesGrid();
    } catch (error) {
        console.error('Error loading roles/permissions:', error);
        const grid = document.getElementById('rolesGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-1 lg:col-span-2 text-center py-12">
                    <div class="bg-red-50 text-red-600 p-4 rounded-xl inline-block">
                        <p class="font-bold">Error loading data</p>
                        <p class="text-sm">${error.message}</p>
                        <button onclick="loadRoleAndPermissionData()" class="mt-3 px-4 py-2 bg-white border border-red-200 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

/**
 * Handle Update User Role
 */
async function handleUpdateUserRole(userId, roleId, add) {
    try {
        const user = allUsers.find(u => u.userId === userId);
        if (!user) return;

        let roleIds = user.roles.map(r => r.roleId);
        if (add) {
            roleIds.push(roleId);
        } else {
            roleIds = roleIds.filter(id => id !== roleId);
        }

        const response = await fetch(`/api/admin/users/${userId}/roles`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roleIds)
        });

        if (response.ok) {
            showNotification('Roles updated successfully', 'success');
            loadUsers(); // Reload to update table
        } else {
            throw new Error('Failed to update roles');
        }
    } catch (error) {
        console.error('Error updating user roles:', error);
        showNotification('Error updating roles', 'error');
    }
}

/**
 * Render Roles Grid
 */
function renderRolesGrid() {
    const grid = document.getElementById('rolesGrid');
    if (!grid) return;

    if (!allRoles || allRoles.length === 0) {
        grid.innerHTML = '<div class="col-span-2 text-center py-8 text-gray-500">No roles found</div>';
        return;
    }

    // Add "Create Role" card
    let html = `
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-dashed border-gray-300 flex flex-col items-center justify-center p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer group" onclick="openCreateRoleModal()">
            <div class="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
            </div>
            <h3 class="font-bold text-gray-800 text-lg">Create New Role</h3>
            <p class="text-sm text-gray-500 mt-1">Define a new user role</p>
        </div>
    `;

    html += allRoles.map(role => `
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
            <div class="p-6 border-b border-gray-50 bg-gray-50 flex items-center justify-between">
                <div>
                    <h3 class="font-bold text-gray-800 text-lg">${escapeHtml(role.name)}</h3>
                    <p class="text-sm text-gray-500">${escapeHtml(role.description || 'No description')}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="handleDeleteRole(${role.roleId})" class="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Delete Role">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                    <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="p-6 flex-1">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Permissions</div>
                <div class="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    ${allPermissions.map(permission => {
        const hasPermission = (role.permissions || []).some(p => p.name === permission.name);
        return `
                        <label class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                            <input type="checkbox" 
                                   ${hasPermission ? 'checked' : ''} 
                                   onchange="handleToggleRolePermission('${role.name}', '${permission.name}', this.checked)"
                                   class="form-checkbox h-4 w-4 text-[#0091D5] rounded border-gray-300 focus:ring-[#0091D5] transition duration-150 ease-in-out">
                            <div>
                                <div class="text-sm font-medium text-gray-700">${escapeHtml(permission.name)}</div>
                                <div class="text-xs text-gray-400">${escapeHtml(permission.description || '')}</div>
                            </div>
                        </label>
                        `;
    }).join('')}
                    ${allPermissions.length === 0 ? '<p class="text-sm text-gray-400 italic">No permissions available</p>' : ''}
                </div>
            </div>
        </div>
    `).join('');

    grid.innerHTML = html;
}

/**
 * Handle Toggle Role Permission
 */
async function handleToggleRolePermission(roleName, permissionName, add) {
    try {
        const role = allRoles.find(r => r.name === roleName);
        if (!role) return;

        let permissions = role.permissions.map(p => p.name);
        if (add) {
            permissions.push(permissionName);
        } else {
            permissions = permissions.filter(p => p !== permissionName);
        }

        const response = await fetch(`/api/admin/roles/${roleName}/permissions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(permissions)
        });

        if (response.ok) {
            showNotification('Role permissions updated', 'success');
            loadRoleAndPermissionData(); // Reload to refresh grid
        } else {
            throw new Error('Failed to update role permissions');
        }
    } catch (error) {
        console.error('Error updating role permissions:', error);
        showNotification('Error updating role permissions', 'error');
    }
}

/**
 * Handle Reset Password
 */
async function handleResetPassword(userId) {
    const newPassword = prompt("Enter new password for this user:");
    if (!newPassword) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
            method: 'POST',
            body: newPassword
        });

        if (response.ok) {
            showNotification('Password reset successfully', 'success');
        } else {
            throw new Error('Failed to reset password');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        showNotification('Error resetting password', 'error');
    }
}

/**
 * Handle Toggle User Status (Deactivate/Activate)
 */
async function handleToggleStatus(userId, currentIsActive) {
    const action = currentIsActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
        const response = await fetch(`/api/users/${userId}/${action}`, {
            method: 'POST'
        });

        if (response.ok) {
            showNotification(`User ${action}d successfully`, 'success');
            loadUsers(); // Reload to update UI
        } else {
            throw new Error(`Failed to ${action} user`);
        }
    } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        showNotification(`Error ${action}ing user`, 'error');
    }
}

/**
 * Handle Delete User
 */
async function handleDeleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('User deleted successfully', 'success');
            loadUsers();
        } else {
            throw new Error('Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

/**
 * Setup User Search
 */
function setupUserSearch() {
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allUsers.filter(user =>
                user.username.toLowerCase().includes(term) ||
                (user.email && user.email.toLowerCase().includes(term))
            );
            renderUserTable(filtered);
        });
    }
}

/**
 * Manual Refresh Users
 */
function refreshUsers() {
    console.log('Refreshing user list...');
    showNotification('Refreshing user list...', 'info');
    loadUsers();
}

/**
 * Fetch Statistics from API
 */
async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return await response.json();
    } catch (error) {
        console.error('Error fetching stats:', error);
        return getDefaultStats();
    }
}

/**
 * Fetch Activities from API
 */
async function fetchActivities() {
    try {
        const response = await fetch(`${API_BASE_URL}/activities`);
        if (!response.ok) throw new Error('Failed to fetch activities');
        return await response.json();
    } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
    }
}

/**
 * Fetch Tasks from API
 */
async function fetchTasks() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        return await response.json();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

/**
 * Get Default Stats (fallback)
 */
function getDefaultStats() {
    return {
        totalUsers: 0,
        userGrowth: '+0%',
        studentCount: 0,
        facultyCount: 0,
        staffCount: 0,
        adminCount: 0,
        activeSessions: 0,
        sessionGrowth: '+0%',
        currentSessions: 0,
        peakSessions: 0,
        databaseSize: '0 GB',
        dbGrowth: '+0 GB',
        documentsSize: '0 GB',
        mediaSize: '0 GB',
        dataSize: '0 GB',
        systemUptime: '0%',
        uptimeDays: 0,
        lastRestart: '0d ago',
        avgResponse: '0ms',
        totalInstitutions: 0,
        activeStaff: 0,
        totalStudents: 0,
        securityAlerts: 0
    };
}

/**
 * Update Statistics in UI
 */
function updateStats(stats) {
    // Update main cards
    updateElement('totalUsers', formatNumber(stats.totalUsers || 0));
    updateElement('userGrowth', stats.userGrowth || '+0%');
    updateElement('studentCount', formatNumber(stats.studentCount || 0));
    updateElement('facultyCount', formatNumber(stats.facultyCount || 0));
    updateElement('staffCount', formatNumber(stats.staffCount || 0));
    updateElement('adminCount', formatNumber(stats.adminCount || 0));

    updateElement('activeSessions', formatNumber(stats.activeSessions || 0));
    updateElement('sessionGrowth', stats.sessionGrowth || '+0%');
    updateElement('currentSessions', formatNumber(stats.currentSessions || 0));
    updateElement('peakSessions', formatNumber(stats.peakSessions || 0));

    updateElement('databaseSize', stats.databaseSize || '0 GB');
    updateElement('dbGrowth', stats.dbGrowth || '+0 GB');
    updateElement('documentsSize', stats.documentsSize || '0 GB');
    updateElement('mediaSize', stats.mediaSize || '0 GB');
    updateElement('dataSize', stats.dataSize || '0 GB');

    updateElement('systemUptime', stats.systemUptime || '0%');
    updateElement('uptimeDays', (stats.uptimeDays || 0) + ' days');
    updateElement('lastRestart', stats.lastRestart || '0d ago');
    updateElement('avgResponse', stats.avgResponse || '0ms');

    updateElement('totalInstitutions', formatNumber(stats.totalInstitutions || 0));
    updateElement('activeStaff', formatNumber(stats.activeStaff || 0));
    updateElement('totalStudents', formatNumber(stats.totalStudents || 0));
    updateElement('securityAlerts', formatNumber(stats.securityAlerts || 0));
}

/**
 * Update Activities in UI
 */
function updateActivities(activities) {
    const container = document.getElementById('activitiesList');
    if (!container) return;

    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500">No recent activities</div>';
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="flex gap-4">
            <div class="w-12 h-12 ${getActivityColorClass(activity.type)} rounded-xl flex items-center justify-center flex-shrink-0">
                ${getActivityIcon(activity.type)}
            </div>
            <div class="flex-1">
                <p class="font-medium text-gray-800">${escapeHtml(activity.title)}</p>
                <p class="text-sm text-gray-600">${escapeHtml(activity.description)}</p>
                <p class="text-xs text-gray-500 mt-1">${escapeHtml(activity.timestamp)} • ${escapeHtml(activity.user)}</p>
            </div>
        </div>
    `).join('');
}

/**
 * Update Tasks in UI
 */
function updateTasks(tasks) {
    const container = document.getElementById('tasksList');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500">No pending tasks</div>';
        return;
    }

    container.innerHTML = tasks.map(task => {
        const colorClass = getTaskColorClass(task.priority);
        return `
            <div class="bg-${colorClass}-50 border border-${colorClass}-200 rounded-xl p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-medium text-${colorClass}-800">${escapeHtml(task.title)}</p>
                        <p class="text-sm text-${colorClass}-600 mt-1">${task.count} pending items</p>
                    </div>
                    <button class="px-4 py-2 bg-white text-${colorClass}-700 border border-${colorClass}-200 rounded-lg text-sm font-medium hover:bg-${colorClass}-50 transition-colors" onclick="handleTaskReview(${task.id})">
                        Review
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get Activity Color Class
 */
function getActivityColorClass(type) {
    const colors = {
        'institution': 'bg-[#00B0FF] bg-opacity-10',
        'staff': 'bg-[#FDD835] bg-opacity-10',
        'security': 'bg-red-500 bg-opacity-10',
        'department': 'bg-[#00B0FF] bg-opacity-10'
    };
    return colors[type] || 'bg-gray-100';
}

/**
 * Get Activity Icon
 */
function getActivityIcon(type) {
    const icons = {
        'institution': '<svg class="w-6 h-6 text-[#00B0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>',
        'staff': '<svg class="w-6 h-6 text-[#FDD835]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',
        'security': '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
        'department': '<svg class="w-6 h-6 text-[#00B0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>'
    };
    return icons[type] || '';
}

/**
 * Get Task Color Class
 */
function getTaskColorClass(priority) {
    const colors = {
        'high': 'red',
        'medium': 'yellow',
        'low': 'blue'
    };
    return colors[priority] || 'gray';
}

/**
 * Handle Task Review Button Click
 */
function handleTaskReview(taskId) {
    console.log('Reviewing task:', taskId);
    showNotification('Opening task review...', 'info');
    // Implement actual task review logic
}

/**
 * Update Element Content
 */
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Format Number with Commas
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show/Hide Loading State
 */
function showLoading(show) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        if (show) {
            section.classList.add('loading');
        } else {
            section.classList.remove('loading');
        }
    });
}

/**
 * Setup Auto Refresh
 */
function setupAutoRefresh() {
    // Clear existing timer
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    // Set up new timer
    refreshTimer = setInterval(() => {
        console.log('Auto-refreshing dashboard data...');
        loadDashboardData();
    }, REFRESH_INTERVAL);
}

/**
 * Manual Refresh Dashboard
 */
function refreshDashboard() {
    console.log('Manually refreshing dashboard...');
    showNotification('Refreshing dashboard...', 'info');
    loadDashboardData();
}

/**
 * Initialize Sidebar Functionality
 */
function initializeSidebar() {
    // Legacy support for sidebar collapse if needed
}

/**
 * Initialize Navigation
 */
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            const targetSection = this.getAttribute('data-section');

            navItems.forEach(nav => {
                nav.classList.remove('active', 'bg-[#00B0FF]', 'text-white');
                nav.classList.add('text-gray-700');
            });

            this.classList.add('active', 'bg-[#00B0FF]', 'text-white');
            this.classList.remove('text-gray-700');

            contentSections.forEach(section => {
                section.classList.add('hidden');
            });

            const targetElement = document.getElementById(`section-${targetSection}`);
            if (targetElement) {
                targetElement.classList.remove('hidden');

                // Special handling for User Management section
                if (targetSection === 'access') {
                    loadUsers();
                }

                // Special handling for Roles section
                if (targetSection === 'roles') {
                    loadRoleAndPermissionData();
                }

                // Special handling for Audit logs section
                if (targetSection === 'audit' && window.auditApp && typeof window.auditApp.loadAuditLogs === 'function') {
                    window.auditApp.loadAuditLogs(0);
                }

                const mainContent = document.querySelector('main');
                if (mainContent) {
                    mainContent.scrollTo({ top: 0, behavior: 'smooth' });
                }

                targetElement.style.animation = 'none';
                setTimeout(() => {
                    targetElement.style.animation = 'fadeIn 0.2s ease-in-out';
                }, 10);

                localStorage.setItem('currentView', targetSection);
            }
        });
    });

    restoreLastView();
}

/**
 * Restore Last Viewed Section
 */
function restoreLastView() {
    const lastView = localStorage.getItem('currentView');
    if (lastView) {
        const navItem = document.querySelector(`[data-section="${lastView}"]`);
        if (navItem) {
            navItem.click();
        }
    }
}

/**
 * Initialize Mobile Menu & Form Listeners
 */
function initializeMobileMenu() {
    console.log('Initializing mobile menu listeners...');

    // Mobile specific resize handling
    window.addEventListener('resize', function () {
        if (window.innerWidth > 1024) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
        }
    });

    // Set up staff form submission
    const staffForm = document.getElementById('staffForm');
    if (staffForm) {
        staffForm.addEventListener('submit', handleCreateStaff);
    }
}

/**
 * Load Theme Preference
 */
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }
}

/**
 * Toggle Theme
 */
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

/**
 * Show Notification
 */
function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');

    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }

    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-white',
        info: 'bg-blue-500 text-white'
    };

    notification.className = `fixed top-20 right-8 px-6 py-4 rounded-xl shadow-lg z-50 transform transition-all duration-300 ${colors[type]}`;
    notification.textContent = message;
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';

    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
    }, 3000);
}

/**
 * Open Staff Modal
 */
function openStaffModal() {
    const modal = document.getElementById('staffModal');
    const content = document.getElementById('staffModalContent');
    const roleSelect = document.querySelector('select[name="roleNames"]');

    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);

        // Populate roles if not already done or to refresh
        if (roleSelect) {
            roleSelect.innerHTML = allRoles
                .filter(role => role.name !== 'STUDENT') // Filter out students for staff creation
                .map(role => `<option value="${role.name}">${escapeHtml(role.name)}</option>`)
                .join('');
        }
    }
}

/**
 * Close Staff Modal
 */
function closeStaffModal() {
    const modal = document.getElementById('staffModal');
    const content = document.getElementById('staffModalContent');

    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('staffForm').reset();
        }, 300);
    }
}

/**
 * Handle Create Staff Form Submission
 */
async function handleCreateStaff(e) {
    e.preventDefault();
    const form = e.target;
    const loader = document.getElementById('staffSubmitLoader');
    const submitBtn = form.querySelector('button[type="submit"]');

    const formData = new FormData(form);
    const roleNames = Array.from(form.querySelector('select[name="roleNames"]').selectedOptions).map(opt => opt.value);

    const payload = {
        username: formData.get('username'),
        email: formData.get('email'),
        roleNames: roleNames,
        institutionId: 1, // Default single institution
        isActive: true
    };

    try {
        loader.classList.remove('hidden');
        submitBtn.disabled = true;

        const response = await fetch('/api/admin/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showNotification('Staff member created! Credentials sent via email.', 'success');
            closeStaffModal();
            loadUsers(); // Refresh table
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create staff member');
        }
    } catch (error) {
        console.error('Error creating staff:', error);
        showNotification(error.message, 'error');
    } finally {
        loader.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

// Export functions for global access
window.dashboardFunctions = {
    refreshDashboard,
    toggleTheme,
    showNotification,
    loadDashboardData,
    refreshUsers,
    openStaffModal,
    closeStaffModal
};

// Global handlers for buttons
window.handleResetPassword = handleResetPassword;
window.handleToggleStatus = handleToggleStatus;
window.handleDeleteUser = handleDeleteUser;
window.openStaffModal = openStaffModal;
window.closeStaffModal = closeStaffModal;

// Cleanup on page unload
window.addEventListener('beforeunload', function () {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});

console.log('Dashboard script loaded successfully - Staff Creation version');

/**
 * Open Create Role Modal
 */
function openCreateRoleModal() {
    const modal = document.getElementById('roleModal');
    const content = document.getElementById('roleModalContent');
    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

/**
 * Close Create Role Modal
 */
function closeCreateRoleModal() {
    const modal = document.getElementById('roleModal');
    const content = document.getElementById('roleModalContent');
    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('roleForm').reset();
        }, 300);
    }
}

/**
 * Handle Create Role
 */
async function handleCreateRole(e) {
    e.preventDefault();
    const form = e.target;
    const loader = document.getElementById('roleSubmitLoader');
    const submitBtn = form.querySelector('button[type="submit"]');

    const formData = new FormData(form);
    const payload = {
        name: formData.get('name').toUpperCase(),
        description: formData.get('description'),
        permissions: [] // Start with no permissions
    };

    try {
        loader.classList.remove('hidden');
        submitBtn.disabled = true;

        const response = await fetch('/api/admin/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showNotification('Role created successfully', 'success');
            closeCreateRoleModal();
            loadRoleAndPermissionData(); // Refresh grid
        } else {
            const error = await response.json().catch(() => ({ message: 'Failed to create role' }));
            throw new Error(error.message || 'Failed to create role');
        }
    } catch (error) {
        console.error('Error creating role:', error);
        showNotification(error.message, 'error');
    } finally {
        loader.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

/**
 * Handle Delete Role
 */
async function handleDeleteRole(roleId) {
    if (!confirm('Are you sure you want to delete this role? Users assigned to this role may lose access.')) return;

    try {
        const response = await fetch(`/api/admin/roles/${roleId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Role deleted successfully', 'success');
            loadRoleAndPermissionData();
        } else {
            throw new Error('Failed to delete role');
        }
    } catch (error) {
        console.error('Error deleting role:', error);
        showNotification('Error deleting role', 'error');
    }
}

// Export new functions
window.openCreateRoleModal = openCreateRoleModal;
window.closeCreateRoleModal = closeCreateRoleModal;
window.handleCreateRole = handleCreateRole;
window.handleDeleteRole = handleDeleteRole;

/**
 * Open Manage Permissions Modal
 */
function openManagePermissionsModal() {
    const modal = document.getElementById('permissionsModal');
    const content = document.getElementById('permissionsModalContent');
    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
        renderPermissionsList();
    }
}

/**
 * Close Manage Permissions Modal
 */
function closeManagePermissionsModal() {
    const modal = document.getElementById('permissionsModal');
    const content = document.getElementById('permissionsModalContent');
    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

/**
 * Render Permissions List in Modal
 */
function renderPermissionsList() {
    const list = document.getElementById('permissionsList');
    if (!list) return;

    if (!allPermissions || allPermissions.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-500">No permissions found</div>';
        return;
    }

    list.innerHTML = allPermissions.map(p => `
        <div class="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
                <div class="font-medium text-gray-800 text-sm">${escapeHtml(p.name)}</div>
                <div class="text-xs text-gray-500">${escapeHtml(p.description || '')}</div>
            </div>
            <button onclick="handleDeletePermission(${p.permissionId})" 
                class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Permission">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

/**
 * Handle Create Permission
 */
async function handleCreatePermission(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const formData = new FormData(form);
    const payload = {
        name: formData.get('name').toUpperCase(),
        description: formData.get('description')
    };

    try {
        submitBtn.disabled = true;
        const response = await fetch('/api/admin/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showNotification('Permission added', 'success');
            form.reset();
            await loadRoleAndPermissionData(); // Reload global data
            renderPermissionsList(); // Refresh list in modal
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create permission');
        }
    } catch (error) {
        console.error('Error creating permission:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

/**
 * Handle Delete Permission
 */
async function handleDeletePermission(id) {
    if (!confirm('Are you sure? This will remove this permission from all roles.')) return;

    try {
        const response = await fetch(`/api/admin/permissions/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Permission deleted', 'success');
            await loadRoleAndPermissionData(); // Reload global data
            renderPermissionsList(); // Refresh list in modal
        } else {
            throw new Error('Failed to delete permission');
        }
    } catch (error) {
        console.error('Error deleting permission:', error);
        showNotification('Error deleting permission', 'error');
    }
}

// Export new Permission functions
window.openManagePermissionsModal = openManagePermissionsModal;
window.closeManagePermissionsModal = closeManagePermissionsModal;
window.handleCreatePermission = handleCreatePermission;
window.handleDeletePermission = handleDeletePermission;

const ACADEMIC_YEARS_API_URL = '/api/admin/academic-years';

/**
 * Load Academic Years from API
 */
async function loadAcademicYears() {
    try {
        const tableBody = document.getElementById('academicYearTableBody');
        if (!tableBody) return;

        const response = await fetch(ACADEMIC_YEARS_API_URL);
        if (!response.ok) throw new Error('Failed to fetch academic years');

        const years = await response.json();
        renderAcademicYearTable(years);
        console.log('Academic years loaded successfully');
    } catch (error) {
        console.error('Error loading academic years:', error);
        const tableBody = document.getElementById('academicYearTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-500">Error loading academic years</td></tr>';
        }
    }
}

/**
 * Render Academic Year Table
 */
function renderAcademicYearTable(years) {
    const tableBody = document.getElementById('academicYearTableBody');
    if (!tableBody) return;

    if (!years || years.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-12 text-center text-gray-500">No academic years found. Launch one to get started.</td></tr>';
        return;
    }

    tableBody.innerHTML = years.map(year => {
        let statusClass = 'bg-slate-100 text-slate-500';
        if (year.status === 'ACTIVE') statusClass = 'bg-green-100 text-green-700';
        if (year.status === 'SUSPENDED') statusClass = 'bg-amber-100 text-amber-700';
        if (year.status === 'CLOSED') statusClass = 'bg-red-100 text-red-700';

        return `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-4">
                <div class="font-bold text-slate-800">${escapeHtml(year.academicYear)}</div>
                <div class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Session Name</div>
            </td>
            <td class="px-4 py-4 text-sm text-slate-600 font-medium">
                <div class="flex items-center gap-2">
                    <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    ${year.startDate} &mdash; ${year.endDate}
                </div>
            </td>
            <td class="px-4 py-4 text-center">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass}">
                    ${year.status}
                </span>
            </td>
            <td class="px-4 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    ${year.status !== 'ACTIVE' ? `
                        <button onclick="handleActivateAcademicYear(${year.id})" class="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors" title="Activate Year">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </button>
                    ` : `
                        <button onclick="handleSuspendAcademicYear(${year.id})" class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Suspend Year">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                        <button onclick="handleCloseAcademicYear(${year.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Close Year">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    `}
                    ${year.status !== 'ACTIVE' ? `
                        <button onclick="handleDeleteAcademicYear(${year.id})" class="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Year">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

/**
 * Handle Launch Academic Year
 */
async function handleCreateAcademicYear(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const payload = {
        academicYear: document.getElementById('ay_name').value,
        startDate: document.getElementById('ay_startDate').value,
        endDate: document.getElementById('ay_endDate').value,
        isActive: document.getElementById('ay_isActive').checked
    };

    try {
        submitBtn.disabled = true;
        const response = await fetch(ACADEMIC_YEARS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showNotification('Academic year launched successfully!', 'success');
            closeAcademicYearModal();
            form.reset();
            loadAcademicYears();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to launch academic year');
        }
    } catch (error) {
        console.error('Error launching academic year:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

/**
 * Handle Activate Academic Year
 */
async function handleActivateAcademicYear(id) {
    if (!confirm('Activating this year will deactivate the current one. Continue?')) return;

    try {
        const response = await fetch(`${ACADEMIC_YEARS_API_URL}/${id}/activate`, {
            method: 'PUT'
        });

        if (response.ok) {
            showNotification('Academic year activated', 'success');
            loadAcademicYears();
        } else {
            throw new Error('Failed to activate year');
        }
    } catch (error) {
        console.error('Error activating year:', error);
        showNotification('Error activating year', 'error');
    }
}

/**
 * Handle Suspend Academic Year
 */
async function handleSuspendAcademicYear(id) {
    if (!confirm('Suspend this academic year temporarily?')) return;

    try {
        const response = await fetch(`${ACADEMIC_YEARS_API_URL}/${id}/suspend`, {
            method: 'PUT'
        });

        if (response.ok) {
            showNotification('Academic year suspended', 'warning');
            loadAcademicYears();
        } else {
            throw new Error('Failed to suspend year');
        }
    } catch (error) {
        console.error('Error suspending year:', error);
        showNotification('Error suspending year', 'error');
    }
}

/**
 * Handle Close Academic Year
 */
async function handleCloseAcademicYear(id) {
    if (!confirm('Are you sure you want to CLOSE this academic year? This should be done at the end of the session.')) return;

    try {
        const response = await fetch(`${ACADEMIC_YEARS_API_URL}/${id}/close`, {
            method: 'PUT'
        });

        if (response.ok) {
            showNotification('Academic year closed', 'info');
            loadAcademicYears();
        } else {
            throw new Error('Failed to close year');
        }
    } catch (error) {
        console.error('Error closing year:', error);
        showNotification('Error closing year', 'error');
    }
}

/**
 * Handle Delete Academic Year
 */
async function handleDeleteAcademicYear(id) {
    if (!confirm('Are you sure you want to delete this archived year?')) return;

    try {
        const response = await fetch(`${ACADEMIC_YEARS_API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Academic year deleted', 'success');
            loadAcademicYears();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete year');
        }
    } catch (error) {
        console.error('Error deleting year:', error);
        showNotification(error.message, 'error');
    }
}

/**
 * Modal Controls
 */
function openAcademicYearModal() {
    const modal = document.getElementById('academicYearModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeAcademicYearModal() {
    const modal = document.getElementById('academicYearModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Export functions to window
window.openAcademicYearModal = openAcademicYearModal;
window.closeAcademicYearModal = closeAcademicYearModal;
window.handleActivateAcademicYear = handleActivateAcademicYear;
window.handleSuspendAcademicYear = handleSuspendAcademicYear;
window.handleCloseAcademicYear = handleCloseAcademicYear;
window.handleDeleteAcademicYear = handleDeleteAcademicYear;

// --- Institution Management Functions ---

/**
 * Opens the Edit Institution Modal and populates it with data.
 */
window.openEditInstitutionModal = function (id, name, location) {
    const modal = document.getElementById('editInstitutionModal');
    const idInput = document.getElementById('editInstId');
    const nameInput = document.getElementById('editInstName');
    const locationInput = document.getElementById('editInstLocation');
    const form = document.getElementById('editInstitutionForm');

    if (modal && idInput && nameInput && locationInput && form) {
        idInput.value = id;
        nameInput.value = name;
        locationInput.value = location;
        form.action = `/admin/institutions/edit/${id}`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeEditInstitutionModal = function () {
    const modal = document.getElementById('editInstitutionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.openCreateCycleModal = function () {
    const modal = document.getElementById('cycleModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeCreateCycleModal = function () {
    const modal = document.getElementById('cycleModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.openEditCycleModal = function (id, name, description) {
    const modal = document.getElementById('editCycleModal');
    const idInput = document.getElementById('editCycleId');
    const nameInput = document.getElementById('editCycleName');
    const descInput = document.getElementById('editCycleDescription');
    const form = document.getElementById('editCycleForm');

    if (modal && idInput && nameInput && descInput && form) {
        idInput.value = id;
        nameInput.value = name;
        descInput.value = description || '';
        form.action = `/admin/cycles/edit/${id}`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeEditCycleModal = function () {
    const modal = document.getElementById('editCycleModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.openCreateDepartmentModal = function (cycleId, institutionId) {
    const modal = document.getElementById('departmentModal');
    const cycleIdInput = document.getElementById('deptCycleId');
    const institutionIdInput = document.getElementById('deptInstitutionId');

    if (modal && cycleIdInput && institutionIdInput) {
        cycleIdInput.value = cycleId;
        institutionIdInput.value = institutionId;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeCreateDepartmentModal = function () {
    const modal = document.getElementById('departmentModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.openEditDepartmentModal = function (id, name, chief, cycleId, institutionId, paId, supervisorIds) {
    const modal = document.getElementById('editDepartmentModal');
    const idInput = document.getElementById('editDeptId');
    const nameInput = document.getElementById('editDeptName');
    const chiefInput = document.getElementById('editDeptChief');
    const cycleSelect = document.getElementById('editDeptCycleId');
    const instSelect = document.getElementById('editDeptInstitutionId');
    const paSelect = document.getElementById('editDeptPaId');
    const form = document.getElementById('editDepartmentForm');

    if (modal && idInput && nameInput && chiefInput && form) {
        idInput.value = id;
        nameInput.value = name;
        chiefInput.value = chief || '';
        if (cycleSelect) cycleSelect.value = cycleId;
        if (instSelect) instSelect.value = institutionId;
        if (paSelect) paSelect.value = paId || '';

        // Handle Supervisors Checkboxes
        const checkboxes = document.querySelectorAll('#editDeptSupervisorsContainer input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = supervisorIds.includes(parseInt(cb.value));
        });

        form.action = `/admin/departments/edit/${id}`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeEditDepartmentModal = function () {
    const modal = document.getElementById('editDepartmentModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.openCreateClassroomModal = function (departmentId) {
    const modal = document.getElementById('classroomModal');
    const deptIdInput = document.getElementById('classroomDepartmentId');

    if (modal && deptIdInput) {
        deptIdInput.value = departmentId;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeCreateClassroomModal = function () {
    const modal = document.getElementById('classroomModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.openEditClassroomModal = function (id, name, level, capacity, departmentId) {
    const modal = document.getElementById('editClassroomModal');
    const idInput = document.getElementById('editClassroomId');
    const nameInput = document.getElementById('editClassroomName');
    const levelInput = document.getElementById('editClassroomLevel');
    const capInput = document.getElementById('editClassroomCapacity');
    const deptSelect = document.getElementById('editClassroomDeptId');
    const form = document.getElementById('editClassroomForm');

    if (modal && idInput && nameInput && levelInput && capInput && form) {
        idInput.value = id;
        nameInput.value = name;
        levelInput.value = level;
        capInput.value = capacity;
        if (deptSelect) deptSelect.value = departmentId;
        form.action = `/admin/classrooms/edit/${id}`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeEditClassroomModal = function () {
    const modal = document.getElementById('editClassroomModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

/**
 * Handles deletion of a cycle with confirmation.
 */
window.handleDeleteCycle = function (id) {
    if (confirm('Are you sure you want to delete this cycle? This action cannot be undone.')) {
        fetch(`/admin/cycles/delete/${id}`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]')?.content
            }
        }).then(response => {
            if (response.ok) {
                window.location.href = '/admin/dashboard?section=institutions';
            } else {
                alert('Failed to delete cycle.');
            }
        });
    }
};

/**
 * Handles deletion of a department with confirmation.
 */
window.handleDeleteDepartment = function (id) {
    if (confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
        fetch(`/admin/departments/delete/${id}`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]')?.content
            }
        }).then(response => {
            if (response.ok) {
                window.location.href = '/admin/dashboard?section=institutions';
            } else {
                alert('Failed to delete department.');
            }
        });
    }
};

/**
 * Handles deletion of a classroom with confirmation.
 */
window.handleDeleteClassroom = function (id) {
    if (confirm('Are you sure you want to delete this classroom? This action cannot be undone.')) {
        fetch(`/admin/classrooms/delete/${id}`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]')?.content
            }
        }).then(response => {
            if (response.ok) {
                window.location.href = '/admin/dashboard?section=institutions';
            } else {
                alert('Failed to delete classroom.');
            }
        });
    }
};

/**
 * Mobile Menu Controls
 */
window.toggleMobileMenu = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        const isOpen = sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active', isOpen);
    }
};

/**
 * Modernized Institution Management - Tab Switching
 */
window.switchManageTab = function (tabName) {
    console.log('Switching to tab:', tabName);

    // Reset hierarchy filters when switching tabs
    currentCycleFilter = 'all';
    currentDeptFilter = 'all';

    // Update tab styles
    const tabs = document.querySelectorAll('.main-tab');
    tabs.forEach(tab => {
        if (tab.id === `tab-${tabName}`) {
            tab.classList.add('active');
            tab.classList.remove('text-slate-500', 'hover:text-slate-700');
        } else {
            tab.classList.remove('active');
            tab.classList.add('text-slate-500', 'hover:text-slate-700');
        }
    });

    // Show/Hide filter containers based on tab
    const subFilters = document.getElementById('manageSubFilters');
    const cycleContainer = document.getElementById('cycleFilterContainer');
    const deptContainer = document.getElementById('deptFilterContainer');

    if (subFilters) {
        if (tabName === 'cycles') {
            subFilters.classList.add('hidden');
        } else {
            subFilters.classList.remove('hidden');
            // Reset all chips to default state
            document.querySelectorAll('.cycle-chip, .dept-chip').forEach(chip => {
                const id = chip.dataset.cycleId || chip.dataset.deptId;
                if (id === 'all') {
                    chip.classList.add('active');
                    chip.classList.remove('border-slate-100', 'text-slate-500', 'bg-white', 'hover:border-blue-200');
                } else {
                    chip.classList.remove('active');
                    chip.classList.add('border-slate-100', 'text-slate-500', 'bg-white', 'hover:border-blue-200');
                }
                // Departments chips are hidden until we decide which belong to cycle or if we show all
                if (chip.classList.contains('dept-chip')) {
                    // We'll show dept chips only if classrooms tab is active
                    chip.parentElement.classList.toggle('hidden', tabName !== 'classrooms');
                }
            });

            if (tabName === 'departments') {
                deptContainer.classList.add('hidden');
            } else if (tabName === 'classrooms') {
                deptContainer.classList.remove('hidden');
            }
        }
    }

    // Show panel
    const panels = document.querySelectorAll('.view-panel');
    panels.forEach(panel => {
        if (panel.id === `view-${tabName}`) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    });

    // Re-apply filtering
    applyManageSearch();
};

/**
 * Modernized Institution Management - Search and Filter
 */
window.applyManageSearch = function () {
    const term = document.getElementById('manageSearchInput').value.toLowerCase();
    const sort = document.getElementById('manageSortSel').value;

    // Get current active tab
    const activeTabElem = document.querySelector('.main-tab.active');
    if (!activeTabElem) return;
    const activeTab = activeTabElem.id.replace('tab-', '');

    let items = [];
    if (activeTab === 'cycles') {
        items = Array.from(document.querySelectorAll('.cycle-card'));
    } else if (activeTab === 'departments') {
        items = Array.from(document.querySelectorAll('.dept-card'));
    } else if (activeTab === 'classrooms') {
        items = Array.from(document.querySelectorAll('.class-card'));
    }

    if (items.length === 0) return;

    // Filter
    items.forEach(item => {
        const name = item.dataset.name.toLowerCase();
        const cycleId = item.dataset.cycleId;
        const deptId = item.dataset.deptId;

        const matchesTerm = name.includes(term);
        let matchesHierarchy = true;

        if (activeTab === 'departments') {
            matchesHierarchy = (currentCycleFilter === 'all' || cycleId === currentCycleFilter);
        } else if (activeTab === 'classrooms') {
            const matchesCycle = (currentCycleFilter === 'all' || cycleId === currentCycleFilter);
            const matchesDept = (currentDeptFilter === 'all' || deptId === currentDeptFilter);
            matchesHierarchy = matchesCycle && matchesDept;
        }

        if (matchesTerm && matchesHierarchy) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });

    // Sort
    const parent = items[0].parentElement;
    items.sort((a, b) => {
        const nameA = a.dataset.name.toLowerCase();
        const nameB = b.dataset.name.toLowerCase();
        if (sort === 'name') return nameA.localeCompare(nameB);
        if (sort === 'name-desc') return nameB.localeCompare(nameA);
        return 0;
    });

    items.forEach(item => parent.appendChild(item));
};

/**
 * Sets a hierarchy filter and updates UI chips
 */
window.setManageFilter = function (type, id) {
    if (type === 'cycle') {
        currentCycleFilter = String(id);
        // If we change cycle, reset dept filter to 'all' for consistency 
        // because the previous selected dept might not belong to the new cycle.
        currentDeptFilter = 'all';

        // Update Cycle Chips
        document.querySelectorAll('.cycle-chip').forEach(chip => {
            const chipId = String(chip.dataset.cycleId);
            if (chipId === currentCycleFilter) {
                chip.classList.add('active');
                chip.classList.remove('border-slate-100', 'text-slate-500', 'bg-white', 'hover:border-blue-200');
            } else {
                chip.classList.remove('active');
                chip.classList.add('border-slate-100', 'text-slate-500', 'bg-white', 'hover:border-blue-200');
            }
        });

        // Update Dept Chip visibility if choosing a cycle
        document.querySelectorAll('.dept-chip').forEach(chip => {
            const chipId = String(chip.dataset.deptId);
            const chipCycleId = String(chip.dataset.cycleId);

            // Reset Dept active state
            if (chipId === 'all') {
                chip.classList.add('active');
                chip.classList.remove('border-slate-100', 'text-slate-500', 'bg-white', 'hover:border-blue-200');
            } else {
                chip.classList.remove('active');
                chip.classList.add('border-slate-100', 'text-slate-500', 'bg-white', 'hover:border-blue-200');
            }

            // Toggle visibility of dept chip based on cycle
            if (chipId === 'all') {
                chip.classList.remove('hidden');
            } else {
                if (currentCycleFilter === 'all' || chipCycleId === currentCycleFilter) {
                    chip.classList.remove('hidden');
                } else {
                    chip.classList.add('hidden');
                }
            }
        });

    } else if (type === 'dept') {
        currentDeptFilter = String(id);

        // Update Dept Chips
        document.querySelectorAll('.dept-chip').forEach(chip => {
            const chipId = String(chip.dataset.deptId);
            if (chipId === currentDeptFilter) {
                chip.classList.add('active');
                chip.classList.remove('border-slate-100', 'text-slate-500', 'bg-white', 'hover:border-blue-200');
            } else {
                chip.classList.remove('active');
                chip.classList.add('border-slate-100', 'text-slate-500', 'bg-white', 'hover:border-blue-200');
            }
        });
    }

    // Apply combined filters
    applyManageSearch();
};



/**
 * Initialize Profile Dropdown toggle and click-away observer
 */
function initializeProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const profileMenu = document.getElementById('profile-menu');
    const avatarInput = document.getElementById('avatarInput');

    if (!profileBtn || !profileMenu) return;

    // Load existing avatar
    loadAvatar();

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = profileMenu.classList.contains('hidden');

        // Toggle current menu
        if (isHidden) {
            profileMenu.classList.remove('hidden');
            setTimeout(() => {
                profileMenu.classList.add('opacity-100', 'scale-100');
                profileMenu.classList.remove('opacity-0', 'scale-95');
            }, 10);
        } else {
            closeProfileMenu();
        }
    });

    // Handle Avatar Upload
    if (avatarInput) {
        avatarInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showNotification('Please select an image file', 'error');
                return;
            }

            // Convert to Base64
            const reader = new FileReader();
            reader.onload = function (event) {
                const base64Image = event.target.result;

                // Save to localStorage
                localStorage.setItem('userAvatar', base64Image);

                // Update UI
                updateAvatarUI(base64Image);
                showNotification('Profile picture updated successfully', 'success');
            };
            reader.readAsDataURL(file);
        });
    }

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
            closeProfileMenu();
        }
    });

    function closeProfileMenu() {
        profileMenu.classList.add('opacity-0', 'scale-95');
        profileMenu.classList.remove('opacity-100', 'scale-100');
        setTimeout(() => {
            profileMenu.classList.add('hidden');
        }, 200);
    }
}

/**
 * Load avatar from localStorage and update UI
 */
function loadAvatar() {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
        updateAvatarUI(savedAvatar);
    }
}

/**
 * Update Avatar UI elements
 */
function updateAvatarUI(base64Image) {
    const userAvatar = document.getElementById('userAvatar');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const avatarContainer = document.getElementById('avatarContainer');

    if (userAvatar && avatarPlaceholder && avatarContainer) {
        userAvatar.src = base64Image;
        userAvatar.classList.remove('hidden');
        avatarPlaceholder.classList.add('hidden');
        avatarContainer.classList.remove('bg-blue-500'); // Remove placeholder background
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
    console.log('Theme toggled:', isDark ? 'dark' : 'light');
}

/**
 * Load theme preference from localStorage or system settings
 */
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    updateThemeIcons(isDark);
    console.log('Theme loaded:', isDark ? 'dark' : 'light');
}

/**
 * Update theme toggle icons based on current theme
 */
function updateThemeIcons(isDark) {
    const sunIcon = document.getElementById('theme-toggle-light-icon');
    const moonIcon = document.getElementById('theme-toggle-dark-icon');

    if (sunIcon && moonIcon) {
        if (isDark) {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    }
}

/**
 * Bulk Import Logic
 */

function openBulkImportModal() {
    const modal = document.getElementById('bulkImportModal');
    const content = document.getElementById('bulkImportModalContent');
    if (modal && content) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Reset steps
        document.getElementById('bulkImportStep1').classList.remove('hidden');
        document.getElementById('bulkImportStep2').classList.add('hidden');

        // Reset file input
        document.getElementById('csvFileInput').value = '';
        document.getElementById('selectedFileName').textContent = 'Choose CSV file';
        document.getElementById('startImportBtn').disabled = true;

        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

function closeBulkImportModal() {
    const modal = document.getElementById('bulkImportModal');
    const content = document.getElementById('bulkImportModalContent');
    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }
}

function handleFileSelection(event) {
    const file = event.target.files[0];
    const fileNameElement = document.getElementById('selectedFileName');
    const startBtn = document.getElementById('startImportBtn');

    if (file) {
        if (!file.name.endsWith('.csv')) {
            showNotification('Please select a valid CSV file', 'error');
            event.target.value = '';
            fileNameElement.textContent = 'Choose CSV file';
            startBtn.disabled = true;
            return;
        }
        fileNameElement.textContent = file.name;
        startBtn.disabled = false;
    }
}

async function startImport() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];
    const loader = document.getElementById('importLoader');
    const startBtn = document.getElementById('startImportBtn');

    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        loader.classList.remove('hidden');
        startBtn.disabled = true;

        const response = await fetch('/api/admin/staff/bulk-import', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            showResults(result);
            // We need loadUsers to refresh the table. Check if it's defined.
            if (typeof loadUsers === 'function') {
                loadUsers();
            }
        } else {
            throw new Error('Failed to process bulk import');
        }
    } catch (error) {
        console.error('Bulk Import Error:', error);
        showNotification(error.message, 'error');
        startBtn.disabled = false;
        loader.classList.add('hidden');
    }
}

function showResults(result) {
    document.getElementById('bulkImportStep1').classList.add('hidden');
    document.getElementById('bulkImportStep2').classList.remove('hidden');

    document.getElementById('res_total').textContent = result.totalRows;
    document.getElementById('res_success').textContent = result.successCount;
    document.getElementById('res_failed').textContent = result.failureCount;

    const errorContainer = document.getElementById('errorListContainer');
    const errorTable = document.getElementById('importErrorTable');

    if (result.failureCount > 0) {
        errorContainer.classList.remove('hidden');
        errorTable.innerHTML = result.errors.map(err => `
            <tr>
                <td class="px-3 py-2 font-black text-slate-700">${err.rowNumber}</td>
                <td class="px-3 py-2 text-slate-600">${escapeHtml(err.identifier)}</td>
                <td class="px-3 py-2 text-rose-500 font-medium">${escapeHtml(err.errorMessage)}</td>
            </tr>
        `).join('');
    } else {
        errorContainer.classList.add('hidden');
    }
}

function downloadCsvTemplate() {
    const headers = "username,email,role\n";
    const example = "john_doe,john@example.com,PEDAGOG\njane_smith,jane@example.com,SUPERVISOR";
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'staff_import_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Global Exports
window.openBulkImportModal = openBulkImportModal;
window.closeBulkImportModal = closeBulkImportModal;
window.handleFileSelection = handleFileSelection;
window.startImport = startImport;
window.downloadCsvTemplate = downloadCsvTemplate;

console.log('Bulk Importer module loaded');

// ─────────────────────────────────────────────
//  SCHEDULING GRID — Hierarchical Scoped Dates
// ─────────────────────────────────────────────

const SCHED_API = '/api/admin/academic-years';
let _allAcademicYears = []; // cache used by the modal select

/**
 * Load all schedules across all academic years and render them in the grid.
 */
async function loadScheduleGrid() {
    const body = document.getElementById('scheduleGridBody');
    if (!body) return;

    body.innerHTML = `
        <tr id="scheduleGridLoading">
            <td colspan="6" class="px-4 py-10 text-center text-slate-500">
                <div class="flex flex-col items-center gap-2">
                    <div class="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading schedules...</span>
                </div>
            </td>
        </tr>`;

    try {
        // Fetch the full academic years list (already loaded by loadAcademicYears but we need IDs)
        const yearsResp = await fetch(SCHED_API);
        if (!yearsResp.ok) throw new Error('Failed to fetch academic years');
        const years = await yearsResp.json();
        _allAcademicYears = years || [];

        // Fetch schedules for each academic year in parallel
        const schedPromises = years.map(y =>
            fetch(`${SCHED_API}/${y.id}/schedules`).then(r => r.ok ? r.json() : [])
        );
        const schedArrays = await Promise.all(schedPromises);
        const allSchedules = schedArrays.flat();

        renderScheduleGrid(allSchedules);
    } catch (err) {
        console.error('Error loading schedule grid:', err);
        body.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-10 text-center text-red-500">
                    Failed to load schedules. <button onclick="loadScheduleGrid()" class="underline font-semibold">Retry</button>
                </td>
            </tr>`;
    }
}

/**
 * Render schedule rows into the grid table.
 */
function renderScheduleGrid(schedules) {
    const body = document.getElementById('scheduleGridBody');
    if (!body) return;

    if (!schedules || schedules.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-10 text-center text-slate-400">
                    <div class="flex flex-col items-center gap-2">
                        <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <span class="font-medium">No scoped schedules yet</span>
                        <span class="text-sm">Click "Add Schedule" to create one</span>
                    </div>
                </td>
            </tr>`;
        return;
    }

    const statusColors = {
        ACTIVE: 'bg-emerald-100 text-emerald-700',
        SUSPENDED: 'bg-amber-100 text-amber-700',
        CLOSED: 'bg-slate-100 text-slate-500',
    };

    body.innerHTML = schedules.map(s => {
        const badge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[s.status] || 'bg-slate-100 text-slate-500'}">${s.status}</span>`;
        const actions = buildScheduleActions(s);
        return `
            <tr class="hover:bg-slate-50/70 transition-colors" data-schedule-id="${s.id}">
                <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(s.academicYearName || '')}</td>
                <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(s.scopeLabel || 'Default')}</td>
                <td class="px-4 py-3 text-sm text-slate-600">${s.startDate || '—'}</td>
                <td class="px-4 py-3 text-sm text-slate-600">${s.endDate || '—'}</td>
                <td class="px-4 py-3 text-center">${badge}</td>
                <td class="px-4 py-3 text-right">${actions}</td>
            </tr>`;
    }).join('');
}

/**
 * Build the action buttons for a schedule row.
 */
function buildScheduleActions(s) {
    const id = s.id;
    const status = s.status;
    let btns = [];

    if (status !== 'ACTIVE') {
        btns.push(`<button onclick="scheduleAction(${id},'activate')" class="px-2.5 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all" title="Activate">Activate</button>`);
    }
    if (status === 'ACTIVE') {
        btns.push(`<button onclick="scheduleAction(${id},'suspend')" class="px-2.5 py-1 text-xs font-semibold bg-amber-400 hover:bg-amber-500 text-white rounded-lg transition-all" title="Suspend">Suspend</button>`);
        btns.push(`<button onclick="scheduleAction(${id},'close')" class="px-2.5 py-1 text-xs font-semibold bg-slate-400 hover:bg-slate-500 text-white rounded-lg transition-all" title="Close">Close</button>`);
    }
    if (status !== 'ACTIVE') {
        btns.push(`<button onclick="scheduleAction(${id},'delete')" class="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>`);
    }
    return `<div class="flex items-center justify-end gap-1">${btns.join('')}</div>`;
}

/**
 * Execute a lifecycle action or delete on a schedule.
 */
async function scheduleAction(id, action) {
    if (action === 'delete' && !confirm('Delete this schedule? This cannot be undone.')) return;

    try {
        let url, method;
        if (action === 'delete') {
            url = `${SCHED_API}/schedules/${id}`;
            method = 'DELETE';
        } else {
            url = `${SCHED_API}/schedules/${id}/${action}`;
            method = 'PUT';
        }

        const resp = await fetch(url, { method });
        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(err || `Failed to ${action} schedule`);
        }
        showNotification(`Schedule ${action}d successfully`, 'success');
        loadScheduleGrid();
    } catch (err) {
        console.error(`Error ${action}ing schedule:`, err);
        showNotification(err.message || `Error: ${action} failed`, 'error');
    }
}

/**
 * Open the "Add Schedule" modal.
 */
function openAddScheduleModal() {
    const modal = document.getElementById('addScheduleModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('schedErrorMsg').classList.add('hidden');
        document.getElementById('schedAcademicYearName').value = '';
        document.getElementById('schedScopeType').value = 'default';
        document.getElementById('schedStartDate').value = '';
        document.getElementById('schedEndDate').value = '';

        // Reset checkboxes
        document.querySelectorAll('input[name="schedDirectCycleIds"]').forEach(el => el.checked = false);

        handleSchedScopeChange(); // Reset steps
    }
}

/**
 * Close the "Add Schedule" modal.
 */
function closeAddScheduleModal() {
    const modal = document.getElementById('addScheduleModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Toggle relational steps based on scope type.
 */
function handleSchedScopeChange() {
    const scope = document.getElementById('schedScopeType').value;
    document.getElementById('schedCycleDirectStep').classList.toggle('hidden', scope !== 'cycle_direct');
    document.getElementById('schedCycleStep').classList.toggle('hidden', scope !== 'cycle');
    document.getElementById('schedDeptStep').classList.toggle('hidden', scope !== 'department');

    // Reset selections when scope changes
    if (scope !== 'cycle') {
        document.getElementById('schedCycleSelector').value = '';
        document.getElementById('schedDeptListWrapper').classList.add('hidden');
        document.getElementById('schedDeptCheckboxes').innerHTML = '';
    }
    if (scope !== 'department') {
        document.getElementById('schedDeptSelector').value = '';
        document.getElementById('schedClassListWrapper').classList.add('hidden');
        document.getElementById('schedClassCheckboxes').innerHTML = '';
    }
}

/**
 * Fetch and show departments for the selected cycle.
 */
async function handleCycleSelectionChange() {
    const cycleId = document.getElementById('schedCycleSelector').value;
    const wrapper = document.getElementById('schedDeptListWrapper');
    const container = document.getElementById('schedDeptCheckboxes');

    if (!cycleId) {
        wrapper.classList.add('hidden');
        return;
    }

    try {
        const resp = await fetch(`/admin/departments/by-cycle/${cycleId}`);
        if (!resp.ok) throw new Error("Failed to fetch departments");
        const depts = await resp.json();

        container.innerHTML = depts.map(d => `
            <div class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all cursor-pointer">
                <input type="checkbox" name="schedDeptIds" value="${d.departmentId}" id="sd_${d.departmentId}" class="rounded text-[#00B0FF] focus:ring-[#00B0FF]">
                <label for="sd_${d.departmentId}" class="text-xs font-bold text-slate-700 cursor-pointer truncate">${d.name}</label>
            </div>
        `).join('');

        wrapper.classList.remove('hidden');
    } catch (err) {
        console.error(err);
        showNotification("Error loading departments", "error");
    }
}

/**
 * Fetch and show classrooms for the selected department.
 */
async function handleDeptSelectionChange() {
    const deptId = document.getElementById('schedDeptSelector').value;
    const wrapper = document.getElementById('schedClassListWrapper');
    const container = document.getElementById('schedClassCheckboxes');

    if (!deptId) {
        wrapper.classList.add('hidden');
        return;
    }

    try {
        const resp = await fetch(`/admin/classrooms/by-department/${deptId}`);
        if (!resp.ok) throw new Error("Failed to fetch classrooms");
        const classes = await resp.json();

        container.innerHTML = classes.map(c => `
            <div class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all cursor-pointer">
                <input type="checkbox" name="schedClassIds" value="${c.classId}" id="sc_${c.classId}" class="rounded text-[#00B0FF] focus:ring-[#00B0FF]">
                <label for="sc_${c.classId}" class="text-xs font-bold text-slate-700 cursor-pointer truncate">${c.name}</label>
            </div>
        `).join('');

        wrapper.classList.remove('hidden');
    } catch (err) {
        console.error(err);
        showNotification("Error loading classrooms", "error");
    }
}

/**
 * Submit the Add Schedule form with support for relational batching.
 */
async function saveSchedule() {
    const yearName = document.getElementById('schedAcademicYearName')?.value.trim();
    const scope = document.getElementById('schedScopeType')?.value;
    const startDate = document.getElementById('schedStartDate')?.value;
    const endDate = document.getElementById('schedEndDate')?.value;
    const errEl = document.getElementById('schedErrorMsg');
    const errTxt = document.getElementById('schedErrorText');

    if (!yearName || !startDate || !endDate) {
        errTxt.textContent = 'Academic Year and dates are required.';
        errEl.classList.remove('hidden');
        return;
    }
    if (startDate >= endDate) {
        errTxt.textContent = 'Start date must be before end date.';
        errEl.classList.remove('hidden');
        return;
    }

    const basePayload = {
        academicYearName: yearName,
        startDate,
        endDate,
    };

    let payloads = [];
    if (scope === 'cycle_direct') {
        const checkedCycles = Array.from(document.querySelectorAll('input[name="schedDirectCycleIds"]:checked')).map(el => parseInt(el.value));
        if (checkedCycles.length === 0) {
            errTxt.textContent = 'Please select at least one cycle.';
            errEl.classList.remove('hidden');
            return;
        }
        checkedCycles.forEach(id => payloads.push({ ...basePayload, cycleId: id }));
    } else if (scope === 'cycle') {
        const checkedDepts = Array.from(document.querySelectorAll('input[name="schedDeptIds"]:checked')).map(el => parseInt(el.value));
        if (checkedDepts.length === 0) {
            errTxt.textContent = 'Please select at least one department.';
            errEl.classList.remove('hidden');
            return;
        }
        checkedDepts.forEach(id => payloads.push({ ...basePayload, departmentId: id }));
    } else if (scope === 'department') {
        const checkedClasses = Array.from(document.querySelectorAll('input[name="schedClassIds"]:checked')).map(el => parseInt(el.value));
        if (checkedClasses.length === 0) {
            errTxt.textContent = 'Please select at least one classroom.';
            errEl.classList.remove('hidden');
            return;
        }
        checkedClasses.forEach(id => payloads.push({ ...basePayload, classroomId: id }));
    } else {
        payloads.push(basePayload); // Default Global
    }

    try {
        errEl.classList.add('hidden');
        const savePromises = payloads.map(p =>
            fetch(`${SCHED_API}/batch`, { // Using /batch if handled or loop POST
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(p),
            }).then(async r => {
                if (!r.ok) {
                    const txt = await r.text();
                    throw new Error(txt || 'Failed to create schedule');
                }
                return r.json();
            })
        );

        await Promise.all(savePromises);

        showNotification(`${payloads.length} schedule(s) configured successfully`, 'success');
        closeAddScheduleModal();
        loadScheduleGrid();
    } catch (err) {
        console.error('Error saving schedule:', err);
        errTxt.textContent = err.message || 'Failed to create schedule';
        errEl.classList.remove('hidden');
    }
}

// Hook into navigation: auto-load schedules when academic-year section becomes active
document.addEventListener('DOMContentLoaded', function () {
    const ayNavItem = document.querySelector('[data-section="academic-year"]');
    if (ayNavItem) {
        ayNavItem.addEventListener('click', function () {
            setTimeout(loadScheduleGrid, 200); // slight delay to ensure section is visible
        });
    }
});

// Global exports for inline HTML handlers
window.openAddScheduleModal = openAddScheduleModal;
window.closeAddScheduleModal = closeAddScheduleModal;
window.handleSchedScopeChange = handleSchedScopeChange;
window.saveSchedule = saveSchedule;
window.scheduleAction = scheduleAction;
window.loadScheduleGrid = loadScheduleGrid;

console.log('Scheduling Grid module loaded');
