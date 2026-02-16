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

document.addEventListener('DOMContentLoaded', function () {
    console.log('Dashboard initializing...');

    // Initialize all components
    initializeDashboard();
    initializeSidebar();
    initializeNavigation();
    initializeMobileMenu();

    // Load initial data
    loadDashboardData();
    loadRoleAndPermissionData();

    // Set up auto-refresh
    setupAutoRefresh();

    // Set up user search
    setupUserSearch();
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
                        <button class="p-2 text-gray-400 hover:text-indigo-500 transition-colors" title="Manage Roles">
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
                    <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="p-6 flex-1">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Permissions</div>
                <div class="flex flex-wrap gap-2 mb-6">
                    ${(role.permissions || []).map(p => `
                        <span class="px-2 py-1 bg-[#0091D5]  text-white rounded-lg text-xs font-medium flex items-center gap-1">
                            ${escapeHtml(p.name)}
                            <button onclick="handleToggleRolePermission('${role.name}', '${p.name}', false)" class="hover:text-red-500 transition-colors">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </span>
                    `).join('')}
                    ${role.permissions.length === 0 ? '<p class="text-sm text-gray-400 italic">No permissions assigned</p>' : ''}
                </div>
                
                <div class="mt-auto">
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Add Permission</label>
                    <select onchange="handleToggleRolePermission('${role.name}', this.value, true); this.value='';" 
                        class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B0FF]">
                        <option value="">Select permission...</option>
                        ${allPermissions
            .filter(p => !(role.permissions || []).some(rp => rp.name === p.name))
            .map(p => `<option value="${p.name}">${escapeHtml(p.name)}</option>`)
            .join('')}
                    </select>
                </div>
            </div>
        </div>
    `).join('');
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
 * Initialize Mobile Menu
 */
function initializeMobileMenu() {
    const header = document.querySelector('header');

    if (window.innerWidth <= 768) {
        const menuToggle = document.createElement('button');
        menuToggle.id = 'mobile-menu-toggle';
        menuToggle.className = 'p-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden';
        menuToggle.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
        `;

        const container = header.querySelector('div');
        if (container) {
            container.insertBefore(menuToggle, container.querySelector('div:last-child'));
        }

        menuToggle.addEventListener('click', function () {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('mobile-open');

            let overlay = document.getElementById('sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-40';
                overlay.style.display = 'none';
                document.body.appendChild(overlay);

                overlay.addEventListener('click', function () {
                    sidebar.classList.remove('mobile-open');
                    this.style.display = 'none';
                });
            }

            overlay.style.display = sidebar.classList.contains('mobile-open') ? 'block' : 'none';
        });
    }

    // Set up staff form submission
    const staffForm = document.getElementById('staffForm');
    if (staffForm) {
        staffForm.addEventListener('submit', handleCreateStaff);
    }

    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.remove('mobile-open');

            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    });
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
        password: formData.get('password'),
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
            showNotification('Staff member created successfully!', 'success');
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