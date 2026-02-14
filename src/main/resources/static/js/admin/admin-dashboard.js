// Dashboard JavaScript - Dynamic Data Loading
// Attendee Administrator Dashboard

// Configuration
const API_BASE_URL = '/api/dashboard';
const REFRESH_INTERVAL = 30000; // 30 seconds
let refreshTimer = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing...');

    // Initialize all components
    initializeDashboard();
    initializeSidebar();
    initializeNavigation();
    initializeMobileMenu();

    // Load initial data
    loadDashboardData();

    // Set up auto-refresh
    setupAutoRefresh();
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
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapseBtn');

    if (collapseBtn) {
        collapseBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');

            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
            updateCollapseButtonIcon(isCollapsed);
        });

        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
            updateCollapseButtonIcon(true);
        }
    }
}

/**
 * Update Collapse Button Icon
 */
function updateCollapseButtonIcon(isCollapsed) {
    const collapseBtn = document.getElementById('collapseBtn');
    const svg = collapseBtn.querySelector('svg');

    if (isCollapsed) {
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>';
    } else {
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>';
    }
}

/**
 * Initialize Navigation
 */
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
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

        header.querySelector('div').insertBefore(menuToggle, header.querySelector('div > div:last-child'));

        menuToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('mobile-open');

            let overlay = document.getElementById('sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-40';
                overlay.style.display = 'none';
                document.body.appendChild(overlay);

                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('mobile-open');
                    this.style.display = 'none';
                });
            }

            overlay.style.display = sidebar.classList.contains('mobile-open') ? 'block' : 'none';
        });
    }

    window.addEventListener('resize', function() {
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

// Export functions for global access
window.dashboardFunctions = {
    refreshDashboard,
    toggleTheme,
    showNotification,
    loadDashboardData
};

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});

console.log('Dashboard script loaded successfully - Dynamic version');