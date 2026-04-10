/**
 * Teacher Dashboard — Roll Call Engine
 * Handles: schedule loading, session filtering, start/end flow,
 *          QR/PIN generation, and manual roll call marking.
 */

// ── State ─────────────────────────────────────────────────────────────────
let allSessions     = [];   // full list from API (all weeks)
let filteredSessions = [];  // after week/classroom filter
let activeSessionId  = null;
let activeSession    = null;
let stompClient      = null;
let qrTimer          = 30;
let qrInterval       = null;
let activePin        = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    setInterval(loadSessions, 300000); // refresh every 5 min
});

// ── 1. Load & Render Schedule ──────────────────────────────────────────────

async function loadSessions() {
    const grid = document.getElementById('sessions-grid');
    // Keep spinner visible while loading
    grid.innerHTML = `
        <div class="col-span-full py-20 text-center" id="sessions-loader">
            <div class="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p class="text-slate-400 font-bold font-display italic">Syncing your schedule...</p>
        </div>`;

    try {
        const res = await fetch('/api/teacher/sessions/my-schedule');
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

        allSessions = await res.json();

        if (!Array.isArray(allSessions)) {
            throw new Error('Invalid response from server');
        }

        populateFilters();
        applyFilters(); // renders the grid using current filter selects

    } catch (err) {
        console.error('Schedule load error:', err);
        grid.innerHTML = `
            <div class="col-span-full py-16 text-center">
                <p class="text-rose-500 font-black text-sm mb-2">Could not load your schedule.</p>
                <p class="text-slate-400 text-xs font-bold">${err.message}</p>
                <button onclick="loadSessions()" class="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-100 transition">Retry</button>
            </div>`;

        // Clear stat cards safely
        setNextClass(null);
        document.getElementById('pending-attendance-count').textContent = '00';
    }
}

/** Build unique week and classroom options into select dropdowns */
function populateFilters() {
    const weekSet  = new Set();
    const classSet = new Map(); // classroomId → classroomName

    allSessions.forEach(s => {
        if (s.week != null)                       weekSet.add(s.week);
        if (s.classroomId && s.classroomName)     classSet.set(s.classroomId, s.classroomName);
    });

    // Try to default to the ISO week that matches today
    const todayWeek = getISOWeek(new Date());

    const weekSel  = document.getElementById('filter-week');
    const classSel = document.getElementById('filter-classroom');
    if (!weekSel || !classSel) return;

    // Rebuild week options
    weekSel.innerHTML = '<option value="">All Weeks</option>';
    [...weekSet].sort((a,b) => a - b).forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = `Week ${w}`;
        if (w === todayWeek) opt.selected = true;
        weekSel.appendChild(opt);
    });

    // Rebuild classroom options
    classSel.innerHTML = '<option value="">All Classrooms</option>';
    classSet.forEach((name, id) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        classSel.appendChild(opt);
    });
}

window.applyFilters = function() {
    const weekVal  = document.getElementById('filter-week')?.value;
    const classVal = document.getElementById('filter-classroom')?.value;

    filteredSessions = allSessions.filter(s => {
        const weekMatch  = !weekVal  || String(s.week)        === weekVal;
        const classMatch = !classVal || String(s.classroomId) === classVal;
        return weekMatch && classMatch;
    });

    renderGrid();
};

function renderGrid() {
    const grid = document.getElementById('sessions-grid');

    if (!allSessions || allSessions.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 font-bold italic">
            No sessions planned for you yet.</div>`;
        setNextClass(null);
        document.getElementById('pending-attendance-count').textContent = '00';
        return;
    }

    if (!filteredSessions || filteredSessions.length === 0) {
        const weekVal  = document.getElementById('filter-week')?.value;
        const dynamicMsg = weekVal ? `No session planned for Week ${weekVal}.` : 'No sessions match the selected filters.';
        grid.innerHTML = `<div class="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
            <div class="empty-ico-box mx-auto mb-3 mt-4 text-slate-300">
                <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <p class="text-slate-500 font-bold font-display italic">${dynamicMsg}</p>
        </div>`;
        setNextClass(null);
        document.getElementById('pending-attendance-count').textContent = '00';
        return;
    }

    const sorted = [...filteredSessions].sort((a, b) => {
        // Sort by date then startTime
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.startTime || '').localeCompare(b.startTime || '');
    });

    // Update stat cards
    const next = sorted.find(s => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS') || sorted[0];
    setNextClass(next);
    const pending = sorted.filter(s => s.status === 'SCHEDULED').length;
    document.getElementById('pending-attendance-count').textContent = String(pending).padStart(2, '0');

    grid.innerHTML = sorted.map(s => renderSessionCard(s)).join('');
}

function setNextClass(s) {
    document.getElementById('next-class-name').textContent  = s?.courseName || 'No upcoming sessions';
    document.getElementById('next-class-time').textContent  = s?.startTime ? s.startTime.substring(0, 5) : '--:--';
    document.getElementById('next-class-room').textContent  = s?.classroomName || s?.locationGeographicalCoordinates || 'N/A';
}

function renderSessionCard(s) {
    const isActive  = s.status === 'IN_PROGRESS';
    const isDone    = s.status === 'COMPLETED';
    const isCancelled = s.status === 'CANCELLED';

    const statusColor = isActive   ? 'bg-blue-100 text-blue-700'
                      : isDone     ? 'bg-slate-100 text-slate-400'
                      : isCancelled? 'bg-red-50 text-red-400'
                      :              'bg-emerald-50 text-emerald-600';

    const dateStr = s.date
        ? new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
        : (s.day || 'TBD');

    const startBtn = !isDone && !isCancelled ? `
        <button onclick="event.stopPropagation(); handleSessionAction(${s.sessionId})"
                class="mt-4 w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                       ${isActive ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-blue-500 text-white hover:bg-blue-600'}">
            ${isActive ? 'Open Roll Call' : 'Start Session'}
        </button>` : `
        <div class="mt-4 w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-center
                    ${isDone ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-400'}">
            ${isDone ? 'Session Closed' : 'Cancelled'}
        </div>`;

    return `
        <div class="glass-panel p-6 rounded-premium border border-white/40 shadow-sm hover:shadow-xl transition-all
                    group flex flex-col ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-50' : ''}">
            ${isActive ? `<div class="flex justify-end mb-2">
                <span class="flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
            </div>` : ''}

            <div class="flex items-center gap-3 mb-3">
                <div class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${statusColor}">
                    ${s.status ? s.status.replace('_', ' ') : 'SCHEDULED'}
                </div>
                <span class="text-[10px] font-bold text-slate-400">
                    ${s.startTime ? s.startTime.substring(0,5) : '--'} – ${s.endTime ? s.endTime.substring(0,5) : '--'}
                </span>
            </div>

            <h4 class="text-base font-black text-slate-800 mb-1 font-display tracking-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                ${s.courseName || 'Unnamed Course'}
            </h4>

            <div class="flex items-center gap-1.5 mt-1">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${dateStr}</span>
                <span class="text-slate-200">•</span>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${s.classroomName || 'No Classroom'}</span>
            </div>

            ${startBtn}
        </div>
    `;
}

// ── 2. Session Lifecycle (Start / Open Roll Call) ──────────────────────────

window.handleSessionAction = async function(sessionId) {
    const session = allSessions.find(s => s.sessionId === sessionId);
    if (!session) return;

    if (session.status === 'SCHEDULED') {
        // Start it first, then open roll call
        try {
            const res = await fetch(`/api/teacher/sessions/${sessionId}/start`, { method: 'POST' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                showToast(err.message || 'Could not start session', 'error');
                return;
            }
            const updated = await res.json();
            // Reflect updated status
            const idx = allSessions.findIndex(s => s.sessionId === sessionId);
            if (idx !== -1) allSessions[idx] = updated;
            renderGrid();
            openRollCall(sessionId);
        } catch (e) {
            showToast('Network error starting session', 'error');
        }
    } else if (session.status === 'IN_PROGRESS') {
        openRollCall(sessionId);
    }
};

// ── 3. Roll Call Panel ─────────────────────────────────────────────────────

function openRollCall(sessionId) {
    activeSessionId = sessionId;
    activeSession   = allSessions.find(s => s.sessionId === sessionId);
    if (!activeSession) return;

    // Header info
    document.getElementById('att-course-name').textContent = activeSession.courseName || 'Session';
    document.getElementById('att-details').textContent =
        `${activeSession.classroomName || 'No Room'} • ${activeSession.startTime?.substring(0,5) || '--'} – ${activeSession.endTime?.substring(0,5) || '--'}`;

    // Submit button
    const btn = document.getElementById('final-submit-btn');
    btn.textContent = 'Submit & Close';
    btn.disabled = false;
    btn.className = 'px-6 py-3 bg-[#00B0FF] text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-sm';

    document.getElementById('attendance-panel-container').classList.remove('hidden');

    // Reset PIN display
    document.getElementById('pin-display').textContent = '----';
    activePin = null;

    loadRollCall(sessionId);
}

window.closeAttendance = function() {
    document.getElementById('attendance-panel-container').classList.add('hidden');
    disconnectWebSocket();
    clearInterval(qrInterval);
    activeSessionId = null;
    activeSession   = null;
    activePin       = null;
};

async function loadRollCall(sessionId) {
    const loader    = document.getElementById('student-list-loader');
    const container = document.getElementById('student-cards-body');

    loader.classList.remove('hidden');
    container.innerHTML = '';

    try {
        const res = await fetch(`/api/attendance/session/${sessionId}/students`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const students = await res.json();

        loader.classList.add('hidden');

        if (!students || students.length === 0) {
            container.innerHTML = `<div class="col-span-full py-10 text-center text-slate-400 font-bold italic">
                No students found in this classroom. Ensure students are assigned to the classroom.</div>`;
            return;
        }
        container.innerHTML = students.map(renderStudentCard).join('');

    } catch (err) {
        loader.classList.add('hidden');
        container.innerHTML = `<div class="col-span-full py-10 text-center text-rose-500 font-bold">
            Failed to load students: ${err.message}</div>`;
    }
}

function renderStudentCard(s) {
    const status    = s.status || 'NOT_MARKED';
    const isPresent = status === 'PRESENT';
    const isLate    = status === 'LATE';
    const isAbsent  = status === 'ABSENT';
    const firstName = s.firstName || '?';
    const lastName  = s.lastName  || '?';
    const initials  = firstName[0].toUpperCase() + lastName[0].toUpperCase();

    return `
        <div class="glass-panel p-5 rounded-[2rem] border border-white/40 shadow-sm flex flex-col gap-4" data-student-id="${s.userId}">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-50 to-slate-100 border border-slate-100 rounded-2xl
                            flex items-center justify-center font-black text-slate-400 text-lg">
                    ${initials}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-black text-slate-800 truncate">${firstName} ${lastName}</h4>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${s.matricule || '—'}</p>
                    ${s.isLive ? '<span class="text-[9px] font-black text-emerald-500">● Live Check-In</span>' : ''}
                </div>
            </div>

            <!-- 3-state toggle -->
            <div class="grid grid-cols-3 gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button onclick="markStatus(${s.userId}, 'PRESENT')"
                        class="status-btn-present flex items-center justify-center py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
                               ${isPresent ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                </button>
                <button onclick="markStatus(${s.userId}, 'LATE')"
                        class="status-btn-late flex items-center justify-center py-3 rounded-xl transition-all
                               ${isLate ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </button>
                <button onclick="markStatus(${s.userId}, 'ABSENT')"
                        class="status-btn-absent flex items-center justify-center py-3 rounded-xl transition-all
                               ${isAbsent ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// ── 4. Mark Attendance ─────────────────────────────────────────────────────

window.markStatus = async (studentId, status) => {
    try {
        const res = await fetch('/api/attendance/mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId:          studentId,
                sessionId:       activeSessionId,
                status:          status,
                verifiedByTeacher: true
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Optimistic UI update
        const card = document.querySelector(`[data-student-id="${studentId}"]`);
        if (!card) return;

        // Reset all three buttons
        card.querySelector('.status-btn-present').className =
            card.querySelector('.status-btn-present').className.replace(
                /bg-emerald-500 text-white shadow-md/, 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50');
        card.querySelector('.status-btn-late').className =
            card.querySelector('.status-btn-late').className.replace(
                /bg-amber-500 text-white shadow-md/, 'text-slate-400 hover:text-amber-500 hover:bg-amber-50');
        card.querySelector('.status-btn-absent').className =
            card.querySelector('.status-btn-absent').className.replace(
                /bg-rose-500 text-white shadow-md/, 'text-slate-400 hover:text-rose-500 hover:bg-rose-50');

        // Activate the right one
        const colorMap = { PRESENT: 'emerald', LATE: 'amber', ABSENT: 'rose' };
        const btn = card.querySelector(`.status-btn-${status.toLowerCase()}`);
        const c   = colorMap[status];
        btn.classList.add(`bg-${c}-500`, 'text-white', 'shadow-md');
        btn.classList.remove('text-slate-400', `hover:text-${c}-500`, `hover:bg-${c}-50`);

    } catch (err) {
        showToast('Marking failed — please retry', 'error');
    }
};

// ── 5. Filter Tabs ─────────────────────────────────────────────────────────

window.filterByStatus = function(filter) {
    document.querySelectorAll('#student-cards-body > div[data-student-id]').forEach(card => {
        if (filter === 'all') { card.style.display = ''; return; }
        const pBtn = card.querySelector('.status-btn-present');
        const lBtn = card.querySelector('.status-btn-late');
        const aBtn = card.querySelector('.status-btn-absent');
        const isPresent = pBtn?.classList.contains('bg-emerald-500');
        const isLate    = lBtn?.classList.contains('bg-amber-500');
        const isAbsent  = aBtn?.classList.contains('bg-rose-500');
        if (filter === 'absent')     card.style.display = isAbsent ? '' : 'none';
        if (filter === 'not-marked') card.style.display = (!isPresent && !isLate && !isAbsent) ? '' : 'none';
    });
};

// ── 6. QR Code Flow ────────────────────────────────────────────────────────

window.toggleQrView = function() {
    const overlay  = document.getElementById('qr-overlay');
    const isOpen   = !overlay.classList.contains('hidden');

    if (isOpen) {
        overlay.classList.add('hidden');
        disconnectWebSocket();
        clearInterval(qrInterval);
        return;
    }

    if (!activeSessionId) { showToast('Open a session first', 'error'); return; }

    overlay.classList.remove('hidden');
    connectWebSocket();
    startQrTimer();
    generateNewQr();
};

async function generateNewQr() {
    try {
        const res = await fetch('/api/attendance/session-token', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ sessionId: activeSessionId, type: 'QR' })
        });
        if (!res.ok) throw new Error('Token request failed');
        const data = await res.json();
        renderQrCode(data.token);
    } catch (err) {
        document.getElementById('qr-canvas-placeholder').innerHTML =
            `<p class="text-rose-400 font-bold text-sm">${err.message}</p>`;
    }
}

function renderQrCode(token) {
    const ph = document.getElementById('qr-canvas-placeholder');
    ph.innerHTML = '<canvas id="qr-canvas" class="w-full h-full rounded-2xl"></canvas>';
    QRCode.toCanvas(document.getElementById('qr-canvas'), token, {
        width: 300, margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' }
    });
    document.getElementById('qr-title').textContent = activeSession?.courseName || 'Session';
}

// ── 7. PIN Flow ────────────────────────────────────────────────────────────

window.generatePin = async function() {
    if (!activeSessionId) { showToast('Start a session first', 'error'); return; }
    try {
        const res = await fetch('/api/attendance/session-token', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ sessionId: activeSessionId, type: 'PIN' })
        });
        if (!res.ok) throw new Error('PIN request failed');
        const data = await res.json();
        activePin = data.token;
        document.getElementById('pin-display').textContent = activePin;
        showToast(`PIN generated: ${activePin}`, 'success');
    } catch (err) {
        showToast('Failed to generate PIN', 'error');
    }
};

// ── 8. WebSocket for live QR rotation ────────────────────────────────────

function connectWebSocket() {
    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') return;
    const socket = new SockJS('/ws');
    stompClient  = Stomp.over(socket);
    stompClient.debug = null;
    stompClient.connect({}, () => {
        stompClient.subscribe(`/topic/session/${activeSessionId}/qr`, msg => {
            renderQrCode(msg.body);
            resetQrTimer();
        });
    });
}

function disconnectWebSocket() {
    if (stompClient && stompClient.connected) stompClient.disconnect();
    stompClient = null;
}

function startQrTimer() {
    clearInterval(qrInterval);
    qrTimer = 30;
    const progress = document.getElementById('qr-timer-progress');
    const text     = document.getElementById('qr-timer-text');
    qrInterval = setInterval(() => {
        qrTimer--;
        if (qrTimer < 0) qrTimer = 30;
        if (text)     text.textContent = qrTimer;
        if (progress) progress.style.width = `${(qrTimer / 30) * 100}%`;
    }, 1000);
}

function resetQrTimer() { qrTimer = 30; }

// ── 9. Submit Roll Call ────────────────────────────────────────────────────

window.submitRollCall = async () => {
    if (!confirm('Finalize roll call and close the session? Students without a mark will be auto-marked ABSENT.')) return;
    try {
        const res = await fetch(`/api/teacher/sessions/${activeSessionId}/end`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast('Session closed successfully!', 'success');
        closeAttendance();
        loadSessions();
    } catch (err) {
        showToast('Failed to close session', 'error');
    }
};

// ── 10. Utilities ──────────────────────────────────────────────────────────

/** ISO week number (1-53) for a given Date */
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/** Non-intrusive toast notification */
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 right-6 z-[9999] flex flex-col gap-2';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = { success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-blue-500' };
    toast.className = `px-5 py-3 ${colors[type] || colors.info} text-white text-sm font-bold rounded-2xl shadow-xl animate-fade-in`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}
