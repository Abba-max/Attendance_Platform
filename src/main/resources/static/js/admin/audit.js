let auditLogs = [];
let currentPage = 1;
const logsPerPage = 8;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadAuditLogs();
    initializeSearch();
});

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => {
                l.classList.remove('bg-cyan-500', 'text-white');
                l.classList.add('text-gray-700', 'hover:bg-gray-100');
            });

            // Add active class to clicked link
            this.classList.add('bg-cyan-500', 'text-white');
            this.classList.remove('text-gray-700', 'hover:bg-gray-100');

            // Get the page to display
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
}

// Show specific page content
function showPage(pageName) {
    // Hide all pages
    const allPages = document.querySelectorAll('.page-content');
    allPages.forEach(page => page.classList.add('hidden'));

    // Show selected page
    const selectedPage = document.getElementById(`${pageName}-page`);
    if (selectedPage) {
        selectedPage.classList.remove('hidden');
    }

    // Update page title based on selected page
    const titles = {
        'dashboard': 'Dashboard Overview',
        'institutions': 'Manage Institutions',
        'access': 'Manage Access',
        'security': 'Security & Statistics',
        'audit': 'Audit Logs',
        'settings': 'System Settings'
    };

    const pageTitle = document.getElementById('page-title');
    if (pageTitle && titles[pageName]) {
        pageTitle.textContent = `Attendee • ${titles[pageName]}`;
    }
}

// Load audit logs (simulated data - replace with actual API call)
function loadAuditLogs() {
    auditLogs = [];
    renderAuditLogs();
}

// Render audit logs table
function renderAuditLogs() {
    const tbody = document.getElementById('auditLogsTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (auditLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="text-lg font-medium">No audit logs available</p>
                    <p class="text-sm mt-2">Audit logs will appear here when system activities occur</p>
                </td>
            </tr>
        `;
        updatePaginationInfo(0, 0, 0);
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = Math.min(startIndex + logsPerPage, auditLogs.length);
    const currentLogs = auditLogs.slice(startIndex, endIndex);

    // Render logs
    currentLogs.forEach(log => {
        const row = createLogRow(log);
        tbody.appendChild(row);
    });

    // Update pagination
    updatePaginationInfo(startIndex + 1, endIndex, auditLogs.length);
    renderPagination();
}

// Create a table row for a log entry
function createLogRow(log) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 transition-colors';

    // Timestamp with status indicator
    const statusColor = getStatusColor(log.severity);
    const timestampCell = `
        <td class="px-6 py-4">
            <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full ${statusColor}"></div>
                <span class="text-sm text-gray-900">${formatTimestamp(log.timestamp)}</span>
            </div>
        </td>
    `;

    // User cell
    const userCell = `
        <td class="px-6 py-4">
            <div class="text-sm font-medium text-gray-900">${log.userName}</div>
            <div class="text-sm text-gray-500">${log.userRole}</div>
        </td>
    `;

    // Action cell
    const actionCell = `
        <td class="px-6 py-4">
            <div class="text-sm text-gray-900">${log.action}</div>
        </td>
    `;

    // Target cell
    const targetCell = `
        <td class="px-6 py-4">
            <div class="text-sm text-gray-900">${log.target}</div>
        </td>
    `;

    // Category badge
    const categoryBadge = getCategoryBadge(log.category);
    const categoryCell = `
        <td class="px-6 py-4">
            ${categoryBadge}
        </td>
    `;

    // IP Address
    const ipCell = `
        <td class="px-6 py-4">
            <span class="text-sm font-mono text-gray-900">${log.ipAddress}</span>
        </td>
    `;

    tr.innerHTML = timestampCell + userCell + actionCell + targetCell + categoryCell + ipCell;
    return tr;
}

// Get status indicator color based on severity
function getStatusColor(severity) {
    const colors = {
        'info': 'bg-blue-500',
        'warning': 'bg-yellow-500',
        'error': 'bg-red-500',
        'success': 'bg-green-500'
    };
    return colors[severity] || 'bg-gray-500';
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Get category badge HTML
function getCategoryBadge(category) {
    const badges = {
        'institution': '<span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/></svg> institution</span>',
        'security': '<span class="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> security</span>',
        'access': '<span class="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg> access</span>',
        'system': '<span class="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg> system</span>'
    };
    return badges[category] || `<span class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">${category}</span>`;
}

// Update pagination information
function updatePaginationInfo(start, end, total) {
    document.getElementById('entriesStart').textContent = start;
    document.getElementById('entriesEnd').textContent = end;
    document.getElementById('totalEntries').textContent = total;
}

// Render pagination buttons
function renderPagination() {
    const totalPages = Math.ceil(auditLogs.length / logsPerPage);
    const pageNumbersContainer = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!pageNumbersContainer) return;

    pageNumbersContainer.innerHTML = '';

    // Disable/enable prev/next buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;

    // Create page number buttons
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const button = document.createElement('button');
            button.textContent = i;
            button.className = `px-4 py-2 rounded-lg transition-colors ${
                i === currentPage
                    ? 'bg-cyan-500 text-white'
                    : 'border border-gray-300 hover:bg-gray-100'
            }`;
            button.addEventListener('click', () => {
                currentPage = i;
                renderAuditLogs();
            });
            pageNumbersContainer.appendChild(button);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'px-2 text-gray-500';
            pageNumbersContainer.appendChild(ellipsis);
        }
    }

    // Add event listeners to prev/next buttons
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderAuditLogs();
        }
    };

    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderAuditLogs();
        }
    };
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();

        // This would typically filter the auditLogs array
        // For now, it's just a placeholder
        console.log('Searching for:', searchTerm);

        // Example search implementation:
        // const filtered = auditLogs.filter(log =>
        //     log.userName.toLowerCase().includes(searchTerm) ||
        //     log.action.toLowerCase().includes(searchTerm) ||
        //     log.target.toLowerCase().includes(searchTerm)
        // );
        // auditLogs = filtered;
        // currentPage = 1;
        // renderAuditLogs();
    });
}

// Function to add a new log entry (can be called from backend)
function addLogEntry(log) {
    auditLogs.unshift(log); // Add to beginning
    renderAuditLogs();
}

// Function to fetch logs from backend
async function fetchAuditLogs() {
    try {
        const response = await fetch('/api/audit-logs');
        const data = await response.json();
        auditLogs = data;
        renderAuditLogs();
    } catch (error) {
        console.error('Error fetching audit logs:', error);
    }
}

// Export functions for use in other modules
window.dashboardApp = {
    addLogEntry,
    fetchAuditLogs,
    showPage
};
