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

// Pagination State
let currentPage = 0;
let totalPages = 0;
let pageSize = 10;

// Hierarchy Filter State
let currentCycleFilter = 'all';
let currentDeptFilter = 'all';
let currentRoleFilter = 'ALL';

/**
 * Toggle custom dropdown
 */
function toggleUserDropdown(id, event) {
    if (event) event.stopPropagation();

    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    const isHidden = dropdown.classList.contains('hidden');

    // Close all other user dropdowns
    document.querySelectorAll('[id^="dropdown-"]').forEach(el => el.classList.add('hidden'));

    if (isHidden) {
        dropdown.classList.remove('hidden');
    }
}

// Global click listener to close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('[id^="dropdown-"]') && !e.target.closest('button[onclick*="toggleUserDropdown"]')) {
        document.querySelectorAll('[id^="dropdown-"]').forEach(el => el.classList.add('hidden'));
    }
});

/**
 * Escape HTML
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

document.addEventListener('DOMContentLoaded', function () {
    console.log('Dashboard initializing... v20260216-2');

    initializeDashboard();
    initializeSidebar();
    initializeNavigation();
    initializeMobileMenu();
    initializeProfileDropdown();

    loadRoleAndPermissionData();
    loadAcademicYears();

    setupAutoRefresh();
    setupUserSearch();

    const ayForm = document.getElementById('academicYearForm');
    if (ayForm) {
        ayForm.addEventListener('submit', handleCreateAcademicYear);
    }

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

        const [stats, activities, tasks] = await Promise.all([
            fetchStats(),
            fetchActivities(),
            fetchTasks()
        ]);

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
 * Load Users from API with Pagination - newest first
 */
async function loadUsers(page = 0) {
    try {
        currentPage = page;
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

        const response = await fetch(`/api/admin/users?page=${page}&size=${pageSize}&sortBy=createdAt&sortDir=desc`);
        if (!response.ok) throw new Error('Failed to fetch users');

        const data = await response.json();
        allUsers = data.content || [];
        totalPages = data.totalPages || 0;

        renderUserTable(allUsers);
        renderPagination(data);
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
 * Render Pagination Controls
 */
function renderPagination(data) {
    const existingPagination = document.getElementById('userPagination');
    if (existingPagination) existingPagination.remove();

    if (!data || data.totalPages <= 1) return;

    const section = document.getElementById('section-access');
    if (!section) return;

    const pagination = document.createElement('div');
    pagination.id = 'userPagination';
    pagination.className = 'flex items-center justify-between px-6 py-4 bg-white rounded-2xl shadow-sm mt-4';

    pagination.innerHTML = `
        <div class="text-sm text-slate-500 font-medium">
            Showing <span class="font-bold text-slate-700">${data.number * data.size + 1}</span>
            to <span class="font-bold text-slate-700">${Math.min((data.number + 1) * data.size, data.totalElements)}</span>
            of <span class="font-bold text-slate-700">${data.totalElements}</span> users
        </div>
        <div class="flex items-center gap-2">
            <button
                onclick="loadUsers(${data.number - 1})"
                ${data.first ? 'disabled' : ''}
                class="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
            </button>
            <div class="flex gap-1">
                ${Array.from({ length: data.totalPages }, (_, i) => `
                    <button
                        onclick="loadUsers(${i})"
                        class="w-8 h-8 text-sm font-bold rounded-lg transition-all
                            ${i === data.number
                                ? 'bg-[#00B0FF] text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50 border border-slate-200'}">
                        ${i + 1}
                    </button>
                `).join('')}
            </div>
            <button
                onclick="loadUsers(${data.number + 1})"
                ${data.last ? 'disabled' : ''}
                class="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
            </button>
        </div>
    `;

    section.appendChild(pagination);
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

    const filteredByRole = currentRoleFilter === 'ALL'
        ? users
        : users.filter(user => (user.roleNames || []).includes(currentRoleFilter));

    if (filteredByRole.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-500">No users match this role filter</td></tr>';
        return;
    }

    tableBody.innerHTML = filteredByRole.map(user => `
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
                    ${(user.roleNames || []).map(roleName => `
                        <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-tight">
                            ${escapeHtml(roleName)}
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
                    <!-- Roles Dropdown -->
                    <div class="relative">
                        <button onclick="toggleUserDropdown('dropdown-roles-${user.userId}', event)"
                                class="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="Manage Roles">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                            </svg>
                        </button>
                        <div id="dropdown-roles-${user.userId}" class="hidden absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden" onclick="event.stopPropagation()">
                            <div class="p-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-50">Assign Role</div>
                            <div class="max-h-60 overflow-y-auto">
                                ${allRoles.map(role => {
                                    const hasRole = (user.roleIds || []).includes(role.roleId);
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
                    <!-- Permissions Dropdown -->
                    <div class="relative">
                        <button onclick="toggleUserDropdown('dropdown-perms-${user.userId}', event)"
                                class="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="Manage Permission Overrides">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                            </svg>
                        </button>
                        <div id="dropdown-perms-${user.userId}" class="hidden absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden" onclick="event.stopPropagation()">
                            <div class="p-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-50">Manage Permissions</div>
                            <div class="max-h-60 overflow-y-auto p-2 space-y-1">
                                ${allPermissions.map(perm => {
                                    const isExplicitlyGranted = (user.additionalPermissionIds || []).includes(perm.permissionId);
                                    const isExplicitlyDenied = (user.deniedPermissionIds || []).includes(perm.permissionId);
                                    const hasPermission = (user.effectivePermissionIds || []).includes(perm.permissionId);

                                    let state = 'default';
                                    if (isExplicitlyGranted) state = 'granted';
                                    else if (isExplicitlyDenied) state = 'denied';

                                    const isInherited = hasPermission && !isExplicitlyGranted;

                                    return `
                                        <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-xs transition-colors">
                                            <span class="font-medium ${hasPermission ? 'text-green-600' : (state === 'denied' ? 'text-red-600' : 'text-gray-700')}">
                                                ${escapeHtml(perm.name)}
                                                ${isInherited ? '<span class="ml-1 text-[10px] text-gray-400 italic">(inherited)</span>' : ''}
                                            </span>
                                            <button onclick="handlePermissionCycle(${user.userId}, ${perm.permissionId}, '${state}')"
                                                class="flex items-center justify-center p-1.5 rounded-lg border-2 transition-all ${state === 'granted' ? 'bg-green-500 border-green-500 text-white shadow-sm' : state === 'denied' ? 'bg-red-500 border-red-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-300 hover:border-blue-400 hover:text-blue-400'}"
                                                title="${state === 'granted' ? 'Explicitly Granted' : state === 'denied' ? 'Explicitly Denied' : 'Default (Inherited)'}">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    ${state === 'granted' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>' : state === 'denied' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>' : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" opacity="0.3"></path>'}
                                                </svg>
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                                <div class="pt-2 border-t border-gray-50">
                                    <button onclick="handleClearOverrides(${user.userId})"
                                        class="w-full py-2 text-[10px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 uppercase tracking-widest transition-colors">
                                        Clear Manual Overrides
                                    </button>
                                </div>
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

        let roleIds = [...(user.roleIds || [])];
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
            loadUsers(currentPage);
        } else {
            throw new Error('Failed to update roles');
        }
    } catch (error) {
        console.error('Error updating user roles:', error);
        showNotification('Error updating roles', 'error');
    }
}

/**
 * Handle Permission Cycle
 */
async function handlePermissionCycle(userId, permissionId, currentState) {
    let action;
    let endpoint;

    if (currentState === 'default') {
        action = 'grant';
        endpoint = `/api/admin/users/${userId}/permissions/grant/${permissionId}`;
    } else if (currentState === 'granted') {
        action = 'revoke';
        endpoint = `/api/admin/users/${userId}/permissions/revoke/${permissionId}`;
    } else {
        action = 'clear';
        endpoint = `/api/admin/users/${userId}/permissions/clear/${permissionId}`;
    }

    try {
        const response = await fetch(endpoint, { method: 'POST' });

        if (response.ok) {
            showNotification(`Permission ${action}${action.endsWith('e') ? 'd' : 'ed'} successfully`, 'success');
            loadUsers(currentPage);
        } else {
            const errorText = await response.text();
            throw new Error(errorText || `Failed to ${action} permission`);
        }
    } catch (error) {
        console.error(`Error cycling permission:`, error);
        showNotification(error.message || `Error updating permission`, 'error');
    }
}

/**
 * Handle Override Permission
 */
async function handleOverridePermission(userId, permissionId, action) {
    // kept for compatibility
}

/**
 * Handle Clear Overrides
 */
async function handleClearOverrides(userId) {
    if (!confirm('Are you sure you want to clear all permission overrides for this user?')) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}/permissions/clear`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Permission overrides cleared', 'success');
            loadUsers(currentPage);
        } else {
            throw new Error('Failed to clear overrides');
        }
    } catch (error) {
        console.error('Error clearing overrides:', error);
        showNotification('Error clearing overrides', 'error');
    }
}

/**
 * Handle Toggle User Status
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
            loadUsers(currentPage);
        } else {
            throw new Error(`Failed to ${action} user`);
        }
    } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        showNotification(`Error ${action}ing user`, 'error');
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
            loadUsers(currentPage);
        } else {
            throw new Error('Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
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
            loadRoleAndPermissionData();
        } else {
            throw new Error('Failed to update role permissions');
        }
    } catch (error) {
        console.error('Error updating role permissions:', error);
        showNotification('Error updating role permissions', 'error');
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
 * Filter users by role
 */
function setRoleFilter(role) {
    currentRoleFilter = role;

    document.querySelectorAll('.role-filter-btn').forEach(btn => {
        if ((role === 'ALL' && btn.textContent.trim() === 'All') ||
            (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${role}'`))) {
            btn.classList.add('active', 'bg-[#00B0FF]', 'text-white');
            btn.classList.remove('bg-white', 'text-slate-600');
        } else {
            btn.classList.remove('active', 'bg-[#00B0FF]', 'text-white');
            btn.classList.add('bg-white', 'text-slate-600');
        }
    });

    renderUserTable(allUsers);
}

/**
 * Manual Refresh Users - resets to page 0
 */
function refreshUsers() {
    console.log('Refreshing user list...');
    showNotification('Refreshing user list...', 'info');
    loadUsers(0);
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
 * Get Default Stats
 */
function getDefaultStats() {
    return {
        totalUsers: 0, userGrowth: '+0%', studentCount: 0, facultyCount: 0,
        staffCount: 0, adminCount: 0, activeSessions: 0, sessionGrowth: '+0%',
        currentSessions: 0, peakSessions: 0, databaseSize: '0 GB', dbGrowth: '+0 GB',
        documentsSize: '0 GB', mediaSize: '0 GB', dataSize: '0 GB', systemUptime: '0%',
        uptimeDays: 0, lastRestart: '0d ago', avgResponse: '0ms', totalInstitutions: 0,
        activeStaff: 0, totalStudents: 0, securityAlerts: 0
    };
}

/**
 * Update Statistics in UI
 */
function updateStats(stats) {
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

function getActivityColorClass(type) {
    const colors = {
        'institution': 'bg-[#00B0FF] bg-opacity-10',
        'staff': 'bg-[#FDD835] bg-opacity-10',
        'security': 'bg-red-500 bg-opacity-10',
        'department': 'bg-[#00B0FF] bg-opacity-10'
    };
    return colors[type] || 'bg-gray-100';
}

function getActivityIcon(type) {
    const icons = {
        'institution': '<svg class="w-6 h-6 text-[#00B0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>',
        'staff': '<svg class="w-6 h-6 text-[#FDD835]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',
        'security': '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
        'department': '<svg class="w-6 h-6 text-[#00B0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>'
    };
    return icons[type] || '';
}

function getTaskColorClass(priority) {
    const colors = { 'high': 'red', 'medium': 'yellow', 'low': 'blue' };
    return colors[priority] || 'gray';
}

function handleTaskReview(taskId) {
    console.log('Reviewing task:', taskId);
    showNotification('Opening task review...', 'info');
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showLoading(show) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        if (show) section.classList.add('loading');
        else section.classList.remove('loading');
    });
}

function setupAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        console.log('Auto-refreshing dashboard data...');
        loadDashboardData();
    }, REFRESH_INTERVAL);
}

function refreshDashboard() {
    console.log('Manually refreshing dashboard...');
    showNotification('Refreshing dashboard...', 'info');
    loadDashboardData();
}

function initializeSidebar() {}

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

            contentSections.forEach(section => section.classList.add('hidden'));

            const targetElement = document.getElementById(`section-${targetSection}`);
            if (targetElement) {
                targetElement.classList.remove('hidden');

                if (targetSection === 'access') loadUsers(0);
                if (targetSection === 'roles') loadRoleAndPermissionData();
                if (targetSection === 'audit' && window.auditApp && typeof window.auditApp.loadAuditLogs === 'function') {
                    window.auditApp.loadAuditLogs(0);
                }

                const mainContent = document.querySelector('main');
                if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });

                targetElement.style.animation = 'none';
                setTimeout(() => { targetElement.style.animation = 'fadeIn 0.2s ease-in-out'; }, 10);

                localStorage.setItem('currentView', targetSection);
            }
        });
    });

    restoreLastView();
}

function restoreLastView() {
    const lastView = localStorage.getItem('currentView');
    if (lastView) {
        const navItem = document.querySelector(`[data-section="${lastView}"]`);
        if (navItem) navItem.click();
    }
}

function initializeMobileMenu() {
    console.log('Initializing mobile menu listeners...');

    window.addEventListener('resize', function () {
        if (window.innerWidth > 1024) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
        }
    });

    const staffForm = document.getElementById('staffForm');
    if (staffForm) staffForm.addEventListener('submit', handleCreateStaff);
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    updateThemeIcons(isDark);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
    const sunIcon = document.getElementById('theme-toggle-light-icon');
    const moonIcon = document.getElementById('theme-toggle-dark-icon');
    if (sunIcon && moonIcon) {
        if (isDark) { sunIcon.classList.remove('hidden'); moonIcon.classList.add('hidden'); }
        else { sunIcon.classList.add('hidden'); moonIcon.classList.remove('hidden'); }
    }
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

        if (roleSelect) {
            roleSelect.innerHTML = allRoles
                .filter(role => role.name !== 'STUDENT')
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
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        roleNames: roleNames,
        institutionId: 1,
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
            loadUsers(0);
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

// Export functions
window.dashboardFunctions = { refreshDashboard, toggleTheme, showNotification, loadDashboardData, refreshUsers, openStaffModal, closeStaffModal };
window.handleResetPassword = handleResetPassword;
window.handleToggleStatus = handleToggleStatus;
window.handleDeleteUser = handleDeleteUser;
window.openStaffModal = openStaffModal;
window.closeStaffModal = closeStaffModal;

window.addEventListener('beforeunload', function () {
    if (refreshTimer) clearInterval(refreshTimer);
});

console.log('Dashboard script loaded successfully');

/**
 * Role Modal Functions
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

async function handleCreateRole(e) {
    e.preventDefault();
    const form = e.target;
    const loader = document.getElementById('roleSubmitLoader');
    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const payload = { name: formData.get('name').toUpperCase(), description: formData.get('description'), permissions: [] };

    try {
        loader.classList.remove('hidden');
        submitBtn.disabled = true;
        const response = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (response.ok) {
            showNotification('Role created successfully', 'success');
            closeCreateRoleModal();
            loadRoleAndPermissionData();
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

async function handleDeleteRole(roleId) {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
        const response = await fetch(`/api/admin/roles/${roleId}`, { method: 'DELETE' });
        if (response.ok) { showNotification('Role deleted successfully', 'success'); loadRoleAndPermissionData(); }
        else throw new Error('Failed to delete role');
    } catch (error) {
        console.error('Error deleting role:', error);
        showNotification('Error deleting role', 'error');
    }
}

window.openCreateRoleModal = openCreateRoleModal;
window.closeCreateRoleModal = closeCreateRoleModal;
window.handleCreateRole = handleCreateRole;
window.handleDeleteRole = handleDeleteRole;

/**
 * Permissions Modal Functions
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

function closeManagePermissionsModal() {
    const modal = document.getElementById('permissionsModal');
    const content = document.getElementById('permissionsModalContent');
    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { modal.classList.add('hidden'); }, 300);
    }
}

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
            <button onclick="handleDeletePermission(${p.permissionId})" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

async function handleCreatePermission(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const payload = { name: formData.get('name').toUpperCase(), description: formData.get('description') };
    try {
        submitBtn.disabled = true;
        const response = await fetch('/api/admin/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (response.ok) { showNotification('Permission added', 'success'); form.reset(); await loadRoleAndPermissionData(); renderPermissionsList(); }
        else { const error = await response.json(); throw new Error(error.message || 'Failed to create permission'); }
    } catch (error) { console.error('Error creating permission:', error); showNotification(error.message, 'error'); }
    finally { submitBtn.disabled = false; }
}

async function handleDeletePermission(id) {
    if (!confirm('Are you sure? This will remove this permission from all roles.')) return;
    try {
        const response = await fetch(`/api/admin/permissions/${id}`, { method: 'DELETE' });
        if (response.ok) { showNotification('Permission deleted', 'success'); await loadRoleAndPermissionData(); renderPermissionsList(); }
        else throw new Error('Failed to delete permission');
    } catch (error) { console.error('Error deleting permission:', error); showNotification('Error deleting permission', 'error'); }
}

window.openManagePermissionsModal = openManagePermissionsModal;
window.closeManagePermissionsModal = closeManagePermissionsModal;
window.handleCreatePermission = handleCreatePermission;
window.handleDeletePermission = handleDeletePermission;

/**
 * Academic Year Functions
 */
const ACADEMIC_YEARS_API_URL = '/api/admin/academic-years';

async function loadAcademicYears() {
    try {
        const tableBody = document.getElementById('academicYearTableBody');
        if (!tableBody) return;
        const response = await fetch(ACADEMIC_YEARS_API_URL);
        if (!response.ok) throw new Error('Failed to fetch academic years');
        const years = await response.json();
        renderAcademicYearTable(years);
    } catch (error) {
        console.error('Error loading academic years:', error);
        const tableBody = document.getElementById('academicYearTableBody');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-500">Error loading academic years</td></tr>';
    }
}

function renderAcademicYearTable(years) {
    const tableBody = document.getElementById('academicYearTableBody');
    if (!tableBody) return;
    if (!years || years.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-12 text-center text-gray-500">No academic years found.</td></tr>';
        return;
    }
    tableBody.innerHTML = years.map(year => {
        let statusClass = 'bg-slate-100 text-slate-500';
        if (year.status === 'ACTIVE') statusClass = 'bg-green-100 text-green-700';
        if (year.status === 'SUSPENDED') statusClass = 'bg-amber-100 text-amber-700';
        if (year.status === 'CLOSED') statusClass = 'bg-red-100 text-red-700';
        return `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-4"><div class="font-bold text-slate-800">${escapeHtml(year.academicYear)}</div></td>
            <td class="px-4 py-4 text-sm text-slate-600">${year.startDate} &mdash; ${year.endDate}</td>
            <td class="px-4 py-4 text-center"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusClass}">${year.status}</span></td>
            <td class="px-4 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    ${year.status !== 'ACTIVE' ? `<button onclick="handleActivateAcademicYear(${year.id})" class="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors">Activate</button>` : `<button onclick="handleSuspendAcademicYear(${year.id})" class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">Suspend</button><button onclick="handleCloseAcademicYear(${year.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">Close</button>`}
                    ${year.status !== 'ACTIVE' ? `<button onclick="handleDeleteAcademicYear(${year.id})" class="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">Delete</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function handleCreateAcademicYear(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const payload = { academicYear: document.getElementById('ay_name').value, startDate: document.getElementById('ay_startDate').value, endDate: document.getElementById('ay_endDate').value, isActive: document.getElementById('ay_isActive').checked };
    try {
        submitBtn.disabled = true;
        const response = await fetch(ACADEMIC_YEARS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (response.ok) { showNotification('Academic year launched!', 'success'); closeAcademicYearModal(); form.reset(); loadAcademicYears(); }
        else { const error = await response.json(); throw new Error(error.message || 'Failed to launch academic year'); }
    } catch (error) { console.error('Error:', error); showNotification(error.message, 'error'); }
    finally { submitBtn.disabled = false; }
}

async function handleActivateAcademicYear(id) {
    if (!confirm('Activating this year will deactivate the current one. Continue?')) return;
    try { const r = await fetch(`${ACADEMIC_YEARS_API_URL}/${id}/activate`, { method: 'PUT' }); if (r.ok) { showNotification('Year activated', 'success'); loadAcademicYears(); } else throw new Error(); } catch { showNotification('Error activating year', 'error'); }
}

async function handleSuspendAcademicYear(id) {
    if (!confirm('Suspend this academic year?')) return;
    try { const r = await fetch(`${ACADEMIC_YEARS_API_URL}/${id}/suspend`, { method: 'PUT' }); if (r.ok) { showNotification('Year suspended', 'warning'); loadAcademicYears(); } else throw new Error(); } catch { showNotification('Error suspending year', 'error'); }
}

async function handleCloseAcademicYear(id) {
    if (!confirm('Close this academic year?')) return;
    try { const r = await fetch(`${ACADEMIC_YEARS_API_URL}/${id}/close`, { method: 'PUT' }); if (r.ok) { showNotification('Year closed', 'info'); loadAcademicYears(); } else throw new Error(); } catch { showNotification('Error closing year', 'error'); }
}

async function handleDeleteAcademicYear(id) {
    if (!confirm('Delete this archived year?')) return;
    try { const r = await fetch(`${ACADEMIC_YEARS_API_URL}/${id}`, { method: 'DELETE' }); if (r.ok) { showNotification('Year deleted', 'success'); loadAcademicYears(); } else { const e = await r.json(); throw new Error(e.message); } } catch (e) { showNotification(e.message, 'error'); }
}

function openAcademicYearModal() { const m = document.getElementById('academicYearModal'); if (m) { m.classList.remove('hidden'); m.classList.add('flex'); } }
function closeAcademicYearModal() { const m = document.getElementById('academicYearModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } }

window.openAcademicYearModal = openAcademicYearModal;
window.closeAcademicYearModal = closeAcademicYearModal;
window.handleActivateAcademicYear = handleActivateAcademicYear;
window.handleSuspendAcademicYear = handleSuspendAcademicYear;
window.handleCloseAcademicYear = handleCloseAcademicYear;
window.handleDeleteAcademicYear = handleDeleteAcademicYear;

/**
 * Institution Management Functions
 */
window.openEditInstitutionModal = function (id, name, location) {
    const modal = document.getElementById('editInstitutionModal');
    const form = document.getElementById('editInstitutionForm');
    if (modal) {
        document.getElementById('editInstId').value = id;
        document.getElementById('editInstName').value = name;
        document.getElementById('editInstLocation').value = location;
        form.action = `/admin/institutions/edit/${id}`;
        modal.classList.remove('hidden'); modal.classList.add('flex');
    }
};

window.closeEditInstitutionModal = function () { const m = document.getElementById('editInstitutionModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } };
window.openCreateCycleModal = function () { const m = document.getElementById('cycleModal'); if (m) { m.classList.remove('hidden'); m.classList.add('flex'); } };
window.closeCreateCycleModal = function () { const m = document.getElementById('cycleModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } };

window.openEditCycleModal = function (id, name, description) {
    const modal = document.getElementById('editCycleModal');
    const form = document.getElementById('editCycleForm');
    if (modal) {
        document.getElementById('editCycleId').value = id;
        document.getElementById('editCycleName').value = name;
        document.getElementById('editCycleDescription').value = description || '';
        form.action = `/admin/cycles/edit/${id}`;
        modal.classList.remove('hidden'); modal.classList.add('flex');
    }
};

window.closeEditCycleModal = function () { const m = document.getElementById('editCycleModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } };

window.openCreateDepartmentModal = function (cycleId, institutionId) {
    const modal = document.getElementById('departmentModal');
    if (modal) {
        const cycleInput = document.getElementById('deptCycleId');
        const instInput = document.getElementById('deptInstitutionId');
        if (cycleInput) cycleInput.value = cycleId;
        if (instInput) instInput.value = institutionId;
        modal.classList.remove('hidden'); modal.classList.add('flex');
        resetMultiSelect('paCreateDropdown');
        resetMultiSelect('supCreateDropdown');
    }
};

window.closeCreateDepartmentModal = function () {
    const m = document.getElementById('departmentModal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); resetMultiSelect('paCreateDropdown'); resetMultiSelect('supCreateDropdown'); }
};

window.openEditDepartmentModal = function (id, name, chief, cycleId, institutionId, paIds, supervisorIds) {
    const modal = document.getElementById('editDepartmentModal');
    const form = document.getElementById('editDepartmentForm');
    if (modal) {
        document.getElementById('editDeptId').value = id;
        document.getElementById('editDeptName').value = name;
        document.getElementById('editDeptChief').value = chief || '';
        const cycleSelect = document.getElementById('editDeptCycleId');
        const instSelect = document.getElementById('editDeptInstitutionId');
        if (cycleSelect) cycleSelect.value = cycleId;
        if (instSelect) instSelect.value = institutionId;
        syncMultiSelect('paEditDropdown', paIds);
        syncMultiSelect('supEditDropdown', supervisorIds);
        form.action = `/admin/departments/edit/${id}`;
        modal.classList.remove('hidden'); modal.classList.add('flex');
    }
};

window.closeEditDepartmentModal = function () { const m = document.getElementById('editDepartmentModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } };

window.openCreateClassroomModalFromSpec = function (specialityId) {
    const modal = document.getElementById('classroomModal');
    const specIdInput = document.getElementById('classroomSpecialityId');
    const specSelect = document.getElementById('classroomSpecialitySelect');
    if (modal && specIdInput) {
        specIdInput.value = specialityId;
        if (specSelect) specSelect.value = specialityId;
        modal.classList.remove('hidden'); modal.classList.add('flex');
    }
};

window.closeCreateClassroomModal = function () { const m = document.getElementById('classroomModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } };

window.openEditClassroomModal = function (id, name, level, capacity, specialityId) {
    const modal = document.getElementById('editClassroomModal');
    const form = document.getElementById('editClassroomForm');
    if (modal) {
        document.getElementById('editClassroomId').value = id;
        document.getElementById('editClassroomName').value = name;
        document.getElementById('editClassroomLevel').value = level;
        document.getElementById('editClassroomCapacity').value = capacity;
        const specSelect = document.getElementById('editClassroomSpecId');
        if (specSelect) specSelect.value = specialityId;
        form.action = `/admin/classrooms/edit/${id}`;
        modal.classList.remove('hidden'); modal.classList.add('flex');
    }
};

window.closeEditClassroomModal = function () { const m = document.getElementById('editClassroomModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } };

window.openCreateSpecialityModal = function (departmentId) {
    const modal = document.getElementById('specialityModal');
    const form = document.getElementById('specialityForm');
    const deptSelect = document.getElementById('specialityDeptId');
    if (modal) {
        if (form) form.reset();
        if (deptSelect && departmentId) deptSelect.value = departmentId;
        modal.classList.remove('hidden'); modal.classList.add('flex');
    }
};

window.closeCreateSpecialityModal = function () { const m = document.getElementById('specialityModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } };

window.openEditSpecialityModal = function (id, name, description, departmentId) {
    const modal = document.getElementById('editSpecialityModal');
    const form = document.getElementById('editSpecialityForm');
    if (modal) {
        document.getElementById('editSpecialityId').value = id;
        document.getElementById('editSpecialityName').value = name;
        document.getElementById('editSpecialityDescription').value = description;
        const deptSelect = document.getElementById('editSpecialityDeptId');
        if (deptSelect) deptSelect.value = departmentId;
        form.action = `/admin/specialities/edit/${id}`;
        modal.classList.remove('hidden'); modal.classList.add('flex');
    }
};

window.closeEditSpecialityModal = function () { const m = document.getElementById('editSpecialityModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } };

window.handleDeleteSpeciality = function (id) {
    if (confirm('Delete this speciality?')) {
        fetch(`/admin/specialities/delete/${id}`, { method: 'POST' }).then(r => r.text()).then(result => { if (result === 'success') window.location.reload(); else alert('Failed to delete.'); }).catch(() => alert('Error deleting.'));
    }
};

/**
 * Multi-select Dropdown Logic
 */
window.toggleMultiSelect = function (id) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    const content = dropdown.querySelector('.dropdown-content');
    document.querySelectorAll('.multi-select-dropdown .dropdown-content').forEach(other => { if (other !== content) other.classList.add('hidden'); });
    content.classList.toggle('hidden');
};

window.filterMultiSelect = function (input) {
    const term = input.value.toLowerCase();
    const dropdown = input.closest('.multi-select-dropdown');
    const options = dropdown.querySelectorAll('.dropdown-content > div:not(.p-2)');
    options.forEach(opt => { opt.classList.toggle('hidden', !opt.textContent.toLowerCase().includes(term)); });
};

window.toggleOption = function (element, dropdownId, value) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    const indicator = element.querySelector('.checkbox-indicator');
    const svg = indicator.querySelector('svg');
    checkbox.checked = !checkbox.checked;
    if (checkbox.checked) { indicator.classList.add('bg-blue-500', 'border-blue-500'); indicator.classList.remove('border-slate-200'); svg.classList.remove('hidden'); }
    else { indicator.classList.remove('bg-blue-500', 'border-blue-500'); indicator.classList.add('border-slate-200'); svg.classList.add('hidden'); }
    updateMultiSelectDisplay(dropdownId);
};

window.updateMultiSelectDisplay = function (dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const selectedText = dropdown.querySelector('.selected-text');
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked');
    if (checkboxes.length === 0) { selectedText.textContent = dropdownId.toLowerCase().includes('pa') ? 'Select PAs...' : 'Select Supervisors...'; selectedText.classList.add('text-slate-500'); selectedText.classList.remove('text-blue-600', 'font-semibold'); }
    else { selectedText.textContent = `${checkboxes.length} Selected`; selectedText.classList.remove('text-slate-500'); selectedText.classList.add('text-blue-600', 'font-semibold'); }
};

window.syncMultiSelect = function (dropdownId, selectedIds) {
    if (!selectedIds) selectedIds = [];
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = selectedIds.includes(parseInt(cb.value));
        const element = cb.closest('div.cursor-pointer');
        const indicator = element.querySelector('.checkbox-indicator');
        const svg = indicator.querySelector('svg');
        if (cb.checked) { indicator.classList.add('bg-blue-500', 'border-blue-500'); indicator.classList.remove('border-slate-200'); svg.classList.remove('hidden'); }
        else { indicator.classList.remove('bg-blue-500', 'border-blue-500'); indicator.classList.add('border-slate-200'); svg.classList.add('hidden'); }
    });
    updateMultiSelectDisplay(dropdownId);
};

window.resetMultiSelect = function (dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
        const element = cb.closest('div.cursor-pointer');
        const indicator = element.querySelector('.checkbox-indicator');
        const svg = indicator.querySelector('svg');
        indicator.classList.remove('bg-blue-500', 'border-blue-500'); indicator.classList.add('border-slate-200'); svg.classList.add('hidden');
    });
    updateMultiSelectDisplay(dropdownId);
};

document.addEventListener('click', function (e) {
    if (!e.target.closest('.multi-select-dropdown')) {
        document.querySelectorAll('.multi-select-dropdown .dropdown-content').forEach(d => d.classList.add('hidden'));
    }
});

window.handleDeleteCycle = function (id) {
    if (confirm('Delete this cycle?')) {
        fetch(`/admin/cycles/delete/${id}`, { method: 'POST' }).then(r => { if (r.ok) window.location.href = '/admin/dashboard?section=institutions'; else alert('Failed to delete cycle.'); });
    }
};

window.handleDeleteDepartment = function (id) {
    if (confirm('Delete this department?')) {
        fetch(`/admin/departments/delete/${id}`, { method: 'POST' }).then(r => { if (r.ok) window.location.href = '/admin/dashboard?section=institutions'; else alert('Failed to delete department.'); });
    }
};

window.handleDeleteClassroom = function (id) {
    if (confirm('Delete this classroom?')) {
        fetch(`/admin/classrooms/delete/${id}`, { method: 'POST' }).then(r => { if (r.ok) window.location.href = '/admin/dashboard?section=institutions'; else alert('Failed to delete classroom.'); });
    }
};

window.toggleMobileMenu = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) { const isOpen = sidebar.classList.toggle('mobile-open'); overlay.classList.toggle('active', isOpen); }
};

/**
 * Institution Tab Switching
 */
window.switchManageTab = function (tabName) {
    currentCycleFilter = 'all';
    currentDeptFilter = 'all';

    document.querySelectorAll('.main-tab').forEach(tab => {
        if (tab.id === `tab-${tabName}`) { tab.classList.add('active'); tab.classList.remove('text-slate-500', 'hover:text-slate-700'); }
        else { tab.classList.remove('active'); tab.classList.add('text-slate-500', 'hover:text-slate-700'); }
    });

    const subFilters = document.getElementById('manageSubFilters');
    const deptContainer = document.getElementById('deptFilterContainer');

    if (subFilters) {
        if (tabName === 'cycles') { subFilters.classList.add('hidden'); }
        else {
            subFilters.classList.remove('hidden');
            if (tabName === 'departments') { deptContainer.classList.add('hidden'); if (document.getElementById('specFilterContainer')) document.getElementById('specFilterContainer').classList.add('hidden'); }
            else if (tabName === 'specialities') { deptContainer.classList.remove('hidden'); if (document.getElementById('specFilterContainer')) document.getElementById('specFilterContainer').classList.add('hidden'); }
            else if (tabName === 'classrooms') { deptContainer.classList.remove('hidden'); if (document.getElementById('specFilterContainer')) document.getElementById('specFilterContainer').classList.remove('hidden'); }
        }
    }

    document.querySelectorAll('.view-panel').forEach(panel => {
        if (panel.id === `view-${tabName}`) panel.classList.remove('hidden');
        else panel.classList.add('hidden');
    });

    applyManageSearch();
};

window.applyManageSearch = function () {
    const term = document.getElementById('manageSearchInput').value.toLowerCase();
    const sort = document.getElementById('manageSortSel').value;
    const activeTabElem = document.querySelector('.main-tab.active');
    if (!activeTabElem) return;
    const activeTab = activeTabElem.id.replace('tab-', '');

    let items = [];
    if (activeTab === 'cycles') items = Array.from(document.querySelectorAll('.cycle-card'));
    else if (activeTab === 'departments') items = Array.from(document.querySelectorAll('.dept-card'));
    else if (activeTab === 'specialities') items = Array.from(document.querySelectorAll('.spec-card'));
    else if (activeTab === 'classrooms') items = Array.from(document.querySelectorAll('.class-card'));

    if (items.length === 0) return;

    items.forEach(item => {
        const name = item.dataset.name.toLowerCase();
        const cycleId = item.dataset.cycleId;
        const deptId = item.dataset.deptId;
        const matchesTerm = name.includes(term);
        let matchesHierarchy = true;
        if (activeTab === 'departments') matchesHierarchy = (currentCycleFilter === 'all' || cycleId === currentCycleFilter);
        else if (activeTab === 'specialities') matchesHierarchy = (currentDeptFilter === 'all' || deptId === currentDeptFilter);
        if (matchesTerm && matchesHierarchy) item.classList.remove('hidden');
        else item.classList.add('hidden');
    });

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

window.setManageFilter = function (type, id) {
    if (type === 'cycle') {
        currentCycleFilter = String(id);
        currentDeptFilter = 'all';
        document.querySelectorAll('.cycle-chip').forEach(chip => {
            const chipId = String(chip.dataset.cycleId);
            if (chipId === currentCycleFilter) { chip.classList.add('active'); chip.classList.remove('border-slate-100', 'text-slate-500', 'bg-white'); }
            else { chip.classList.remove('active'); chip.classList.add('border-slate-100', 'text-slate-500', 'bg-white'); }
        });
    } else if (type === 'dept') {
        currentDeptFilter = String(id);
        document.querySelectorAll('.dept-chip').forEach(chip => {
            const chipId = String(chip.dataset.deptId);
            if (chipId === currentDeptFilter) { chip.classList.add('active'); chip.classList.remove('border-slate-100', 'text-slate-500', 'bg-white'); }
            else { chip.classList.remove('active'); chip.classList.add('border-slate-100', 'text-slate-500', 'bg-white'); }
        });
    } else if (type === 'spec') {
        window.currentSpecFilter = String(id);
        document.querySelectorAll('.spec-chip').forEach(chip => {
            const chipId = String(chip.dataset.specId);
            if (chipId === window.currentSpecFilter) { chip.classList.add('active'); chip.classList.remove('border-slate-100', 'text-slate-500', 'bg-white'); }
            else { chip.classList.remove('active'); chip.classList.add('border-slate-100', 'text-slate-500', 'bg-white'); }
        });
    }
    applyManageSearch();
};

/**
 * Profile Dropdown
 */
function initializeProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const profileMenu = document.getElementById('profile-menu');
    const avatarInput = document.getElementById('avatarInput');

    if (!profileBtn || !profileMenu) return;
    loadAvatar();

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = profileMenu.classList.contains('hidden');
        if (isHidden) { profileMenu.classList.remove('hidden'); setTimeout(() => { profileMenu.classList.add('opacity-100', 'scale-100'); profileMenu.classList.remove('opacity-0', 'scale-95'); }, 10); }
        else closeProfileMenu();
    });

    if (avatarInput) {
        avatarInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) { showNotification('Please select an image file', 'error'); return; }
            const reader = new FileReader();
            reader.onload = function (event) { localStorage.setItem('userAvatar', event.target.result); updateAvatarUI(event.target.result); showNotification('Profile picture updated', 'success'); };
            reader.readAsDataURL(file);
        });
    }

    document.addEventListener('click', (e) => { if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) closeProfileMenu(); });

    function closeProfileMenu() {
        profileMenu.classList.add('opacity-0', 'scale-95'); profileMenu.classList.remove('opacity-100', 'scale-100');
        setTimeout(() => { profileMenu.classList.add('hidden'); }, 200);
    }
}

function loadAvatar() { const savedAvatar = localStorage.getItem('userAvatar'); if (savedAvatar) updateAvatarUI(savedAvatar); }

function updateAvatarUI(base64Image) {
    const userAvatar = document.getElementById('userAvatar');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const avatarContainer = document.getElementById('avatarContainer');
    if (userAvatar && avatarPlaceholder && avatarContainer) {
        userAvatar.src = base64Image; userAvatar.classList.remove('hidden'); avatarPlaceholder.classList.add('hidden'); avatarContainer.classList.remove('bg-blue-500');
    }
}

/**
 * Bulk Import Logic
 */
function openBulkImportModal() {
    const modal = document.getElementById('bulkImportModal');
    const content = document.getElementById('bulkImportModalContent');
    if (modal && content) {
        modal.classList.remove('hidden'); modal.classList.add('flex');
        document.getElementById('bulkImportStep1').classList.remove('hidden');
        document.getElementById('bulkImportStep2').classList.add('hidden');
        document.getElementById('csvFileInput').value = '';
        document.getElementById('selectedFileName').textContent = 'Choose CSV file';
        document.getElementById('startImportBtn').disabled = true;
        setTimeout(() => { content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100'); }, 10);
    }
}

function closeBulkImportModal() {
    const modal = document.getElementById('bulkImportModal');
    const content = document.getElementById('bulkImportModalContent');
    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100'); content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
    }
}

function handleFileSelection(event) {
    const file = event.target.files[0];
    const fileNameElement = document.getElementById('selectedFileName');
    const startBtn = document.getElementById('startImportBtn');
    if (file) {
        if (!file.name.endsWith('.csv')) { showNotification('Please select a valid CSV file', 'error'); event.target.value = ''; fileNameElement.textContent = 'Choose CSV file'; startBtn.disabled = true; return; }
        fileNameElement.textContent = file.name; startBtn.disabled = false;
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
        loader.classList.remove('hidden'); startBtn.disabled = true;
        const response = await fetch('/api/admin/staff/bulk-import', { method: 'POST', body: formData });
        if (response.ok) { const result = await response.json(); showResults(result); loadUsers(0); }
        else throw new Error('Failed to process bulk import');
    } catch (error) { console.error('Bulk Import Error:', error); showNotification(error.message, 'error'); startBtn.disabled = false; loader.classList.add('hidden'); }
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
        errorTable.innerHTML = result.errors.map(err => `<tr><td class="px-3 py-2 font-black text-slate-700">${err.rowNumber}</td><td class="px-3 py-2 text-slate-600">${escapeHtml(err.identifier)}</td><td class="px-3 py-2 text-rose-500 font-medium">${escapeHtml(err.errorMessage)}</td></tr>`).join('');
    } else errorContainer.classList.add('hidden');
}

function downloadCsvTemplate() {
    const blob = new Blob(["username,email,role\njohn_doe,john@example.com,PEDAGOG\n"], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', ''); a.setAttribute('href', url); a.setAttribute('download', 'staff_import_template.csv');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

window.openBulkImportModal = openBulkImportModal;
window.closeBulkImportModal = closeBulkImportModal;
window.handleFileSelection = handleFileSelection;
window.startImport = startImport;
window.downloadCsvTemplate = downloadCsvTemplate;

/**
 * Scheduling Grid
 */
const SCHED_API = '/api/admin/academic-years';
let _allAcademicYears = [];

async function loadScheduleGrid() {
    const body = document.getElementById('scheduleGridBody');
    if (!body) return;
    body.innerHTML = `<tr><td colspan="6" class="px-4 py-10 text-center text-slate-500"><div class="flex flex-col items-center gap-2"><div class="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><span>Loading schedules...</span></div></td></tr>`;
    try {
        const yearsResp = await fetch(SCHED_API);
        if (!yearsResp.ok) throw new Error('Failed to fetch academic years');
        const years = await yearsResp.json();
        _allAcademicYears = years || [];
        const schedPromises = years.map(y => fetch(`${SCHED_API}/${y.id}/schedules`).then(r => r.ok ? r.json() : []));
        const schedArrays = await Promise.all(schedPromises);
        renderScheduleGrid(schedArrays.flat());
    } catch (err) {
        console.error('Error loading schedule grid:', err);
        body.innerHTML = `<tr><td colspan="6" class="px-4 py-10 text-center text-red-500">Failed to load schedules. <button onclick="loadScheduleGrid()" class="underline font-semibold">Retry</button></td></tr>`;
    }
}

function renderScheduleGrid(schedules) {
    const body = document.getElementById('scheduleGridBody');
    if (!body) return;
    if (!schedules || schedules.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">No scoped schedules yet. Click "Add Schedule" to create one.</td></tr>`;
        return;
    }
    const statusColors = { ACTIVE: 'bg-emerald-100 text-emerald-700', SUSPENDED: 'bg-amber-100 text-amber-700', CLOSED: 'bg-slate-100 text-slate-500' };
    body.innerHTML = schedules.map(s => `
        <tr class="hover:bg-slate-50/70 transition-colors">
            <td class="px-4 py-3 text-sm font-medium text-slate-800">${escapeHtml(s.academicYearName || '')}</td>
            <td class="px-4 py-3 text-sm text-slate-600">${escapeHtml(s.scopeLabel || 'Default')}</td>
            <td class="px-4 py-3 text-sm text-slate-600">${s.startDate || '—'}</td>
            <td class="px-4 py-3 text-sm text-slate-600">${s.endDate || '—'}</td>
            <td class="px-4 py-3 text-center"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[s.status] || 'bg-slate-100 text-slate-500'}">${s.status}</span></td>
            <td class="px-4 py-3 text-right">${buildScheduleActions(s)}</td>
        </tr>`).join('');
}

function buildScheduleActions(s) {
    const id = s.id; const status = s.status; let btns = [];
    if (status !== 'ACTIVE') btns.push(`<button onclick="scheduleAction(${id},'activate')" class="px-2.5 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all">Activate</button>`);
    if (status === 'ACTIVE') { btns.push(`<button onclick="scheduleAction(${id},'suspend')" class="px-2.5 py-1 text-xs font-semibold bg-amber-400 hover:bg-amber-500 text-white rounded-lg transition-all">Suspend</button>`); btns.push(`<button onclick="scheduleAction(${id},'close')" class="px-2.5 py-1 text-xs font-semibold bg-slate-400 hover:bg-slate-500 text-white rounded-lg transition-all">Close</button>`); }
    if (status !== 'ACTIVE') btns.push(`<button onclick="scheduleAction(${id},'delete')" class="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>`);
    return `<div class="flex items-center justify-end gap-1">${btns.join('')}</div>`;
}

async function scheduleAction(id, action) {
    if (action === 'delete' && !confirm('Delete this schedule?')) return;
    try {
        const url = action === 'delete' ? `${SCHED_API}/schedules/${id}` : `${SCHED_API}/schedules/${id}/${action}`;
        const method = action === 'delete' ? 'DELETE' : 'PUT';
        const resp = await fetch(url, { method });
        if (!resp.ok) throw new Error(await resp.text() || `Failed to ${action}`);
        showNotification(`Schedule ${action}d successfully`, 'success');
        loadScheduleGrid();
    } catch (err) { console.error(err); showNotification(err.message || `Error: ${action} failed`, 'error'); }
}

function openAddScheduleModal() {
    const modal = document.getElementById('addScheduleModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('schedErrorMsg').classList.add('hidden');
        document.getElementById('schedAcademicYearName').value = '';
        document.getElementById('schedScopeType').value = 'default';
        document.getElementById('schedStartDate').value = '';
        document.getElementById('schedEndDate').value = '';
        document.querySelectorAll('input[name="schedDirectCycleIds"]').forEach(el => el.checked = false);
        handleSchedScopeChange();
    }
}

function closeAddScheduleModal() { const modal = document.getElementById('addScheduleModal'); if (modal) modal.style.display = 'none'; }

function handleSchedScopeChange() {
    const scope = document.getElementById('schedScopeType').value;
    document.getElementById('schedCycleDirectStep').classList.toggle('hidden', scope !== 'cycle_direct');
    document.getElementById('schedCycleStep').classList.toggle('hidden', scope !== 'cycle');
    document.getElementById('schedDeptStep').classList.toggle('hidden', scope !== 'department');
    document.getElementById('schedSpecStep').classList.toggle('hidden', scope !== 'speciality');
}

async function handleCycleSelectionChange() {
    const cycleId = document.getElementById('schedCycleSelector').value;
    const wrapper = document.getElementById('schedDeptListWrapper');
    const container = document.getElementById('schedDeptCheckboxes');
    if (!cycleId) { wrapper.classList.add('hidden'); return; }
    try {
        const resp = await fetch(`/admin/departments/by-cycle/${cycleId}`);
        if (!resp.ok) throw new Error();
        const depts = await resp.json();
        container.innerHTML = depts.map(d => `<div class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all cursor-pointer"><input type="checkbox" name="schedDeptIds" value="${d.departmentId}" id="sd_${d.departmentId}" class="rounded text-[#00B0FF]"><label for="sd_${d.departmentId}" class="text-xs font-bold text-slate-700 cursor-pointer truncate">${d.name}</label></div>`).join('');
        wrapper.classList.remove('hidden');
    } catch { showNotification("Error loading departments", "error"); }
}

async function handleDeptSelectionChange() {
    const deptId = document.getElementById('schedDeptSelector').value;
    const wrapper = document.getElementById('schedSpecListWrapper');
    const container = document.getElementById('schedSpecCheckboxes');
    if (!deptId) { if (wrapper) wrapper.classList.add('hidden'); return; }
    try {
        const resp = await fetch(`/admin/specialities/by-department/${deptId}`);
        if (!resp.ok) throw new Error();
        const specs = await resp.json();
        if (container) container.innerHTML = specs.map(s => `<div class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all cursor-pointer"><input type="checkbox" name="schedSpecIds" value="${s.specialityId}" id="ss_${s.specialityId}" class="rounded text-[#00B0FF]"><label for="ss_${s.specialityId}" class="text-xs font-bold text-slate-700 cursor-pointer truncate">${s.name}</label></div>`).join('');
        if (wrapper) wrapper.classList.remove('hidden');
    } catch { showNotification("Error loading specialities", "error"); }
}

async function handleSpecSelectionChange() {
    const specId = document.getElementById('schedSpecSelector').value;
    const wrapper = document.getElementById('schedClassBySpecListWrapper');
    const container = document.getElementById('schedClassBySpecCheckboxes');
    if (!specId) { if (wrapper) wrapper.classList.add('hidden'); return; }
    try {
        const resp = await fetch(`/admin/classrooms/by-speciality/${specId}`);
        if (!resp.ok) throw new Error();
        const classes = await resp.json();
        if (container) container.innerHTML = classes.map(c => `<div class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all cursor-pointer"><input type="checkbox" name="schedClassIds" value="${c.classId}" id="scs_${c.classId}" class="rounded text-[#00B0FF]"><label for="scs_${c.classId}" class="text-xs font-bold text-slate-700 cursor-pointer truncate">${c.name}</label></div>`).join('');
        if (wrapper) wrapper.classList.remove('hidden');
    } catch { showNotification("Error loading classrooms", "error"); }
}

async function saveSchedule() {
    const yearName = document.getElementById('schedAcademicYearName')?.value.trim();
    const scope = document.getElementById('schedScopeType')?.value;
    const startDate = document.getElementById('schedStartDate')?.value;
    const endDate = document.getElementById('schedEndDate')?.value;
    const errEl = document.getElementById('schedErrorMsg');
    const errTxt = document.getElementById('schedErrorText');

    if (!yearName || !startDate || !endDate) { errTxt.textContent = 'Academic Year and dates are required.'; errEl.classList.remove('hidden'); return; }
    if (startDate >= endDate) { errTxt.textContent = 'Start date must be before end date.'; errEl.classList.remove('hidden'); return; }

    const basePayload = { academicYearName: yearName, startDate, endDate };
    let payloads = [];

    if (scope === 'cycle_direct') {
        const checkedCycles = Array.from(document.querySelectorAll('input[name="schedDirectCycleIds"]:checked')).map(el => parseInt(el.value));
        if (checkedCycles.length === 0) { errTxt.textContent = 'Please select at least one cycle.'; errEl.classList.remove('hidden'); return; }
        checkedCycles.forEach(id => payloads.push({ ...basePayload, cycleId: id }));
    } else if (scope === 'cycle') {
        const checkedDepts = Array.from(document.querySelectorAll('input[name="schedDeptIds"]:checked')).map(el => parseInt(el.value));
        if (checkedDepts.length === 0) { errTxt.textContent = 'Please select at least one department.'; errEl.classList.remove('hidden'); return; }
        checkedDepts.forEach(id => payloads.push({ ...basePayload, departmentId: id }));
    } else if (scope === 'department') {
        const checkedSpecs = Array.from(document.querySelectorAll('input[name="schedSpecIds"]:checked')).map(el => parseInt(el.value));
        if (checkedSpecs.length === 0) { errTxt.textContent = 'Please select at least one speciality.'; errEl.classList.remove('hidden'); return; }
        checkedSpecs.forEach(id => payloads.push({ ...basePayload, specialityId: id }));
    } else if (scope === 'speciality') {
        const checkedClasses = Array.from(document.querySelectorAll('input[name="schedClassIds"]:checked')).map(el => parseInt(el.value));
        if (checkedClasses.length === 0) { errTxt.textContent = 'Please select at least one classroom.'; errEl.classList.remove('hidden'); return; }
        checkedClasses.forEach(id => payloads.push({ ...basePayload, classroomId: id }));
    } else {
        payloads.push(basePayload);
    }

    try {
        errEl.classList.add('hidden');
        await Promise.all(payloads.map(p => fetch(`${SCHED_API}/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(async r => { if (!r.ok) throw new Error(await r.text() || 'Failed'); return r.json(); })));
        showNotification(`${payloads.length} schedule(s) configured successfully`, 'success');
        closeAddScheduleModal();
        loadScheduleGrid();
    } catch (err) { console.error('Error saving schedule:', err); errTxt.textContent = err.message || 'Failed to create schedule'; errEl.classList.remove('hidden'); }
}

document.addEventListener('DOMContentLoaded', function () {
    const ayNavItem = document.querySelector('[data-section="academic-year"]');
    if (ayNavItem) ayNavItem.addEventListener('click', function () { setTimeout(loadScheduleGrid, 200); });
});

window.openAddScheduleModal = openAddScheduleModal;
window.closeAddScheduleModal = closeAddScheduleModal;
window.handleSchedScopeChange = handleSchedScopeChange;
window.handleCycleSelectionChange = handleCycleSelectionChange;
window.handleDeptSelectionChange = handleDeptSelectionChange;
window.handleSpecSelectionChange = handleSpecSelectionChange;
window.saveSchedule = saveSchedule;
window.scheduleAction = scheduleAction;
window.loadScheduleGrid = loadScheduleGrid;
window.handleOverridePermission = handleOverridePermission;
window.handleClearOverrides = handleClearOverrides;
window.handleToggleStatus = handleToggleStatus;
window.handleResetPassword = handleResetPassword;
window.handleDeleteUser = handleDeleteUser;
window.toggleUserDropdown = toggleUserDropdown;
window.setRoleFilter = setRoleFilter;
window.handleUpdateUserRole = handleUpdateUserRole;
window.handlePermissionCycle = handlePermissionCycle;

console.log('Admin Dashboard fully loaded');