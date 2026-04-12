/**
 * Teacher Dashboard — Roll Call Engine & Stats (Dieter Rams Flat UI Pattern)
 */

let allSessions = [];
let filteredSessions = [];
let activeSession = null;
let activeSessionId = null;
let attendanceData = [];
let nextSessionContext = null; // Stores the next session for quick-start
let stompClient = null;
let qrTimer = 30;
let qrInterval = null;

function initDashboard() {
    if (window.dashboardInitialized) return;
    window.dashboardInitialized = true;
    
    loadSessions();
    loadTeacherStats(); // Load stats dynamically
    
    setInterval(loadSessions, 300000); // 5m refresh
    
    // Initial Route
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

window.navigateTo = function(section) {
    // Desktop Nav States
    document.querySelectorAll('.nav-desktop').forEach(item => {
        item.classList.remove('active', 'text-slate-900', 'font-bold');
        item.classList.add('text-slate-500');
        if (item.getAttribute('data-section') === section) {
            item.classList.add('active', 'text-slate-900', 'font-bold');
            item.classList.remove('text-slate-500');
        }
    });

    // Mobile Nav States
    document.querySelectorAll('.nav-mobile').forEach(item => {
        item.classList.remove('active', 'text-slate-900', 'font-bold');
        item.classList.add('text-slate-500');
        if (item.getAttribute('data-section') === section) {
            item.classList.add('active', 'text-slate-900', 'font-bold');
            item.classList.remove('text-slate-500');
        }
    });

    // Section Toggling
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('section-' + section);
    if (target) target.classList.remove('hidden');

    window.location.hash = section;
};

// ── Schedule Core ────────────────────────────────────────────────────────
async function loadSessions() {
    const grid = document.getElementById('sessions-grid');
    if (!grid) return;
    
    if (!allSessions.length) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center"><p class="text-sm text-slate-500">Loading schedule...</p></div>`;
    }

    try {
        const res = await fetch('/api/teacher/sessions/my-schedule');
        if (!res.ok) throw new Error();
        allSessions = await res.json();
        
        populateFilters();
        applyFilters();
    } catch (e) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center"><p class="text-sm text-red-600">Failed to sync schedule.</p></div>`;
    }
}

function populateFilters() {
    const weekSet = new Set();
    const classSet = new Map();
    allSessions.forEach(s => {
        if (s.week != null) weekSet.add(s.week);
        if (s.classroomId && s.classroomName) classSet.set(s.classroomId, s.classroomName);
    });

    const weekSel = document.getElementById('filter-week');
    const classSel = document.getElementById('filter-classroom');
    if (!weekSel || !classSel) return;

    const savedWeek = weekSel.value;
    const savedClass = classSel.value;

    weekSel.innerHTML = '<option value="">All Weeks</option>';
    [...weekSet].sort((a, b) => a - b).forEach(w => {
        const val = String(w);
        weekSel.add(new Option(`Week ${w}`, val, false, val === savedWeek));
    });

    classSel.innerHTML = '<option value="">All Rooms</option>';
    classSet.forEach((name, id) => {
        classSel.add(new Option(name, String(id), false, String(id) === savedClass));
    });
}

window.applyFilters = function() {
    const w = document.getElementById('filter-week')?.value;
    const c = document.getElementById('filter-classroom')?.value;
    const s = document.getElementById('filter-status')?.value;

    filteredSessions = allSessions.filter(st => {
        const mw = !w || String(st.week) === w;
        const mc = !c || String(st.classroomId) === c;
        const ms = !s || String(st.status) === s;
        return mw && mc && ms;
    });

    renderGrid();
};

function renderGrid() {
    const grid = document.getElementById('sessions-grid');
    if (!grid) return;

    if (!filteredSessions.length) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center border border-dashed border-slate-200 rounded-xl"><p class="text-sm text-slate-500">No sessions match current filters.</p></div>`;
        updateOverview(null, 0);
        return;
    }

    const sorted = [...filteredSessions].sort((a,b) => (a.date||'').localeCompare(b.date||'') || (a.startTime||'').localeCompare(b.startTime||''));
    
    const next = sorted.find(s => s.status === 'IN_PROGRESS' || s.status === 'SCHEDULED') || sorted[0];
    const pending = sorted.filter(s => s.status === 'SCHEDULED').length;
    updateOverview(next, pending);

    grid.innerHTML = sorted.map(renderSessionCard).join('');
}

function updateOverview(next, pendingCount) {
    const titleEl = document.getElementById('next-class-name');
    const timeEl = document.getElementById('next-class-time');
    const roomEl = document.getElementById('next-class-room');
    const btnTake = document.getElementById('btn-take-attendance-overview');

    if (!next) {
        titleEl.textContent = 'None Scheduled';
        timeEl.textContent = '--:--';
        roomEl.textContent = 'No Room';
        btnTake?.classList.add('hidden');
        nextSessionContext = null;
    } else {
        titleEl.textContent = next.courseName || 'Unknown Course';
        timeEl.textContent = next.startTime?.substring(0,5) || '--:--';
        roomEl.textContent = next.classroomName || 'No Room';
        
        // Show button if session is live or scheduled
        btnTake?.classList.remove('hidden');
        nextSessionContext = next;
    }
    
    const countEl = document.getElementById('pending-attendance-count');
    if (countEl) countEl.textContent = String(pendingCount);
}

window.takeAttendanceFromOverview = function() {
    if (!nextSessionContext) return;
    window.handleSessionAction(nextSessionContext.sessionId);
};

function renderSessionCard(s) {
    const isActive = s.status === 'IN_PROGRESS';
    const isDone = s.status === 'COMPLETED';
    const isValid = s.isValidated === true;
    
    let statusLabel = s.status || 'SCHEDULED';
    let statusClasses = 'bg-slate-100 text-slate-500 border border-slate-200';
    
    if (isActive) {
        statusClasses = 'bg-blue-600 text-white shadow-md shadow-blue-500/20';
        statusLabel = 'LIVE NOW';
    } else if (isDone) {
        statusClasses = isValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200';
        statusLabel = isValid ? 'VALIDATED' : 'CLOSED';
    }

    const dateStr = s.date ? new Date(s.date).toLocaleDateString('en-GB', {weekday:'short', day:'2-digit', month:'short'}) : 'TBD';

    return `
        <div class="bg-white p-6 rounded-2xl border-2 ${isActive ? 'border-[#00B0FF] shadow-blue-500/10' : 'border-slate-100 hover:border-[#00B0FF]/30'} transition-all flex flex-col group relative overflow-hidden">
            ${isActive ? '<div class="absolute top-0 right-0 w-16 h-16 bg-[#00B0FF]/5 rounded-bl-full"></div>' : ''}
            <div class="flex items-center justify-between mb-4">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${statusClasses}">${statusLabel}</span>
                <span class="text-xs font-bold text-slate-400 font-mono">${s.startTime?.substring(0,5) || '--:--'}</span>
            </div>
            
            <h4 class="text-base font-black text-[#00B0FF] mb-1 truncate drop-shadow-sm">${s.courseName || 'Course'}</h4>
            <p class="text-xs font-bold text-slate-500 tracking-tight flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                ${s.classroomName || 'Room'} • ${dateStr}
            </p>
            
            <div class="mt-6 pt-5 border-t border-slate-50 mt-auto">
            ${!isDone ? `
                <button onclick="handleSessionAction(${s.sessionId})" class="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:-translate-y-0.5 shadow-sm ${isActive ? 'bg-[#00B0FF] text-white hover:bg-blue-600 shadow-blue-500/20' : 'bg-white border-2 border-[#00B0FF] text-[#00B0FF] hover:bg-blue-50'}">
                    ${isActive ? 'Manage Session' : 'Start Session'}
                </button>
            ` : (isValid ? `
                <div class="flex gap-2">
                    <button onclick="viewAttendancePdf(${s.sessionId})" class="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-[#00B0FF] border border-slate-200 rounded-xl text-xs font-black transition-all">PDF</button>
                    <button onclick="downloadAttendanceCsv(${s.sessionId})" class="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-[#00B0FF] border border-slate-200 rounded-xl text-xs font-black transition-all">CSV</button>
                </div>
            ` : `
                <button onclick="handleSessionAction(${s.sessionId})" class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                    Finalize Roll Call
                </button>
            `)}
            </div>
        </div>`;
}

// ── Roll Call Engine ──────────────────────────────────────────────────────
window.handleSessionAction = async function (sessionId) {
    const session = allSessions.find(s => s.sessionId === sessionId);
    if (!session) return;

    if (session.status === 'SCHEDULED') {
        try {
            showNotification('Initializing session...', 'info');
            const res = await fetch(`/api/teacher/sessions/${sessionId}/start`, { method: 'POST' });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            
            const idx = allSessions.findIndex(s => s.sessionId === sessionId);
            if (idx !== -1) allSessions[idx] = { ...allSessions[idx], ...updated };
            
            renderGrid();
            openRollCall(sessionId);
        } catch (e) {
            showNotification('Failed to start session.', 'error');
        }
    } else {
        openRollCall(sessionId);
    }
};

function openRollCall(sessionId) {
    activeSessionId = sessionId;
    activeSession = allSessions.find(s => s.sessionId === sessionId);
    
    document.getElementById('att-course-name').textContent = activeSession.courseName || 'Course';
    document.getElementById('att-details').textContent = `${activeSession.classroomName} • ${activeSession.startTime?.substring(0,5)} – ${activeSession.endTime?.substring(0,5)}`;

    const btnSub = document.getElementById('btn-submit-rollcall');
    const btnCon = document.getElementById('btn-confirm-export');
    
    if (activeSession.status === 'COMPLETED') {
        btnSub?.classList.add('hidden');
        btnCon?.classList.remove('hidden');
    } else {
        btnSub?.classList.remove('hidden');
        btnCon?.classList.add('hidden');
    }

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
};

async function loadRollCall(sessionId) {
    const tbody = document.getElementById('att-table-body');
    tbody.innerHTML = '<tr><td colspan="10" class="py-10 text-center text-slate-500 text-sm">Loading roster...</td></tr>';
    
    try {
        const res = await fetch(`/api/attendance/session/${sessionId}/students`);
        if (!res.ok) throw new Error();
        const records = await res.json();
        renderAttendanceGrid(records);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="10" class="py-10 text-center text-red-600 text-sm">Failed to load roster.</td></tr>';
    }
}

function resolveHours(s) { 
    if (s.totalHours > 0) return s.totalHours;
    if (s.startTime && s.endTime) {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        return Math.max(1, Math.round((eh * 60 + em - sh * 60 - sm) / 60));
    }
    return 1;
}

function renderAttendanceGrid(records) {
    const tbody = document.getElementById('att-table-body');
    const thead = document.getElementById('att-table-head');
    const totalHours = resolveHours(activeSession);

    let headHtml = `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] w-1/3">Student Name</th>`;
    for (let i = 0; i < totalHours; i++) {
        headHtml += `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] text-center">Hour ${i+1}</th>`;
    }
    thead.innerHTML = headHtml;

    tbody.innerHTML = records.map(r => {
        let hoursHtml = '';
        for (let i = 0; i < totalHours; i++) {
            const slot = r.hourSlots?.find(h => h.hourIndex === i);
            const isPresent = slot?.status === 'PRESENT' || slot?.status === 'LATE';
            hoursHtml += `
            <td class="px-4 py-3 text-center align-middle">
                <input type="checkbox" ${isPresent ? 'checked' : ''} onchange="markHourStatus(${r.userId}, ${i}, this.checked)"
                       class="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500 slot-checkbox"
                       data-user-id="${r.userId}">
            </td>`;
        }

        return `
            <tr class="student-row hover:bg-blue-50/30 transition-colors border-b border-slate-50 last:border-0" data-student-id="${r.userId}">
                <td class="px-5 py-4">
                    <div class="flex flex-col">
                        <span class="text-sm font-black text-slate-900">${r.firstName} ${r.lastName}</span>
                        <span class="text-[10px] font-bold text-slate-400 font-mono tracking-tight">${r.matricule || 'NO-MATRIC'}</span>
                    </div>
                </td>
                ${hoursHtml}
            </tr>`;
    }).join('');
}

window.markHourStatus = async (sid, hi, isP) => {
    try {
        await fetch(`/api/attendance/session/${activeSessionId}/student/${sid}/hour/${hi}?status=${isP ? 'PRESENT' : 'ABSENT'}`, { method: 'POST' });
    } catch {
        showNotification('Update failed', 'error');
    }
};

window.markAllSessionStatus = async (s) => {
    try {
        await fetch(`/api/attendance/session/${activeSessionId}/mark-all?status=${s}`, { method: 'POST' });
        document.querySelectorAll('.slot-checkbox').forEach(cb => cb.checked = (s === 'PRESENT'));
    } catch {}
};

window.submitRollCall = async () => {
    try {
        const res = await fetch(`/api/teacher/sessions/${activeSessionId}/end`, { method: 'POST' });
        if (!res.ok) throw new Error();
        
        const updated = await res.json();
        const idx = allSessions.findIndex(s => s.sessionId === activeSessionId);
        if (idx !== -1) allSessions[idx] = { ...allSessions[idx], ...updated };
        activeSession = allSessions[idx];

        // Trigger modal instead of inline button switch
        document.getElementById('finalize-modal').classList.remove('hidden');
        
        loadRollCall(activeSessionId);
    } catch { showNotification('Failed to finalize', 'error'); }
};

window.closeFinalizeModal = function() {
    document.getElementById('finalize-modal').classList.add('hidden');
    closeAttendance(); // Return to dashboard
    loadSessions();
};

window.confirmAndExportAttendance = async () => {
    try {
        await fetch(`/api/teacher/sessions/${activeSessionId}/confirm-attendance`, { method: 'POST' });
        showNotification('Attendance confirmed.', 'success');
        
        downloadAttendancePdf(activeSessionId);
        
        closeAttendance();
        loadSessions();
    } catch {}
};

// ── Teacher Stats Integration ──────────────────────────────────────────────
async function loadTeacherStats() {
    try {
        const res = await fetch('/api/teacher/stats/classes');
        const groups = await res.json();
        const select = document.getElementById('stats-course-selector');
        if (!select) return;

        select.innerHTML = '<option value="">Select a Course Context...</option>';
        groups.forEach(g => {
            select.add(new Option(`${g.classroomName} • ${g.courseName}`, `${g.classroomId}-${g.courseId}`));
        });
    } catch (e) {
        console.error("Failed to load stats classes", e);
    }
}

window.loadStatsForDetailedView = async function() {
    const val = document.getElementById('stats-course-selector').value;
    const tbody = document.getElementById('stats-table-body');
    
    if (!val) {
        tbody.innerHTML = '<tr><td colspan="2" class="px-4 py-8 text-center text-slate-500">Select a course to view its attendance yields.</td></tr>';
        return;
    }

    const [classId, courseId] = val.split('-');
    tbody.innerHTML = '<tr><td colspan="2" class="px-4 py-8 text-center text-slate-500">Calculating yields...</td></tr>';
    
    try {
        const res = await fetch(`/api/teacher/stats/classes/${classId}/courses/${courseId}`);
        const stats = await res.json();
        
        if (stats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="px-4 py-8 text-center text-slate-500">No students found.</td></tr>';
            return;
        }

        tbody.innerHTML = stats.map(st => {
            const pct = isNaN(st.attendanceRate) ? 0 : Math.round(st.attendanceRate);
            let barColor = 'bg-gradient-to-r from-blue-500 to-[#00B0FF]';
            if (pct < 75) barColor = 'bg-red-500';
            else if (pct < 90) barColor = 'bg-amber-500';

            return `
            <tr class="hover:bg-blue-50/30 transition-colors border-b border-slate-50 last:border-0">
                <td class="px-6 py-5">
                    <div class="flex flex-col">
                        <span class="text-sm font-black text-slate-900">${st.studentName}</span>
                        <span class="text-[10px] font-black text-[#00B0FF] uppercase mt-1 tracking-tight">${st.attendedHours} / ${st.totalCourseHours} Hours Fullfilled</span>
                    </div>
                </td>
                <td class="px-6 py-5 align-middle">
                    <div class="flex flex-col items-end gap-2 w-56 ml-auto">
                        <div class="flex items-center justify-between w-full mb-1">
                             <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Yield</span>
                             <span class="text-xs font-black text-slate-900">${pct}%</span>
                        </div>
                        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div class="h-full ${barColor} shadow-sm transition-all duration-1000" style="width: ${pct}%"></div>
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch {
        tbody.innerHTML = '<tr><td colspan="2" class="px-4 py-8 text-center text-red-600 text-sm">Failed to generate yield report.</td></tr>';
    }
};

// ── Notifications (Minimal) ────────────────────────────────────────────────
function showNotification(msg, type='info') {
    const existing = document.getElementById('tt-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'tt-toast';
    
    // Color logic
    const bgColor = type === 'error' ? 'bg-rose-600 shadow-rose-500/30' : 'bg-[#00B0FF] shadow-blue-500/20';
    
    toast.className = `fixed top-4 right-4 z-[300] ${bgColor} text-white px-5 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all transform translate-y-2 opacity-0 flex items-center gap-3 active:scale-95 cursor-pointer shadow-xl`;
    
    const icon = type === 'error' 
        ? `<svg class="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
        : `<svg class="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    toast.innerHTML = `${icon}<span>${msg}</span>`;
    toast.onclick = () => toast.remove();

    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-y-2', 'opacity-0'); }, 10);
    setTimeout(() => { 
        toast.classList.add('opacity-0'); 
        setTimeout(() => toast.remove(), 300); 
    }, type === 'error' ? 5000 : 3000); // Errors stay longer
}

// ── Simple Actions ────────────────────────────────────────────────────────
window.downloadAttendancePdf = (id) => window.open(`/api/teacher/sessions/${id}/export/pdf`, '_blank');
window.downloadAttendanceCsv = (id) => window.open(`/api/teacher/sessions/${id}/export`, '_blank');
window.viewAttendancePdf = window.downloadAttendancePdf;

window.generatePin = async () => {
    try {
        const res = await fetch('/api/attendance/session-token', { method: 'POST', body: JSON.stringify({sessionId:activeSessionId, type:'PIN'}), headers:{'Content-Type':'application/json'} });
        const data = await res.json();
        document.getElementById('pin-display').textContent = data.token;
    } catch {}
};

window.toggleQrView = () => {
    const ov = document.getElementById('qr-overlay');
    if (ov.classList.contains('hidden')) {
        ov.classList.remove('hidden');
        generateQr();
        connectWebSocket();
    } else {
        ov.classList.add('hidden');
        disconnectWebSocket();
    }
};

async function generateQr() {
    try {
        const res = await fetch('/api/attendance/session-token', { method: 'POST', body: JSON.stringify({sessionId:activeSessionId, type:'QR'}), headers:{'Content-Type':'application/json'} });
        const data = await res.json();
        if (typeof window.QRCode !== 'undefined') {
            const cv = document.createElement('canvas');
            cv.className = 'w-full h-full rounded-xl';
            document.getElementById('qr-canvas-placeholder').innerHTML = '';
            document.getElementById('qr-canvas-placeholder').appendChild(cv);
            window.QRCode.toCanvas(cv, data.token, { width: 250, margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' } });
        }
    } catch {}
}

function connectWebSocket() {
    if (typeof window.SockJS === 'undefined' || typeof window.Stomp === 'undefined') return;
    const socket = new window.SockJS('/ws'); stompClient = window.Stomp.over(socket); stompClient.debug = null;
    stompClient.connect({}, () => {
        stompClient.subscribe(`/topic/session/${activeSessionId}/qr`, generateQr);
        stompClient.subscribe(`/topic/session/${activeSessionId}`, () => loadRollCall(activeSessionId));
    });
}
function disconnectWebSocket() { if (stompClient?.connected) stompClient.disconnect(); stompClient = null; }
