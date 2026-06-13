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
let selectedMobileDay = 'MONDAY'; // For mobile day switcher

function initDashboard() {
    if (window.dashboardInitialized) return;
    window.dashboardInitialized = true;

    loadSessions();       // Single initial load — do NOT call again on tab change
    loadNotifications();
    if (typeof initializeGlobalWebSockets === 'function') initializeGlobalWebSockets();

    setInterval(loadSessions, 300000); // Background refresh every 5 min only

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

    if (section === 'students') {
        fetchMyStudents();
    }
    if (section === 'stats') {
        loadTeacherStats();
    }
    if (section === 'documents') {
        loadMyDocuments();
        populateDocDropdowns();
    }
};

async function fetchMyStudents() {
    const tbody = document.getElementById('students-table-body');
    const cards = document.getElementById('students-cards-mobile');
    
    // Only show loading if we don't have data yet
    if (!window.studentsData || window.studentsData.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-10 text-center text-slate-400 text-sm">Loading students...</td></tr>';
    }

    try {
        const res = await fetch('/api/teacher/students');
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        window.studentsData = data;
        
        // Trigger the local rendering logic defined in the HTML
        if (window.refreshStudentsUI) {
            window.refreshStudentsUI();
        }
    } catch (e) {
        console.error("Failed to load students", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-10 text-center text-red-500 text-sm">failed to load students.</td></tr>';
    }
}

// ── Schedule Core ────────────────────────────────────────────────────────
async function loadSessions() {
    // Show a loading indicator in whichever container is visible
    const matrix = document.getElementById('timetable-matrix');
    const mobileList = document.getElementById('mobile-sessions-list');

    try {
        const res = await fetch('/api/teacher/sessions/my-schedule');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allSessions = await res.json();

        populateFilters();
        applyFilters();
    } catch (e) {
        console.error('Failed to load sessions:', e);
        if (mobileList) mobileList.innerHTML = `<div class="py-8 text-center text-red-500 text-xs font-bold">Failed to load schedule. Please refresh.</div>`;
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

    // Auto-select: prefer current week from Thymeleaf context, fallback to max week
    const currentWeek = window.user?.currentWeek;
    let defaultWeek = weekSel.value; // keep user-selected if refreshing
    if (!defaultWeek) {
        if (currentWeek && weekSet.has(currentWeek)) {
            defaultWeek = String(currentWeek);
        } else if (weekSet.size > 0) {
            // fallback: pick the closest week to today
            defaultWeek = String([...weekSet].sort((a,b) => Math.abs(a - (currentWeek||a)) - Math.abs(b - (currentWeek||b)))[0]);
        }
    }

    weekSel.innerHTML = '<option value="">All Weeks</option>';
    [...weekSet].sort((a, b) => a - b).forEach(w => {
        const val = String(w);
        weekSel.add(new Option(`Week ${w}`, val, false, val === defaultWeek));
    });

    const savedClass = classSel.value;
    classSel.innerHTML = '<option value="">All Rooms</option>';
    classSet.forEach((name, id) => {
        classSel.add(new Option(name, String(id), false, String(id) === savedClass));
    });
}

window.setMobileDay = function(day) {
    selectedMobileDay = day;
    document.querySelectorAll('.day-tab').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        btn.classList.toggle('active', onclickAttr.includes(`'${day}'`));
    });
    renderGrid();
};

// Auto-init mobile day to today's day and highlight the correct tab
(function initTodayMobileDay() {
    const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
    const todayDay = days[new Date().getDay()];
    selectedMobileDay = (todayDay === 'SUNDAY') ? 'MONDAY' : todayDay;

    // Activate the right tab once DOM is ready
    const activateTab = () => {
        document.querySelectorAll('.day-tab').forEach(btn => {
            const attr = btn.getAttribute('onclick') || '';
            btn.classList.toggle('active', attr.includes(`'${selectedMobileDay}'`));
        });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', activateTab);
    } else {
        activateTab();
    }
})();

window.applyFilters = function() {
    const w = document.getElementById('filter-week')?.value;
    const d = document.getElementById('filter-day')?.value;
    const c = document.getElementById('filter-classroom')?.value;

    filteredSessions = allSessions.filter(st => {
        const mw = !w || String(st.week) === w;
        const mc = !c || String(st.classroomId) === c;
        // Day filter only applies on mobile, or we can use it to sync
        return mw && mc;
    });

    renderGrid();
};

function calculateGridPosition(startTime, endTime) {
    const startParts = startTime.split(':');
    const startH = parseInt(startParts[0]);
    const startM = parseInt(startParts[1]);

    const endParts = endTime.split(':');
    const endH = parseInt(endParts[0]);
    const endM = parseInt(endParts[1]);

    const startRow = ((startH - 8) * 60) + startM + 2;
    const endRow = ((endH - 8) * 60) + endM + 2;

    return { start: startRow, end: endRow };
}

function renderGrid() {
    const matrix = document.getElementById('timetable-matrix');
    const mobileList = document.getElementById('mobile-sessions-list');
    if (!matrix || !mobileList) return;

    updateOverview();

    // 2. Render Desktop Matrix
    // Save and restore the 7 static header elements
    const headerEls = Array.from(matrix.children).slice(0, 7).map(el => el.cloneNode(true));
    matrix.innerHTML = '';
    headerEls.forEach(h => matrix.appendChild(h));

    // Generate background grid: one entry per hour slot per day
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    
    // Create 9 hour blocks (8:00 to 17:00)
    for (let hourOffset = 0; hourOffset < 9; hourOffset++) {
        const hour = 8 + hourOffset;
        const startRow = (hourOffset * 60) + 2;
        
        // Time label spanning 60 mins
        const label = document.createElement('div');
        label.className = 'time-label';
        label.style.gridRow = `${startRow} / span 60`;
        label.style.gridColumn = '1';
        label.textContent = `${String(hour).padStart(2,'0')}:00`;
        matrix.appendChild(label);

        // One background slot per column spanning 60 mins
        for (let d = 0; d < 6; d++) {
            const cell = document.createElement('div');
            // Full hour = solid soft border + vertical divider
            cell.className = `timetable-slot border-b border-r border-slate-200`;
            cell.style.gridRow = `${startRow} / span 60`;
            cell.style.gridColumn = String(d + 2);
            matrix.appendChild(cell);
        }
    }

    // Place Session Cards in Matrix
    filteredSessions.forEach(s => {
        const pos = calculateGridPosition(s.startTime, s.endTime);
        const dayIdx = days.indexOf(s.day?.toUpperCase());
        if (pos && dayIdx !== -1 && pos.start < pos.end) {
            const card = document.createElement('div');
            card.className = 'session-card-grid';
            // z-index 10 ensures cards sit above the background lines
            card.style.gridRow = `${pos.start} / ${pos.end}`;
            card.style.gridColumn = String(dayIdx + 2);
            card.style.zIndex = '10';
            // Slight margin to allow grid lines to be visible
            card.style.margin = '2px';
            card.innerHTML = renderSessionCard(s, true);
            matrix.appendChild(card);
        }
    });

    // 3. Render Mobile List
    const mobileDay = selectedMobileDay || 'MONDAY';
    const mobileSessions = filteredSessions
        .filter(s => s.day?.toUpperCase() === mobileDay)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    if (mobileSessions.length === 0) {
        mobileList.innerHTML = `<div class="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No sessions for ${mobileDay.charAt(0) + mobileDay.slice(1).toLowerCase()}</div>`;
    } else {
        mobileList.innerHTML = mobileSessions.map(s => renderSessionCard(s, false)).join('');
    }
}

function updateOverview() {
    const totalEl = document.getElementById('stat-sessions-total');
    const doneEl = document.getElementById('stat-sessions-done');
    const pctEl = document.getElementById('stat-sessions-pct');
    const overallHoursEl = document.getElementById('stat-hours-overall');
    
    // 1. Update Date and Today's Class Count
    const dateEl = document.getElementById('current-date-teacher');
    const todayCountBadge = document.getElementById('today-count-teacher');
    
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`; // YYYY-MM-DD local
    
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
    }
    
    // Calculate Today's Stats
    const sessionsToday = allSessions.filter(s => s.date === todayStr);
    const totalToday = sessionsToday.length;
    const doneToday = sessionsToday.filter(s => s.status === 'COMPLETED').length;

    if (todayCountBadge) {
        todayCountBadge.textContent = `${totalToday} ${totalToday === 1 ? 'class' : 'classes'} today`;
    }

    if (totalEl) totalEl.textContent = String(totalToday);
    if (doneEl) doneEl.textContent = String(doneToday);
    if (pctEl) {
        const pct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;
        pctEl.textContent = `${pct}%`;
    }

    // Overall Hours Covered (All COMPLETED sessions in history)
    if (overallHoursEl) {
        const overallHours = allSessions
            .filter(s => s.status === 'COMPLETED')
            .reduce((sum, s) => sum + (s.totalHours || 0), 0);
        overallHoursEl.textContent = String(overallHours);
    }

    // Sync Pending count (unfinalized sessions across all time)
    const pendingCount = allSessions.filter(s => s.status === 'IN_PROGRESS' || (s.status === 'COMPLETED' && !s.isValidated)).length;
    const pendingEl = document.getElementById('pending-attendance-count');
    if (pendingEl) pendingEl.textContent = String(pendingCount);
    
    // Calculate Next Session
    const nextSessionEl = document.getElementById('overview-upcoming-session');
    if (nextSessionEl) {
        const now = new Date();
        const upcoming = allSessions.filter(s => {
            if (s.status === 'COMPLETED') return false;
            if (!s.date || !s.startTime) return false;
            const sDate = new Date(s.date + 'T' + s.startTime);
            return sDate >= now || s.status === 'IN_PROGRESS';
        }).sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime));

        if (upcoming.length > 0) {
            const next = upcoming[0];
            nextSessionContext = next; // Store for global access
            const timeStr = next.startTime ? next.startTime.substring(0, 5) : '--:--';
            
            const isActive = next.status === 'IN_PROGRESS';
            nextSessionEl.innerHTML = `
                <div onclick="handleSessionAction(${next.sessionId})" class="cursor-pointer group active:scale-[0.98] transition-all">
                    <div class="flex items-start justify-between">
                        <div>
                            <h3 class="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">${next.courseName || 'Course'}</h3>
                            <p class="text-[11px] font-bold text-slate-500 mt-1">${next.classroomName || 'Room'} • <span class="${isActive ? 'text-blue-600' : 'text-emerald-600'}">${timeStr}</span></p>
                        </div>
                        ${isActive ? '<span class="px-2 py-1 bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>LIVE</span>' : ''}
                    </div>
                </div>
            `;
        } else {
            nextSessionContext = null;
            nextSessionEl.innerHTML = `<p class="text-xs font-bold text-slate-400">No upcoming classes scheduled.</p>`;
        }
    }
}

window.takeAttendanceFromOverview = function() {
    if (nextSessionContext) handleSessionAction(nextSessionContext.sessionId);
};

function renderSessionCard(s, isGrid = false) {
    const isActive = s.status === 'IN_PROGRESS';
    const isDone = s.status === 'COMPLETED';
    const isMissed = s.status === 'MISSED';
    const isValid = s.isValidated === true;

    let statusClasses = 'bg-slate-100 text-slate-500 border border-slate-200';
    if (isActive) statusClasses = 'bg-blue-600 text-white shadow-md shadow-blue-500/20';
    else if (isDone) statusClasses = isValid ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white';
    else if (isMissed) statusClasses = 'bg-slate-200 text-slate-500';

    const clickAction = isDone ? `viewAttendancePdf(${s.sessionId})` : `handleSessionAction(${s.sessionId})`;

    if (isGrid) {
        let cardBg = 'border-indigo-300 bg-indigo-50/80 hover:bg-indigo-100/80';
        let textCourse = 'text-indigo-950';
        let textTime = 'text-indigo-600';
        let textRoom = 'text-indigo-500';
        let statsColor = 'text-indigo-400';

        if (isActive) {
            cardBg = 'border-[#0091D5] bg-[#00B0FF] shadow-md shadow-blue-500/30 hover:bg-blue-400 animate-pulse-subtle';
            textCourse = 'text-white';
            textTime = 'text-blue-50';
            textRoom = 'text-blue-100';
            statsColor = 'text-white/80';
        } else if (isDone) {
            cardBg = 'border-emerald-600 bg-emerald-500 hover:bg-emerald-400';
            textCourse = 'text-white';
            textTime = 'text-emerald-50';
            textRoom = 'text-emerald-100';
            statsColor = 'text-white/80';
        } else if (isMissed) {
            cardBg = 'border-slate-300 bg-slate-100/60 opacity-60 grayscale-[0.5]';
            textCourse = 'text-slate-600 line-through';
            textTime = 'text-slate-400';
            textRoom = 'text-slate-400';
            statsColor = 'text-slate-300';
        }

        const showStats = isDone || isActive;
        const statsHtml = showStats ? `<div class="mt-auto flex items-center gap-1 ${statsColor} text-[8px] font-black">
            <svg class="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"></path></svg>
            ${s.presentCount || 0}/${s.totalStudents || 0}
        </div>` : '';

        const badgeHtml = isActive ? '<span class="absolute top-1 right-1 px-1 py-0.5 bg-red-500 text-white text-[7px] font-black rounded">LIVE</span>' : 
                         (isMissed ? '<span class="absolute top-1 right-1 px-1 py-0.5 bg-slate-400 text-white text-[7px] font-black rounded uppercase">Missed</span>' : '');

        return `
            <div onclick="${clickAction}" class="h-full w-full p-2 rounded-xl border-l-4 ${cardBg} cursor-pointer transition-all flex flex-col justify-start gap-0.5 overflow-hidden relative">
                ${isDone ? '<div class="absolute top-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-emerald-600"><svg class="w-2 h-2" fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg></div>' : badgeHtml}
                <p class="text-[10px] font-black ${textCourse} truncate leading-tight w-[85%]">${s.courseName || 'Course'}</p>
                <div class="flex flex-col">
                    <span class="text-[9px] font-bold ${textTime}">${(s.startTime||'--:--').substring(0,5)}–${(s.endTime||'--:--').substring(0,5)}</span>
                    <span class="text-[9px] font-medium ${textRoom} truncate">${s.classroomName || ''}</span>
                </div>
                ${statsHtml}
            </div>`;
    }

    const dateStr = s.date ? new Date(s.date).toLocaleDateString('en-GB', {weekday:'short', day:'2-digit', month:'short'}) : 'TBD';
    let statusLabel = isActive ? 'LIVE' : (isDone ? (isValid ? 'DONE' : 'CLOSED') : (isMissed ? 'MISSED' : 'WAIT'));

    return `
        <div onclick="${clickAction}" class="bg-white p-4 rounded-2xl border-2 ${isActive ? 'border-[#00B0FF] shadow-lg shadow-blue-500/10' : 'border-slate-100'} ${isMissed ? 'opacity-60' : ''} flex items-center justify-between group active:scale-[0.98] transition-all">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl ${isActive ? 'bg-blue-50 text-blue-600' : (isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400')} flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                    <h4 class="text-sm font-black text-slate-900 mb-0.5 ${isMissed ? 'line-through' : ''}">${s.courseName || 'Course'}</h4>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${s.startTime?.substring(0,5)} • ${s.classroomName || 'Room'}</p>
                </div>
            </div>
            <div class="flex flex-col items-end gap-1">
                <span class="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${statusClasses}">${statusLabel}</span>
                <span class="text-[9px] font-bold text-slate-300">${dateStr}</span>
                ${(isDone || isActive) ? `<span class="text-[10px] font-black text-slate-900 mt-1">${s.presentCount || 0}/${s.totalStudents || 0}</span>` : ''}
            </div>
        </div>`;
}

// ── Roll Call Engine ──────────────────────────────────────────────────────
window.handleSessionAction = async function (sessionId) {
    const session = allSessions.find(s => s.sessionId === sessionId);
    if (!session) return;

    if (session.status === 'SCHEDULED') {
        const now = new Date();
        const [h, m] = (session.startTime || '00:00').split(':').map(Number);
        const [y, mon, d] = (session.date || '').split('-').map(Number);
        
        // Use the date from the session (mon is 0-indexed in Date constructor)
        const sDate = new Date(y, mon - 1, d, h, m, 0);
        const diffMinutes = (sDate - now) / (1000 * 60);
        
        // Window: 15 mins before to 30 mins after start (but if after end it is handled by backend)
        if (diffMinutes > 15) {
            showNotification(`Too early! You can start this class at ${session.startTime.substring(0,5)}.`, 'warning');
            return;
        }

        try {
            showNotification('Initializing session...', 'info');
            const res = await fetch(`/api/teacher/sessions/${sessionId}/start`, { method: 'POST' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to start session.');
            }
            const updated = await res.json();

            const idx = allSessions.findIndex(s => s.sessionId === sessionId);
            if (idx !== -1) allSessions[idx] = { ...allSessions[idx], ...updated };

            renderGrid();
            openRollCall(sessionId);
        } catch (e) {
            showNotification(e.message || 'Failed to start session.', 'error');
            // Refresh grid if it was a MISSED transition on backend
            fetchSessions(); 
        }
    } else if (session.status === 'MISSED') {
        showNotification("This session has expired and cannot be started.", "error");
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
    connectWebSocket(sessionId);
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

window.initializeGlobalWebSockets = function() {
    if (typeof window.SockJS === 'undefined' || typeof window.Stomp === 'undefined') return;
    
    const socket = new window.SockJS('/ws');
    const globalStompClient = window.Stomp.over(socket);
    globalStompClient.debug = null;

    globalStompClient.connect({}, function (frame) {
        console.log('Connected to Global WebSocket');
        
        // Subscribe to user-specific notifications
        globalStompClient.subscribe('/user/queue/notifications', function (msg) {
            const notification = JSON.parse(msg.body);
            showNotification(notification.message, notification.type === 'ATTENDANCE_SUBMITTED' ? 'success' : 'info');
            if (typeof loadNotifications === 'function') loadNotifications();
        });

        // Subscribe to session updates
        globalStompClient.subscribe('/topic/sessions', function (msg) {
            console.log('Session update received via WebSocket');
            if (typeof loadSessions === 'function') loadSessions();
        });
    }, function (error) {
        console.error('Global WebSocket error:', error);
        setTimeout(initializeGlobalWebSockets, 5000);
    });
};

// ── Real-time Socket Engine ─────────────────────────────────────────────
function connectWebSocket(sessionId) {
    disconnectWebSocket(); // clear any previous connection
    
    // Accept optional override or use activeSessionId
    const sid = sessionId || activeSessionId;
    if (!sid) return;
    
    if (typeof window.SockJS === 'undefined' || typeof window.Stomp === 'undefined') return;
    
    const socket = new window.SockJS('/ws');
    stompClient = window.Stomp.over(socket);
    stompClient.debug = null; // disable noisy console logs

    stompClient.connect({}, function (frame) {
        console.log('Connected to WebSocket');
        // Real-time attendance updates from student check-ins
        stompClient.subscribe('/topic/session/' + sid, function (message) {
            try {
                const dto = JSON.parse(message.body);
                updateRollCallRealTime(dto);
            } catch (e) {
                console.error("Error parsing WebSocket message:", e);
            }
        });
        // QR refresh notifications
        stompClient.subscribe('/topic/session/' + sid + '/qr', function() {
            generateQr();
        });
    }, function(error) {
        console.error('STOMP error:', error);
        // Try to reconnect after 5 seconds
        setTimeout(() => connectWebSocket(sid), 5000);
    });
}

function updateRollCallRealTime(dto) {
    // dto is an AttendanceRecordDto from the backend
    const studentId = dto.userId;
    if (!studentId) return;

    const row = document.querySelector(`.student-row[data-student-id="${studentId}"]`);
    if (!row) {
        // Student not in current view (could be due to filter or delay)
        loadRollCall(activeSessionId);
        return;
    }

    // 1. Visual highlight for the row
    row.classList.add('bg-blue-50/50', 'transition-colors', 'duration-500');
    setTimeout(() => row.classList.remove('bg-blue-50/50'), 2000);

    // 2. Mark ALL checkboxes for this student as checked (they scanned in)
    const checkboxes = row.querySelectorAll(`.slot-checkbox`);
    checkboxes.forEach(cb => { cb.checked = true; });

    // 3. Update the Scanned badge
    const nameContainer = row.querySelector('.flex.items-center.gap-2');
    if (nameContainer && !nameContainer.querySelector('.scanned-badge')) {
        const badge = document.createElement('span');
        badge.className = 'scanned-badge px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase tracking-widest rounded-md';
        badge.textContent = 'Scanned';
        nameContainer.appendChild(badge);
    }

    // 4. Update the status badge in the row
    const statusCell = row.querySelector('.status-badge-cell');
    if (statusCell) {
        const status = dto.status || 'PRESENT';
        statusCell.innerHTML = getStatusBadge(status);
    }
    row.setAttribute('data-status', dto.status || 'PRESENT');

    // 5. Re-calculate summary stats immediately
    updateSummaryStats();

    // 6. Show a toast notification
    const studentName = row.querySelector('span.text-sm')?.textContent?.trim() || 'A student';
    showNotification(`${studentName} just checked in!`, 'success');
}

function updateSummaryStats() {
    const rows = document.querySelectorAll('.student-row');
    const total = rows.length;
    let present = 0;
    let late = 0;
    
    rows.forEach(row => {
        // Source of truth: are any hour checkboxes checked?
        const isAnyPresent = Array.from(row.querySelectorAll('.slot-checkbox')).some(cb => cb.checked);
        const statusAttr = row.getAttribute('data-status') || 'ABSENT';
        
        // If the student isn't EXCUSED/JUSTIFIED, their status MUST match the checkboxes
        if (statusAttr !== 'EXCUSED' && statusAttr !== 'JUSTIFIED') {
            const derivedStatus = isAnyPresent ? 'PRESENT' : 'ABSENT';
            if (statusAttr !== derivedStatus) {
                row.setAttribute('data-status', derivedStatus);
                const badgeCell = row.querySelector('.status-badge-cell');
                if (badgeCell) badgeCell.innerHTML = getStatusBadge(derivedStatus);
            }
        }

        // Count for stats (Excused counts as present for some metrics, but here we count actual presence)
        const currentStatus = row.getAttribute('data-status');
        if (currentStatus === 'PRESENT') present++;
        else if (currentStatus === 'LATE') present++;
        else if (currentStatus === 'EXCUSED' || currentStatus === 'JUSTIFIED') present++; // Excused are often counted as 'handled'
        
        if (currentStatus === 'LATE') late++;
    });

    const absent = total - present;

    // Update the UI cards
    const totalEl = document.getElementById('att-stat-total');
    const presentEl = document.getElementById('att-stat-present');
    const absentEl = document.getElementById('att-stat-absent');
    const lateEl = document.getElementById('att-stat-late');

    if (totalEl) totalEl.textContent = total;
    if (presentEl) presentEl.textContent = present;
    if (absentEl) absentEl.textContent = absent;
    if (lateEl) lateEl.textContent = late;

    // Update circular progress rate
    const ratePct = total > 0 ? Math.round((present / total) * 100) : 0;
    const rateCircle = document.getElementById('att-rate-circle');
    const rateText = document.getElementById('att-rate-pct');
    const presentLbl = document.getElementById('att-rate-present-lbl');
    const absentLbl = document.getElementById('att-rate-absent-lbl');
    const lateLbl = document.getElementById('att-rate-late-lbl');

    if (rateText) rateText.textContent = `${ratePct}%`;
    if (rateCircle) rateCircle.setAttribute('stroke-dasharray', `${ratePct} ${100 - ratePct}`);
    if (presentLbl) presentLbl.textContent = present;
    if (absentLbl) absentLbl.textContent = absent;
    if (lateLbl) lateLbl.textContent = late;
}

function getStatusBadge(status) {
    status = (status || 'ABSENT').toUpperCase();
    let cls = 'bg-slate-100 text-slate-500';
    if (status === 'PRESENT') cls = 'bg-emerald-500 text-white';
    else if (status === 'LATE') cls = 'bg-amber-500 text-white';
    else if (status === 'ABSENT') cls = 'bg-rose-500 text-white';
    else if (status === 'EXCUSED' || status === 'JUSTIFIED') cls = 'bg-blue-500 text-white';
    
    return `<span class="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${cls}">${status}</span>`;
}

function resolveHours(s) { 
    if (!s) return 1;
    if (s.totalHours > 0) return s.totalHours;
    if (s.startTime && s.endTime) {
        try {
            const [sh, sm] = s.startTime.split(':').map(Number);
            const [eh, em] = s.endTime.split(':').map(Number);
            return Math.max(1, Math.round((eh * 60 + em - sh * 60 - sm) / 60));
        } catch(e) { return 1; }
    }
    return 1;
}

function renderAttendanceGrid(records) {
    const tbody = document.getElementById('att-table-body');
    const thead = document.getElementById('att-table-head');
    const totalHours = resolveHours(activeSession);

    // Build header
    let headHtml = `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] w-[50px] text-center">#</th>`;
    headHtml += `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] w-1/4">Student</th>`;
    headHtml += `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] text-center">Status</th>`;
    for (let i = 0; i < totalHours; i++) {
        headHtml += `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] text-center">H${i+1}</th>`;
    }
    headHtml += `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] text-center">Actions</th>`;
    thead.innerHTML = headHtml;

    // Sort alphabetically by last name, then first name
    records.sort((a, b) => {
        const nameA = ((a.lastName || '') + (a.firstName || '')).toLowerCase();
        const nameB = ((b.lastName || '') + (b.firstName || '')).toLowerCase();
        return nameA.localeCompare(nameB);
    });

    tbody.innerHTML = records.map((r, idx) => {
        const isLive = r.isLive;
        
        // Determine initial status based on both backend and slots
        const hasCheckedHours = r.hourSlots?.some(h => h.status === 'PRESENT' || h.status === 'LATE');
        let effectiveStatus = r.status || 'ABSENT';
        
        // Consistency check: if they have checked hours, they MUST be at least PRESENT
        if (hasCheckedHours && (effectiveStatus === 'ABSENT' || !effectiveStatus)) {
            effectiveStatus = 'PRESENT';
        } 
        // If they have NO checked hours and aren't EXCUSED, they are ABSENT
        else if (!hasCheckedHours && effectiveStatus !== 'EXCUSED' && effectiveStatus !== 'JUSTIFIED') {
            effectiveStatus = 'ABSENT';
        }

        const badgeHtml = getStatusBadge(effectiveStatus);

        let hoursHtml = '';
        for (let i = 0; i < totalHours; i++) {
            const slot = r.hourSlots?.find(h => h.hourIndex === i);
            const isPresent = slot?.status === 'PRESENT' || slot?.status === 'LATE';
            hoursHtml += `
            <td class="px-4 py-3 text-center align-middle">
                <input type="checkbox" ${isPresent ? 'checked' : ''}
                       onchange="markHourStatus(${r.userId}, ${i}, this.checked)"
                       class="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500 slot-checkbox"
                       data-user-id="${r.userId}" data-hour="${i}">
            </td>`;
        }

        return `
            <tr class="student-row hover:bg-blue-50/30 transition-colors border-b border-slate-50 last:border-0 ${isLive ? 'bg-blue-50/20' : ''}" 
                data-student-id="${r.userId}" data-status="${effectiveStatus}">
                <td class="px-5 py-4 text-center">
                    <span class="text-[10px] font-black text-slate-400">${idx + 1}</span>
                </td>
                <td class="px-5 py-4">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-black text-slate-900">${r.firstName} ${r.lastName}</span>
                            ${isLive ? '<span class="scanned-badge px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase tracking-widest rounded-md">Scanned</span>' : ''}
                        </div>
                        <span class="text-[10px] font-bold text-slate-400 font-mono tracking-tight">${r.matricule || 'NO-MATRIC'}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-center align-middle status-badge-cell">
                    ${badgeHtml}
                </td>
                ${hoursHtml}
                <td class="px-4 py-3 text-center align-middle">
                    <button onclick="teacherMarkAllPresent(${r.userId})"
                            title="Mark all hours present"
                            class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-sm">
                        ✓ All
                    </button>
                </td>
            </tr>`;
    }).join('');

    // After rendering the grid, update the summary stats cards
    updateSummaryStats();
    
    // Re-apply any active filter to prevent visual jumping/resetting
    if (window.activeStudentFilter) {
        const btn = document.querySelector(`.status-filter-btn[onclick*="${window.activeStudentFilter}"]`);
        if (btn) window.filterByStatus(window.activeStudentFilter, btn);
    }
}

window.markHourStatus = async (userId, hourIndex, isPresent) => {
    try {
        const res = await fetch(`/api/attendance/session/${activeSessionId}/student/${userId}/hour/${hourIndex}?status=${isPresent ? 'PRESENT' : 'ABSENT'}`, { method: 'POST' });
        if (!res.ok) {
            let errMsg = `Server error ${res.status}`;
            try { const body = await res.json(); errMsg = body.message || body.error || errMsg; } catch(parseErr) { console.error("Failed to parse error response:", parseErr); }
            showNotification(errMsg, 'error');
            // Revert the checkbox to its previous state
            const cb = document.querySelector(`.slot-checkbox[data-user-id="${userId}"][data-hour="${hourIndex}"]`);
            if (cb) cb.checked = !isPresent;
        } else {
            // Success: update stats and row badge if necessary
            const row = document.querySelector(`.student-row[data-student-id="${userId}"]`);
            if (row) {
                const isAnyPresent = Array.from(row.querySelectorAll('.slot-checkbox')).some(cb => cb.checked);
                const statusCell = row.querySelector('.status-badge-cell');
                if (statusCell) {
                    const status = isAnyPresent ? 'PRESENT' : 'ABSENT';
                    statusCell.innerHTML = getStatusBadge(status);
                    row.setAttribute('data-status', status);
                }
            }
            updateSummaryStats();
        }
    } catch (networkErr) {
        console.error("markHourStatus network error:", networkErr);
        showNotification('Network error: could not update attendance.', 'error');
    }
};

window.filterByStatus = function(status, btn) {
    if (btn) {
        // 1. Update button styles
        document.querySelectorAll('.status-filter-btn').forEach(b => {
            b.classList.remove('bg-white', 'shadow-sm', 'font-semibold');
            b.classList.add('text-slate-500');
        });
        btn.classList.add('bg-white', 'shadow-sm', 'font-semibold');
        btn.classList.remove('text-slate-500');
    }

    // Persist filter state
    window.activeStudentFilter = status;

    // 2. Filter the rows
    const rows = document.querySelectorAll('.student-row');
    rows.forEach(row => {
        // Safe read from data attribute instead of parsing DOM text content
        const rowStatus = row.getAttribute('data-status') || 'ABSENT';
        const isScanned = row.querySelector('.scanned-badge') !== null;
        
        if (status === 'all') {
            row.classList.remove('hidden');
        } else if (status === 'absent') {
            row.classList.toggle('hidden', rowStatus !== 'ABSENT');
        } else if (status === 'not-marked') {
            // 'Review' filter: students who are present but not yet verified (scanned only)
            row.classList.toggle('hidden', !isScanned);
        }
    });
};

window.teacherMarkAllPresent = async (userId) => {
    try {
        const res = await fetch('/api/attendance/teacher/verify-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: activeSessionId, userId })
        });
        if (!res.ok) {
            let errMsg = `Server error ${res.status}`;
            try { const body = await res.json(); errMsg = body.message || body.error || errMsg; } catch(parseErr) { console.error("Failed to parse error response:", parseErr); }
            showNotification(errMsg, 'error');
            return;
        }
        // Immediately update all checkboxes for this student in the UI
        document.querySelectorAll(`.slot-checkbox[data-user-id="${userId}"]`).forEach(cb => cb.checked = true);
        showNotification('Marked all present.', 'success');
    } catch (networkErr) {
        console.error("teacherMarkAllPresent network error:", networkErr);
        showNotification('Network error: could not mark attendance.', 'error');
    }
};

window.markAllSessionStatus = async (s) => {
    try {
        await fetch(`/api/attendance/session/${activeSessionId}/mark-all?status=${s}`, { method: 'POST' });
        document.querySelectorAll('.slot-checkbox').forEach(cb => cb.checked = (s === 'PRESENT'));
    } catch (e) {
        console.error("markAllSessionStatus network error:", e);
    }
};

window.submitRollCall = async () => {
    const btn = document.getElementById('btn-submit-rollcall');
    if (btn) { btn.disabled = true; btn.textContent = 'Finalizing...'; }

    try {
        const res = await fetch(`/api/teacher/sessions/${activeSessionId}/end`, { method: 'POST' });

        if (!res.ok) {
            // Surface the real error from the server
            let errMsg = 'Failed to finalize session.';
            try {
                const errBody = await res.json();
                errMsg = errBody.message || errBody.error || errMsg;
            } catch (parseErr) { console.error("Failed to parse error response:", parseErr); }
            showNotification(errMsg, 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Finalize Session'; }
            return;
        }

        const updated = await res.json();
        const idx = allSessions.findIndex(s => s.sessionId === activeSessionId);
        if (idx !== -1) allSessions[idx] = { ...allSessions[idx], ...updated };
        activeSession = allSessions[idx];

        disconnectWebSocket(); // Stop real-time updates once finalized
        document.getElementById('finalize-modal').classList.remove('hidden');
        loadRollCall(activeSessionId);
    } catch (err) {
        console.error('Finalize error:', err);
        showNotification('Network error. Please try again.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Finalize Session'; }
    }
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
    } catch (e) {
        console.error("confirmAndExportAttendance error:", e);
    }
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
    const bgColor = type === 'error' ? 'bg-rose-600 shadow-rose-500/30' : type === 'success' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-[#00B0FF] shadow-blue-500/20';
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
    } catch (e) {
        console.error("generatePin error:", e);
    }
};

window.toggleQrView = () => {
    const ov = document.getElementById('qr-overlay');
    if (ov.classList.contains('hidden')) {
        ov.classList.remove('hidden');
        ov.classList.add('flex');
        generateQr();
        startQrTimer();
    } else {
        ov.classList.add('hidden');
        ov.classList.remove('flex');
        stopQrTimer();
    }
};

function startQrTimer() {
    stopQrTimer();
    qrTimer = 30;
    updateQrUI();

    qrInterval = setInterval(() => {
        qrTimer--;
        if (qrTimer <= 0) {
            generateQr();
        } else {
            updateQrUI();
        }
    }, 1000);
}

function stopQrTimer() {
    if (qrInterval) clearInterval(qrInterval);
    qrInterval = null;
}

function updateQrUI() {
    const timerText = document.getElementById('qr-timer-text');
    const bar = document.getElementById('qr-progress-bar');
    if (timerText) timerText.textContent = `Refreshes in ${qrTimer}s`;
    if (bar) bar.style.width = `${(qrTimer / 30) * 100}%`;
}

async function generateQr() {
    try {
        const res = await fetch('/api/attendance/session-token', { method: 'POST', body: JSON.stringify({sessionId:activeSessionId, type:'QR'}), headers:{'Content-Type':'application/json'} });
        const data = await res.json();

        qrTimer = 30;
        updateQrUI();

        if (typeof window.QRCode !== 'undefined') {
            const cv = document.createElement('canvas');
            cv.className = 'w-full h-full rounded-xl';
            document.getElementById('qr-canvas-placeholder').innerHTML = '';
            document.getElementById('qr-canvas-placeholder').appendChild(cv);
            window.QRCode.toCanvas(cv, data.token, { width: 250, margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' } });
        }
    } catch (e) {
        console.error("generateQr error:", e);
    }
}

function disconnectWebSocket() { if (stompClient?.connected) stompClient.disconnect(); stompClient = null; }

// ── Send Mail & Documents Section ───────────────────────────────────────────
let selectedFiles = [];

window.handleFileSelection = function(input) {
    const preview = document.getElementById('file-list-preview');
    if (!preview) return;
    preview.innerHTML = '';
    selectedFiles = Array.from(input.files);
    
    if (selectedFiles.length === 0) return;
    
    selectedFiles.forEach((file, index) => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5';
        fileDiv.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
                <svg class="w-4 h-4 text-[#00B0FF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span class="text-xs font-semibold text-slate-700 truncate">${escapeHtml(file.name)}</span>
                <span class="text-[10px] text-slate-400 font-bold font-mono">${(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <button type="button" onclick="removeSelectedFile(${index})" class="text-slate-400 hover:text-red-500 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        `;
        preview.appendChild(fileDiv);
    });
};

window.removeSelectedFile = function(index) {
    selectedFiles.splice(index, 1);
    
    // Create a new DataTransfer to update the input's files
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    const fileInput = document.getElementById('doc-upload-file');
    if (fileInput) fileInput.files = dt.files;
    
    // Re-render
    handleFileSelection(fileInput);
};

window.sendMailSubmit = async function(event) {
    event.preventDefault();
    const classroomInput = document.getElementById('doc-upload-classroom');
    const targetInput = document.getElementById('doc-upload-target');
    const subjectInput = document.getElementById('doc-upload-title');
    const messageInput = document.getElementById('doc-upload-message');
    const fileInput = document.getElementById('doc-upload-file');
    const btn = document.getElementById('doc-upload-btn');

    if (!classroomInput.value || !targetInput.value || !subjectInput.value || !messageInput.value) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }

    btn.disabled = true;
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline-block" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Sending Email...`;

    const fd = new FormData();
    fd.append('targetType', targetInput.value);
    fd.append('classroomId', classroomInput.value);
    fd.append('subject', subjectInput.value);
    fd.append('content', messageInput.value);

    // Append multiple files
    if (fileInput && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
            fd.append('files', fileInput.files[i]);
        }
    }

    try {
        const res = await fetch('/api/announcements/send', {
            method: 'POST',
            body: fd
        });

        if (!res.ok) {
            let errMsg = 'Failed to send announcement.';
            try {
                const data = await res.json();
                errMsg = data.error || data.message || errMsg;
            } catch (_) {
                errMsg = await res.text() || errMsg;
            }
            throw new Error(errMsg);
        }

        showNotification('Email announcement sent successfully!', 'success');
        
        // Reset form
        subjectInput.value = '';
        messageInput.value = '';
        if (fileInput) fileInput.value = '';
        const preview = document.getElementById('file-list-preview');
        if (preview) preview.innerHTML = '';
        selectedFiles = [];
    } catch (e) {
        showNotification(e.message || 'Failed to send email.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
};

window.populateDocDropdowns = async function() {
    try {
        const res = await fetch('/api/teacher/stats/classes');
        const groups = await res.json();
        
        const cUpload = document.getElementById('doc-upload-classroom');
        if (!cUpload) return;

        const prevClassroom = cUpload.value;
        cUpload.innerHTML = '<option value="">Select Classroom...</option>';

        const uniqueClassrooms = new Map();
        groups.forEach(g => {
            uniqueClassrooms.set(g.classroomId, g.classroomName);
        });

        uniqueClassrooms.forEach((name, id) => {
            cUpload.add(new Option(name, id, false, String(id) === prevClassroom));
        });
    } catch (e) {
        console.error(e);
    }
};

window.loadMyDocuments = async function() {
    // Deprecated - documents list has been removed in favor of direct email attachments
};

// ── Notifications State & Logic ──────────────────────────────────────────────
let allNotifications = [];

window.loadNotifications = function() {
    fetch('/api/notifications/my')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            allNotifications = data || [];
            renderNotifications();
        })
        .catch(err => console.error('Error fetching notifications:', err));
};

function renderNotifications() {
    const listEl = document.getElementById('notification-list');
    const badgeEl = document.getElementById('notif-count-badge');
    if (!listEl) return;

    listEl.innerHTML = '';
    const unreadCount = allNotifications.filter(n => !n.isRead).length;

    if (badgeEl) {
        if (unreadCount > 0) {
            badgeEl.textContent = unreadCount;
            badgeEl.style.display = 'flex';
        } else {
            badgeEl.style.display = 'none';
        }
    }

    if (allNotifications.length === 0) {
        listEl.innerHTML = `
            <div class="p-8 text-center text-slate-400">
                <p class="text-xs font-bold">No new notifications</p>
            </div>`;
        return;
    }

    allNotifications.forEach(n => {
        const item = document.createElement('div');
        item.className = `p-4 flex flex-col gap-1.5 transition-colors cursor-pointer hover:bg-slate-50/50 ${n.isRead ? 'opacity-60' : 'bg-blue-50/10'}`;
        item.onclick = (e) => {
            e.stopPropagation();
            markNotificationRead(n.notificationId);
        };

        // Parse notification type for icon
        let iconHtml = '';
        if (n.type === 'TIMETABLE') {
            iconHtml = '<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-250">Timetable</span>';
        } else if (n.type === 'ANNOUNCEMENT') {
            iconHtml = '<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-250">Announcement</span>';
        } else {
            iconHtml = '<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-250">Notice</span>';
        }

        item.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                ${iconHtml}
                <span class="text-[10px] text-slate-400 font-bold">${new Date(n.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="text-xs font-semibold text-slate-700 leading-relaxed">${escapeHtml(n.message)}</p>
        `;
        listEl.appendChild(item);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

window.markNotificationRead = function(id) {
    fetch(`/api/notifications/${id}/read`, { method: 'POST' })
        .then(response => {
            if (response.ok) {
                allNotifications = allNotifications.map(n => n.notificationId === id ? { ...n, isRead: true } : n);
                renderNotifications();
            }
        })
        .catch(err => console.error('Error marking notification as read:', err));
};

window.markAllNotificationsRead = function() {
    fetch('/api/notifications/read-all', { method: 'POST' })
        .then(response => {
            if (response.ok) {
                allNotifications = allNotifications.map(n => ({ ...n, isRead: true }));
                renderNotifications();
            }
        })
        .catch(err => console.error('Error marking all notifications as read:', err));
};

// Toggle Notification Dropdown
document.addEventListener('DOMContentLoaded', () => {
    const notifBtn = document.getElementById('notification-btn');
    const notifPanel = document.getElementById('notification-panel');

    if (notifBtn && notifPanel) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('hidden');
            if (!notifPanel.classList.contains('hidden')) {
                loadNotifications();
            }
        });

        document.addEventListener('click', (e) => {
            if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
                notifPanel.classList.add('hidden');
            }
        });
    }
});
