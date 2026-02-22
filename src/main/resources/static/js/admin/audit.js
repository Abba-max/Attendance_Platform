let auditLogs = [];
let currentPage = 1;
const logsPerPage = 8;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    // Only initialize if the audit section exists (to avoid errors on other pages)
    if (document.getElementById('section-audit')) {
        initializeSearch();
        loadAuditLogs(0); // Start with first page
    }
});

// Load audit logs from API
async function loadAuditLogs(page = 0) {
    const tbody = document.getElementById('auditLogsTableBody');
    if (!tbody) return;

    if (page === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-2">
                        <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span class="text-slate-500 font-medium italic">Synchronizing logs...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    const keyword = document.getElementById('auditSearchInput')?.value || '';
    const severity = document.getElementById('auditSeverityFilter')?.value || '';

    try {
        const url = new URL('/api/audit-logs', window.location.origin);
        url.searchParams.append('page', page);
        url.searchParams.append('size', 10);
        if (keyword) url.searchParams.append('keyword', keyword);
        if (severity) url.searchParams.append('severity', severity);

        const response = await fetch(url);
        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        renderAuditLogs(data);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-red-500 font-medium">
                    Failed to load audit logs. Please check your connection.
                </td>
            </tr>
        `;
    }
}

// Render audit logs table
function renderAuditLogs(data) {
    const { logs, currentPage, totalPages, totalElements, pageSize } = data;
    const tbody = document.getElementById('auditLogsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                    <svg class="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="text-sm font-semibold uppercase tracking-widest">No matching logs found</p>
                </td>
            </tr>
        `;
        updatePaginationInfo(0, 0, 0);
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors group';

        const severityColor = getSeverityColor(log.severity);
        const categoryLabel = getCategoryLabel(log.category);

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-700">${formatTimestamp(log.timestamp).split(' ')[0]}</span>
                    <span class="text-[10px] font-bold text-slate-400">${formatTimestamp(log.timestamp).split(' ')[1]}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                        ${escapeHtml(log.username || 'SYS').substring(0, 2).toUpperCase()}
                    </div>
                    <div class="flex flex-col">
                        <span class="text-sm font-bold text-slate-800">${escapeHtml(log.username || 'System')}</span>
                        <span class="text-[10px] font-black text-blue-500 uppercase tracking-tighter">${escapeHtml(log.userRole || 'ANONYMOUS')}</span>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm font-medium text-slate-600">${escapeHtml(log.action)}</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm text-slate-500 italic">${escapeHtml(log.target || 'N/A')}</span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 bg-slate-100 text-[10px] font-black text-slate-500 rounded uppercase">${escapeHtml(categoryLabel)}</span>
                    <span class="w-2 h-2 rounded-full ${severityColor}" title="${log.severity}"></span>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Update pagination
    const start = currentPage * pageSize + 1;
    const end = Math.min(start + logs.length - 1, totalElements);
    updatePaginationInfo(start, end, totalElements);
    renderPagination(currentPage, totalPages);
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

// Helpers for severity and category labels
function getSeverityColor(severity) {
    switch (severity?.toUpperCase()) {
        case 'ERROR': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
        case 'WARNING': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
        case 'INFO': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
        default: return 'bg-slate-300';
    }
}

function getCategoryLabel(category) {
    return category || 'SYSTEM';
}

/**
 * Format timestamp to DD/MM/YYYY HH:MM
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Update pagination information
function updatePaginationInfo(start, end, total) {
    document.getElementById('auditEntriesStart').textContent = start;
    document.getElementById('auditEntriesEnd').textContent = end;
    document.getElementById('auditTotalEntries').textContent = total;
}

// Render pagination buttons
function renderPagination(currentPage, totalPages) {
    const pageNumbersContainer = document.getElementById('auditPageNumbers');
    const prevBtn = document.getElementById('auditPrevBtn');
    const nextBtn = document.getElementById('auditNextBtn');

    if (!pageNumbersContainer) return;

    pageNumbersContainer.innerHTML = '';

    // Disable/enable prev/next buttons
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1 || totalPages === 0;

    prevBtn.onclick = () => loadAuditLogs(currentPage - 1);
    nextBtn.onclick = () => loadAuditLogs(currentPage + 1);

    // Create page number buttons
    for (let i = 0; i < totalPages; i++) {
        if (i === 0 || i === totalPages - 1 || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const button = document.createElement('button');
            button.textContent = i + 1;
            button.className = `w-8 h-8 flex items-center justify-center rounded-lg transition-all ${i === currentPage
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`;
            button.onclick = () => loadAuditLogs(i);
            pageNumbersContainer.appendChild(button);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'w-8 text-center text-slate-300';
            pageNumbersContainer.appendChild(ellipsis);
        }
    }
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('auditSearchInput');
    const severityFilter = document.getElementById('auditSeverityFilter');

    let debounceTimer;

    const performSearch = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            loadAuditLogs(0);
        }, 500);
    };

    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }

    if (severityFilter) {
        severityFilter.addEventListener('change', () => loadAuditLogs(0));
    }
}

function exportAuditLogs() {
    window.location.href = '/api/audit-logs/export';
}

function refreshAuditLogs() {
    loadAuditLogs(0);
}

// Keep global app reference
window.auditApp = {
    loadAuditLogs,
    exportAuditLogs,
    refreshAuditLogs
};
