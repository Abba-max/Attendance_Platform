/**
 * Teacher Dashboard — Roll Call Engine (Aligned with Pedagog UI)
 * Handles: multi-section navigation, schedule loading, session filtering,
 *          start/end flow, QR/PIN generation, and manual roll call marking.
 */

// ── State ─────────────────────────────────────────────────────────────────
let allSessions      = [];   // full list from API
let filteredSessions = [];   // after week/classroom filter
let activeSessionId  = null;
let activeSession    = null;
let stompClient      = null;
let qrTimer          = 30;
let qrInterval       = null;
let activePin        = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────
function initDashboard() {
    if (window.dashboardInitialized) return;
    window.dashboardInitialized = true;
    loadSessions();
    setInterval(loadSessions, 300000); // refresh every 5 min
    
    // Initial section from URL hash or default to dashboard
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// ── Navigation ───────────────────────────────────────────────────────────
window.navigateTo = function(section) {
    // Update Sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'bg-[#00B0FF]', 'text-white');
        item.classList.add('text-gray-700');
        if (item.getAttribute('data-section') === section) {
            item.classList.add('active', 'bg-[#00B0FF]', 'text-white');
            item.classList.remove('text-gray-700');
        }
    });

    // Update Sections
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('section-' + section);
    if (target) target.classList.remove('hidden');

    window.location.hash = section;
    
    // Auto-load if needed
    if (section === 'schedule' && allSessions.length === 0) loadSessions();
};

// ── 1. Load & Render Schedule ──────────────────────────────────────────────

async function loadSessions() {
    const grid = document.getElementById('sessions-grid');
    if (!grid) return;

    if (!allSessions.length) {
        grid.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <div class="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p class="text-slate-400 font-bold font-display italic">Syncing your schedule...</p>
            </div>`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const res = await fetch('/api/teacher/sessions/my-schedule', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allSessions = await res.json();

        populateFilters();
        applyFilters();

    } catch (err) {
        clearTimeout(timeoutId);
        console.error('[Teacher] schedule load error:', err);
        grid.innerHTML = `
            <div class="col-span-full py-16 text-center">
                <p class="text-rose-500 font-black text-sm mb-2">Could not load schedule.</p>
                <p class="text-slate-400 text-xs font-bold">${err.message}</p>
                <button onclick="loadSessions()" class="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-100 transition">Retry</button>
            </div>`;
    }
}

// ── 2. Filters ─────────────────────────────────────────────────────────────

function populateFilters() {
    const weekSet  = new Set();
    const classSet = new Map();

    allSessions.forEach(s => {
        if (s.week != null) weekSet.add(s.week);
        if (s.classroomId && s.classroomName) classSet.set(s.classroomId, s.classroomName);
    });

    const todayWeek = getISOWeek(new Date());
    const hasToday  = weekSet.has(todayWeek);

    const weekSel  = document.getElementById('filter-week');
    const classSel = document.getElementById('filter-classroom');
    if (!weekSel || !classSel) return;

    const savedWeek = weekSel.value;
    const savedClass = classSel.value;

    weekSel.innerHTML = '<option value="">All Weeks</option>';
    [...weekSet].sort((a, b) => a - b).forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = `Week ${w}`;
        if (w == savedWeek || (!savedWeek && w === todayWeek && hasToday)) opt.selected = true;
        weekSel.appendChild(opt);
    });

    classSel.innerHTML = '<option value="">All Classrooms</option>';
    classSet.forEach((name, id) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        if (id == savedClass) opt.selected = true;
        classSel.appendChild(opt);
    });
}

window.applyFilters = function () {
    const weekVal  = document.getElementById('filter-week')?.value;
    const classVal = document.getElementById('filter-classroom')?.value;
    const statusVal = document.getElementById('filter-status')?.value;

    filteredSessions = allSessions.filter(s => {
        const weekMatch   = !weekVal   || String(s.week)        === weekVal;
        const classMatch  = !classVal  || String(s.classroomId) === classVal;
        const statusMatch = !statusVal || String(s.status)      === statusVal;
        return weekMatch && classMatch && statusMatch;
    });

    renderGrid();
};

// ── 3. Render Session Grid ─────────────────────────────────────────────────

function renderGrid() {
    const grid = document.getElementById('sessions-grid');
    if (!grid) return;

    if (!allSessions.length) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 font-bold italic">No sessions found.</div>`;
        updateOverview(null, 0);
        return;
    }

    if (!filteredSessions.length) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50"><p class="text-slate-500 font-bold italic">No matches for this filter.</p></div>`;
        updateOverview(null, 0);
        return;
    }

    const sorted = [...filteredSessions].sort((a, b) => {
        const d = (a.date || '').localeCompare(b.date || '');
        return d !== 0 ? d : (a.startTime || '').localeCompare(b.startTime || '');
    });

    const next = sorted.find(s => s.status === 'IN_PROGRESS' || s.status === 'SCHEDULED') || sorted[0];
    const pending = sorted.filter(s => s.status === 'SCHEDULED').length;
    updateOverview(next, pending);

    grid.innerHTML = sorted.map(renderSessionCard).join('');
}

function updateOverview(next, pendingCount) {
    const name = document.getElementById('next-class-name');
    const time = document.getElementById('next-class-time');
    const room = document.getElementById('next-class-room');
    if (name) name.textContent = next?.courseName || 'No upcoming sessions';
    if (time) time.textContent = next?.startTime ? next.startTime.substring(0, 5) : '--:--';
    if (room) room.textContent = next?.classroomName || 'N/A';

    const countEl = document.getElementById('pending-attendance-count');
    if (countEl) countEl.textContent = String(pendingCount).padStart(2, '0');
}

function renderSessionCard(s) {
    const isActive = s.status === 'IN_PROGRESS';
    const isDone   = s.status === 'COMPLETED';
    const isValid  = s.isValidated === true;
    
    let statusLabel = s.status?.replace('_', ' ') || 'SCHEDULED';
    let statusColor = 'bg-emerald-50 text-emerald-600';
    
    if (isActive) {
        statusColor = 'bg-blue-100 text-blue-700';
    } else if (isDone) {
        statusColor = isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
        statusLabel = isValid ? 'VALIDATED' : 'CLOSED (PENDING)';
    }

    const dateStr = s.date ? new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : (s.day || 'TBD');

    return `
        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col ${isActive ? 'ring-2 ring-[#00B0FF] ring-offset-4' : ''}">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusColor}">${statusLabel}</span>
                    ${isValid ? `
                        <div class="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-sm" title="Attendance Validated">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    ` : ''}
                </div>
                <div class="flex items-center gap-2">
                    ${isDone ? `
                        <button onclick="viewAttendancePdf(${s.sessionId})" class="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 transition shadow-sm" title="View PDF">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                    ` : ''}
                    <span class="text-[10px] font-bold text-slate-400">${s.startTime?.substring(0, 5) || '--:--'}</span>
                </div>
            </div>
            <h4 class="text-base font-black text-slate-800 mb-2 truncate group-hover:text-blue-600 transition-colors">${s.courseName || 'Unnamed Course'}</h4>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${dateStr} • ${s.classroomName || 'No Room'}</p>
            
            ${!isDone ? `
                <button onclick="handleSessionAction(${s.sessionId})" class="mt-6 w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-[#00B0FF] text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 text-white hover:bg-black'}">
                    ${isActive ? 'Open Roll Call Hub' : 'Start Session'}
                </button>
            ` : (isValid ? `
                <div class="mt-6 flex gap-2">
                    <button onclick="viewAttendancePdf(${s.sessionId})" class="flex-1 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition">View PDF</button>
                    <button onclick="downloadAttendanceCsv(${s.sessionId})" class="flex-1 py-3 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition">Download CSV</button>
                </div>
            ` : `
                <button onclick="handleSessionAction(${s.sessionId})" class="mt-6 w-full py-3 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition shadow-lg shadow-amber-500/20">
                    Finalize Roll Call
                </button>
            `)}
        </div>`;
}

// ── 4. Session Lifecycle ───────────────────────────────────────────────────

window.handleSessionAction = async function (sessionId) {
    const session = allSessions.find(s => s.sessionId === sessionId);
    if (!session) return;

    if (session.status === 'SCHEDULED') {
        try {
            showNotification('Initializing session...', 'info');
            const res = await fetch(`/api/teacher/sessions/${sessionId}/start`, { method: 'POST' });
            if (!res.ok) throw new Error('Start failed');
            
            const updated = await res.json();
            const idx = allSessions.findIndex(s => s.sessionId === sessionId);
            if (idx !== -1) allSessions[idx] = { ...allSessions[idx], ...updated };
            
            renderGrid();
            openRollCall(sessionId);
        } catch (e) {
            showNotification('Failed to start session', 'error');
        }
    } else {
        openRollCall(sessionId);
    }
};

// ── 5. Roll Call Hub ─────────────────────────────────────────────────────

function openRollCall(sessionId) {
    activeSessionId = sessionId;
    activeSession   = allSessions.find(s => s.sessionId === sessionId);
    if (!activeSession) return;

    document.getElementById('att-course-name').textContent = activeSession.courseName || 'Session';
    document.getElementById('att-details').textContent = `${activeSession.classroomName || 'No Room'} • ${activeSession.startTime?.substring(0, 5) || '--'} – ${activeSession.endTime?.substring(0, 5) || '--'}`;

    // Show/Hide buttons based on status
    const btnSubmit = document.getElementById('btn-submit-rollcall');
    const btnConfirm = document.getElementById('btn-confirm-export');
    
    if (activeSession.status === 'COMPLETED') {
        btnSubmit?.classList.add('hidden');
        btnConfirm?.classList.remove('hidden');
    } else {
        btnSubmit?.classList.remove('hidden');
        btnConfirm?.classList.add('hidden');
    }

    // Switch to Attendance Section
    navigateTo('attendance');
    document.getElementById('hubEmptyState').classList.add('hidden');
    document.getElementById('hubWorkspace').classList.remove('hidden');

    loadRollCall(sessionId);
}

window.closeAttendance = function() {
    document.getElementById('hubWorkspace').classList.add('hidden');
    document.getElementById('hubEmptyState').classList.remove('hidden');
    navigateTo('schedule');
    activeSessionId = null;
    disconnectWebSocket();
    clearInterval(qrInterval);
};

async function loadRollCall(sessionId) {
    const tbody = document.getElementById('att-table-body');
    tbody.innerHTML = '<tr><td colspan="20" class="py-20 text-center text-slate-400 italic">Syncing roster...</td></tr>';

    try {
        const res = await fetch(`/api/attendance/session/${sessionId}/students`);
        if (!res.ok) throw new Error();
        const records = await res.json();
        renderAttendanceGrid(records);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="20" class="py-20 text-center text-rose-500 font-bold">Failed to load roster.</td></tr>';
    }
}

function renderAttendanceGrid(records) {
    const tbody = document.getElementById('att-table-body');
    const thead = document.getElementById('att-table-head');
    const totalHours = resolveHours(activeSession);

    // Dynamic Headers
    let headHtml = `<th class="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[250px]">Student Information</th>`;
    for (let i = 0; i < totalHours; i++) {
        headHtml += `<th class="px-4 py-4 text-center min-w-[70px] text-[10px] font-black text-slate-400 uppercase tracking-widest">H${i+1}</th>`;
    }
    thead.innerHTML = headHtml;

    tbody.innerHTML = records.map(r => {
        const initials = ((r.firstName||'')[0] || '') + ((r.lastName||'')[0] || '');
        let hoursHtml = '';
        for (let i = 0; i < totalHours; i++) {
            const slot = r.hourSlots?.find(h => h.hourIndex === i);
            const present = slot?.status === 'PRESENT' || slot?.status === 'LATE';
            hoursHtml += `
                <td class="px-4 py-4 text-center">
                    <div class="flex flex-col items-center gap-1.5">
                        <input type="checkbox" ${present ? 'checked' : ''} onchange="markHourStatus(${r.userId}, ${i}, this.checked)"
                               class="w-6 h-6 rounded-lg border-slate-200 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer transition-transform hover:scale-110 accent-emerald-500 slot-checkbox"
                               data-user-id="${r.userId}" data-hour="${i}">
                        <span class="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Hour ${i+1}</span>
                    </div>
                </td>`;
        }

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-50 student-row" data-student-id="${r.userId}">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">${initials || 'S'}</div>
                        <div>
                            <div class="text-sm font-black text-slate-800">${r.firstName} ${r.lastName}</div>
                            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${r.matricule || 'NO-MATRIC'}</div>
                        </div>
                    </div>
                </td>
                ${hoursHtml}
            </tr>`;
    }).join('');
}

// ── 6. Marking & Lifecycle ────────────────────────────────────────────────

function resolveHours(s) { 
    if (s.totalHours > 0) return s.totalHours;
    if (s.startTime && s.endTime) {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        return Math.max(1, Math.round((eh * 60 + em - sh * 60 - sm) / 60));
    }
    return 1;
}

window.markHourStatus = async (sid, hi, isP) => {
    const status = isP ? 'PRESENT' : 'ABSENT';
    try {
        await fetch(`/api/attendance/session/${activeSessionId}/student/${sid}/hour/${hi}?status=${status}`, { method: 'POST' });
        // Update checkbox directly for immediate feedback on Mark All if needed, but here it's already triggered by change
    } catch (e) {
        showNotification('Update failed', 'error');
        // Revert UI on failure
        const cb = document.querySelector(`.slot-checkbox[data-user-id="${sid}"][data-hour="${hi}"]`);
        if (cb) cb.checked = !isP;
    }
};

window.markAllSessionStatus = async (status) => {
    const confirmed = await ModernConfirm({
        title: `Mark All ${status === 'PRESENT' ? 'Present' : 'Absent'}?`,
        message: `This will update the status for everyone in this session to ${status.toLowerCase()}.`,
        confirmText: `Mark All ${status === 'PRESENT' ? 'Present' : 'Absent'}`,
        type: status === 'PRESENT' ? 'info' : 'warning'
    });
    if (!confirmed) return;
    try {
        await fetch(`/api/attendance/session/${activeSessionId}/mark-all?status=${status}`, { method: 'POST' });
        showNotification(`All students marked ${status.toLowerCase()}`, 'success');
        
        // Immediate UI Update for checkboxes
        const checkboxes = document.querySelectorAll('.slot-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = (status === 'PRESENT');
        });
    } catch (e) {
        showNotification('Bulk update failed', 'error');
        loadRollCall(activeSessionId);
    }
};

window.submitRollCall = async () => {
    const confirmed = await ModernConfirm({
        title: "Finalize Roll Call?",
        message: "This will end the session. Students who haven't checked in will be automatically marked as ABSENT.",
        confirmText: "End & Finalize",
        type: "warning"
    });
    if (!confirmed) return;
    try {
        const res = await fetch(`/api/teacher/sessions/${activeSessionId}/end`, { method: 'POST' });
        if (!res.ok) throw new Error();
        
        showNotification('Session completed! Please confirm and export the final sheet.', 'success');
        
        // Refresh local session state
        const updated = await res.json();
        const idx = allSessions.findIndex(s => s.sessionId === activeSessionId);
        if (idx !== -1) allSessions[idx] = { ...allSessions[idx], ...updated };
        activeSession = allSessions[idx];

        // Update Buttons
        document.getElementById('btn-submit-rollcall')?.classList.add('hidden');
        document.getElementById('btn-confirm-export')?.classList.remove('hidden');
        
        // Reload roll call to show auto-absences
        loadRollCall(activeSessionId);
    } catch (e) { showNotification('Failed to end session', 'error'); }
};

window.confirmAndExportAttendance = async () => {
    const confirmed = await ModernConfirm({
        title: "Submit Attendance Report?",
        message: "This will finalize the attendance sheet and broadcast the reports to the Pedagogic Assistant. This action is permanent.",
        confirmText: "Submit & Export",
        type: "info"
    });
    if (!confirmed) return;
    
    try {
        showNotification('Finalizing attendance...', 'info');
        const res = await fetch(`/api/teacher/sessions/${activeSessionId}/confirm-attendance`, { method: 'POST' });
        if (!res.ok) throw new Error();
        
        showNotification('Attendance confirmed and sent!', 'success');
        
        // Trigger Exports in parallel
        downloadAttendancePdf(activeSessionId);
        downloadAttendanceCsv(activeSessionId);
        
        closeAttendance();
        loadSessions();
    } catch (e) {
        showNotification('Confirmation failed', 'error');
    }
};

window.viewAttendancePdf = function(sessionId) {
    window.open(`/api/teacher/sessions/${sessionId}/export/pdf`, '_blank');
};

window.downloadAttendancePdf = function(sessionId) {
    const link = document.createElement('a');
    link.href = `/api/teacher/sessions/${sessionId}/export/pdf`;
    link.download = `Attendance_Session_${sessionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.downloadAttendanceCsv = function(sessionId) {
    const link = document.createElement('a');
    link.href = `/api/teacher/sessions/${sessionId}/export`;
    link.download = `Attendance_Session_${sessionId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ── 7. QR & PIN ───────────────────────────────────────────────────────────

window.generatePin = async function () {
    try {
        const res = await fetch('/api/attendance/session-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: activeSessionId, type: 'PIN' }) });
        const data = await res.json();
        document.getElementById('pin-display').textContent = data.token;
        showNotification(`New active PIN: ${data.token}`, 'success');
    } catch (e) { showNotification('Failed to generate PIN', 'error'); }
};

window.toggleQrView = function () {
    const overlay = document.getElementById('qr-overlay');
    const isOpen = !overlay.classList.contains('hidden');
    if (isOpen) { overlay.classList.add('hidden'); disconnectWebSocket(); clearInterval(qrInterval); }
    else { overlay.classList.remove('hidden'); connectWebSocket(); startQrTimer(); generateNewQr(); }
};

async function generateNewQr() {
    try {
        const res = await fetch('/api/attendance/session-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: activeSessionId, type: 'QR' }) });
        const data = await res.json();
        if (typeof QRCode !== 'undefined') {
            const ph = document.getElementById('qr-canvas-placeholder');
            ph.innerHTML = '<canvas id="qr-canvas" class="w-full h-full rounded-2xl"></canvas>';
            QRCode.toCanvas(document.getElementById('qr-canvas'), data.token, { width: 300, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } });
        }
    } catch (e) {}
}

// ── 8. Utility: Notifications (Pedagog Style) ──────────────────────────────

function showNotification(message, type = 'info') {
    const existing = document.getElementById('tt-toast');
    if (existing) existing.remove();

    const icons = {
        success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
        error:   `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
        info:    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/></svg>`
    };
    const palettes = {
        success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
        error:   { bg: '#FEF2F2', border: '#EF4444', text: '#7F1D1D' },
        info:    { bg: '#EFF6FF', border: '#3B82F6', text: '#1E3A5F' }
    };
    const p = palettes[type] || palettes.info;

    const toast = document.createElement('div');
    toast.id = 'tt-toast';
    toast.style.cssText = `position:fixed; top:80px; right:24px; z-index:9999; background:${p.bg}; border:1.5px solid ${p.border}; border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,0.1); padding:16px 20px; display:flex; align-items:center; gap:12px; transition: 0.35s ease; opacity:0; transform:translateX(20px);`;

    toast.innerHTML = `
        <span style="color:${p.border}">${icons[type]}</span>
        <div style="flex:1"><p style="margin:0; font-weight:700; font-size:13px; color:${p.text}">${message}</p></div>
        <button onclick="this.closest('#tt-toast').remove()" style="background:none; border:none; cursor:pointer; color:${p.border}">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>`;

    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 4000);
}

// ── WebSocket & Helpers ────────────────────────────────────────────────────

function connectWebSocket() {
    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') return;
    const socket = new SockJS('/ws'); stompClient = Stomp.over(socket); stompClient.debug = null;
    stompClient.connect({}, () => {
        stompClient.subscribe(`/topic/session/${activeSessionId}/qr`, msg => { generateNewQr(); resetQrTimer(); });
        stompClient.subscribe(`/topic/session/${activeSessionId}`, () => loadRollCall(activeSessionId));
    });
}
function disconnectWebSocket() { if (stompClient?.connected) stompClient.disconnect(); stompClient = null; }
function startQrTimer() {
    clearInterval(qrInterval); qrTimer = 30;
    qrInterval = setInterval(() => {
        qrTimer--;
        document.getElementById('qr-timer-text').textContent = qrTimer;
        document.getElementById('qr-timer-progress').style.width = `${(qrTimer/30)*100}%`;
        if (qrTimer <= 0) { generateNewQr(); qrTimer = 30; }
    }, 1000);
}
function resetQrTimer() { qrTimer = 30; }
// ── 9. Table Filtering ─────────────────────────────────────────────────────

window.filterByStatus = function(status, btn) {
    // 1. UI: Update button styles
    document.querySelectorAll('.status-filter-btn').forEach(b => {
        b.classList.remove('bg-blue-50', 'text-blue-600');
        b.classList.add('text-slate-400', 'hover:text-slate-800');
    });
    btn.classList.add('bg-blue-50', 'text-blue-600');
    btn.classList.remove('text-slate-400', 'hover:text-slate-800');

    // 2. Logic: Filter Table Rows
    const rows = document.querySelectorAll('.student-row');
    rows.forEach(row => {
        if (status === 'all') {
            row.classList.remove('hidden');
            return;
        }

        // We check checkboxes in each row to see status
        const checkboxes = row.querySelectorAll('.slot-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const anyChecked = Array.from(checkboxes).some(cb => cb.checked);

        if (status === 'absent') {
            // Row is "absent" if NONE of the checkboxes are checked
            if (!anyChecked) row.classList.remove('hidden');
            else row.classList.add('hidden');
        } else if (status === 'not-marked') {
            // Manual required if some are checked but not all? Or just if it's not fully present.
            // Let's define "Manual Required" as anyone who hasn't been marked at all (absent).
            if (!anyChecked) row.classList.remove('hidden');
            else row.classList.add('hidden');
        }
    });
};

function getISOWeek(d) {
    const d2 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d2.setUTCDate(d2.getUTCDate() + 4 - (d2.getUTCDay() || 7));
    return Math.ceil((((d2 - new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}
