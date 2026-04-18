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
    if (!startTime || !endTime) return null;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    // 8am to 5pm (17:00)
    // Row 2 is 8:00
    // Each row is 30 mins
    const startRow = ((startH - 8) * 2) + (startM >= 30 ? 1 : 0) + 2;
    const endRow = ((endH - 8) * 2) + (endM >= 30 ? 1 : 0) + 2;
    
    return { start: startRow, end: endRow };
}

function renderGrid() {
    const matrix = document.getElementById('timetable-matrix');
    const mobileList = document.getElementById('mobile-sessions-list');
    if (!matrix || !mobileList) return;

    // 1. Calculate Stats for Overview
    const totalClasses = allSessions.length;
    const doneClasses = allSessions.filter(s => s.status === 'COMPLETED').length;
    updateOverview(totalClasses, doneClasses);

    // 2. Render Desktop Matrix
    // Save and restore the 7 static header elements
    const headerEls = Array.from(matrix.children).slice(0, 7).map(el => el.cloneNode(true));
    matrix.innerHTML = '';
    headerEls.forEach(h => matrix.appendChild(h));

    // Generate background grid: one entry per 30-min slot per day
    // Rows: 1=header, rows 2..19 = 30min slots from 08:00 to 17:00 (9 hours × 2 = 18 slots)
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    for (let slot = 0; slot < 18; slot++) {
        const rowIndex = slot + 2; // CSS grid row (1-based, row 1 = header)
        const hour = 8 + Math.floor(slot / 2);
        const mins = slot % 2 === 0 ? '00' : '30';

        // Time label only on :00 slots, spanning 2 rows
        if (slot % 2 === 0) {
            const label = document.createElement('div');
            label.className = 'time-label';
            label.style.gridRow = `${rowIndex} / span 2`;
            label.style.gridColumn = '1';
            label.textContent = `${String(hour).padStart(2,'0')}:00`;
            matrix.appendChild(label);
        }

        // One background slot per column per 30-min row
        for (let d = 0; d < 6; d++) {
            const cell = document.createElement('div');
            // Full hour = solid soft border, Half hour = dashed very soft border
            // Removed alternating backgrounds so the grid is purely white with soft lines
            cell.className = `timetable-slot ${slot % 2 === 0 ? 'border-b border-slate-100' : 'border-b border-dashed border-slate-100/50'}`;
            cell.style.gridRow = String(rowIndex);
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
            card.style.gridRow = `${pos.start} / ${pos.end}`;
            card.style.gridColumn = String(dayIdx + 2);
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

function updateOverview(totalToday, doneToday) {
    const totalEl = document.getElementById('stat-sessions-total');
    const doneEl = document.getElementById('stat-sessions-done');
    const pctEl = document.getElementById('stat-sessions-pct');

    if (totalEl) totalEl.textContent = String(totalToday);
    if (doneEl) doneEl.textContent = String(doneToday);
    if (pctEl) {
        const pct = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;
        pctEl.textContent = `${pct}%`;
    }
    
    // Sync Pending count (unfinalized sessions across all time)
    const pendingCount = allSessions.filter(s => s.status === 'IN_PROGRESS' || (s.status === 'COMPLETED' && !s.isValidated)).length;
    const pendingEl = document.getElementById('pending-attendance-count');
    if (pendingEl) pendingEl.textContent = String(pendingCount);

    // Update new dashboard stats
    updateDashboardStats();
    updateTodayClasses();
    updatePendingGrading();
}

function updateDashboardStats() {
    // Calculate unique classes
    const uniqueClasses = new Set();
    allSessions.forEach(s => {
        if (s.classroomId && s.courseId) {
            uniqueClasses.add(`${s.classroomId}-${s.courseId}`);
        }
    });
    const myClassesEl = document.getElementById('stat-my-classes');
    if (myClassesEl) myClassesEl.textContent = String(uniqueClasses.size);

    // Calculate total students
    const uniqueStudents = new Set();
    allSessions.forEach(s => {
        if (s.classroomId) {
            // This is an approximation - in real implementation, fetch from backend
        }
    });
    const totalStudentsEl = document.getElementById('stat-total-students');
    if (totalStudentsEl) {
        // Keep placeholder for now - should be fetched from backend
        totalStudentsEl.textContent = '142';
    }

    // Calculate average attendance
    const completedSessions = allSessions.filter(s => s.status === 'COMPLETED');
    let totalAttendance = 0;
    let sessionCount = 0;
    completedSessions.forEach(s => {
        if (s.attendanceRate !== undefined && s.attendanceRate !== null) {
            totalAttendance += s.attendanceRate;
            sessionCount++;
        }
    });
    const avgAttendance = sessionCount > 0 ? Math.round(totalAttendance / sessionCount) : 94;
    const avgAttendanceEl = document.getElementById('stat-avg-attendance');
    if (avgAttendanceEl) avgAttendanceEl.textContent = `${avgAttendance}%`;

    // Pending grading
    const pendingCount = allSessions.filter(s =>
        (s.status === 'COMPLETED' && !s.isValidated) || s.status === 'IN_PROGRESS'
    ).length;
    const pendingGradingEl = document.getElementById('stat-pending-grading');
    if (pendingGradingEl) pendingGradingEl.textContent = String(pendingCount);
}

function updateTodayClasses() {
    const todayClassesEl = document.getElementById('today-classes-list');
    if (!todayClassesEl) return;

    const today = new Date().toISOString().split('T')[0];
    const todaySessions = allSessions
        .filter(s => s.date === today)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    if (todaySessions.length === 0) {
        todayClassesEl.innerHTML = '<div class="text-sm text-slate-500 py-8 text-center">No classes scheduled for today</div>';
        return;
    }

    todayClassesEl.innerHTML = todaySessions.map(s => {
        const timeStr = s.startTime ? s.startTime.substring(0, 5) : '--:--';
        const endTimeStr = s.endTime ? s.endTime.substring(0, 5) : '--:--';
        const isActive = s.status === 'IN_PROGRESS';
        const isDone = s.status === 'COMPLETED';

        let statusBadge = '';
        if (isActive) {
            statusBadge = '<span class="text-xs text-red-600 font-semibold">LIVE</span>';
        } else if (isDone) {
            statusBadge = '<span class="text-xs text-green-600 font-semibold">Completed</span>';
        } else {
            statusBadge = `<span class="text-xs text-slate-500">${s.attendanceRate || '0'}%</span>`;
        }

        return `
            <div class="border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer ${isActive ? 'bg-blue-50 border-blue-300' : ''}" onclick="handleSessionAction(${s.sessionId})">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                        <h4 class="font-semibold text-slate-900 text-sm">${s.courseName || 'Course'}</h4>
                        <p class="text-xs text-slate-500 mt-1">${s.classroomName || 'Classroom'}</p>
                    </div>
                    ${statusBadge}
                </div>
                <div class="flex items-center gap-2 text-xs text-slate-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>${timeStr} - ${endTimeStr}</span>
                </div>
                <div class="mt-2 text-xs text-slate-500">
                    Attendance Rate: <span class="font-semibold">${s.attendanceRate || 0}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function updatePendingGrading() {
    const pendingGradingEl = document.getElementById('pending-grading-list');
    if (!pendingGradingEl) return;

    const pendingSessions = allSessions.filter(s =>
        (s.status === 'COMPLETED' && !s.isValidated) || s.status === 'IN_PROGRESS'
    ).sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return b.date.localeCompare(a.date);
    }).slice(0, 5); // Show only top 5

    if (pendingSessions.length === 0) {
        pendingGradingEl.innerHTML = '<div class="text-sm text-slate-500 py-8 text-center">No pending grading items</div>';
        return;
    }

    pendingGradingEl.innerHTML = pendingSessions.map(s => {
        const progress = s.attendanceRate || 0;
        const date = s.date ? new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

        return `
            <div class="space-y-2">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h4 class="font-semibold text-slate-900 text-sm">${s.courseName || 'Course'}</h4>
                        <p class="text-xs text-slate-500">${s.classroomName || 'Classroom'}</p>
                    </div>
                    <span class="text-xs text-slate-500">${date}</span>
                </div>
                <div class="w-full">
                    <div class="flex items-center justify-between text-xs mb-1">
                        <span class="text-slate-500">Progress</span>
                        <span class="font-semibold text-slate-900">${Math.round(progress)}%</span>
                    </div>
                    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 transition-all" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.takeAttendanceFromOverview = function() {
    if (nextSessionContext) handleSessionAction(nextSessionContext.sessionId);
};

function renderSessionCard(s, isGrid = false) {
    const isActive = s.status === 'IN_PROGRESS';
    const isDone = s.status === 'COMPLETED';
    const isValid = s.isValidated === true;
    
    let statusClasses = 'bg-slate-100 text-slate-500 border border-slate-200';
    if (isActive) statusClasses = 'bg-blue-600 text-white shadow-md shadow-blue-500/20';
    else if (isDone) statusClasses = isValid ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white';

    const clickAction = isDone ? `viewAttendancePdf(${s.sessionId})` : `handleSessionAction(${s.sessionId})`;

    if (isGrid) {
        let cardBg = 'border-indigo-300 bg-indigo-50/80 hover:bg-indigo-100/80';
        let textCourse = 'text-indigo-950';
        let textTime = 'text-indigo-600';
        let textRoom = 'text-indigo-500';

        if (isActive) {
            cardBg = 'border-[#0091D5] bg-[#00B0FF] shadow-md shadow-blue-500/30 hover:bg-blue-400';
            textCourse = 'text-white';
            textTime = 'text-blue-50';
            textRoom = 'text-blue-100';
        } else if (isDone) {
            cardBg = 'border-emerald-600 bg-emerald-500 hover:bg-emerald-400';
            textCourse = 'text-white';
            textTime = 'text-emerald-50';
            textRoom = 'text-emerald-100';
        }

        return `
            <div onclick="${clickAction}" class="h-full w-full p-2 rounded-xl border-l-4 ${cardBg} cursor-pointer transition-all flex flex-col justify-start gap-1 overflow-hidden relative">
                ${isDone ? '<div class="absolute top-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-emerald-600"><svg class="w-2 h-2" fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg></div>' : ''}
                <p class="text-[10px] font-black ${textCourse} truncate leading-tight w-[85%]">${s.courseName || 'Course'}</p>
                <div class="flex flex-col gap-0.5">
                    <span class="text-[9px] font-bold ${textTime}">${(s.startTime||'--:--').substring(0,5)}–${(s.endTime||'--:--').substring(0,5)}</span>
                    <span class="text-[9px] font-medium ${textRoom} truncate">${s.classroomName || ''}</span>
                </div>
            </div>`;
    }

    const dateStr = s.date ? new Date(s.date).toLocaleDateString('en-GB', {weekday:'short', day:'2-digit', month:'short'}) : 'TBD';

    return `
        <div onclick="${clickAction}" class="bg-white p-4 rounded-2xl border-2 ${isActive ? 'border-[#00B0FF] shadow-blue-500/10' : 'border-slate-100'} flex items-center justify-between group active:scale-[0.98] transition-all">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'} flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                    <h4 class="text-sm font-black text-slate-900 mb-0.5">${s.courseName || 'Course'}</h4>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${s.startTime?.substring(0,5)} • ${s.classroomName || 'Room'}</p>
                </div>
            </div>
            <div class="flex flex-col items-end gap-1">
                <span class="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${statusClasses}">${isDone ? (isValid ? 'DONE' : 'CLOSED') : (isActive ? 'LIVE' : 'WAIT')}</span>
                <span class="text-[9px] font-bold text-slate-300">${dateStr}</span>
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

// ── Real-time Socket Engine ─────────────────────────────────────────────
function connectWebSocket(sessionId) {
    disconnectWebSocket(); // clear any previous connection
    
    const socket = new SockJS('/ws'); 
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // disable noisy console logs
    
    stompClient.connect({}, function (frame) {
        stompClient.subscribe('/topic/session/' + sessionId, function (message) {
            const dto = JSON.parse(message.body);
            updateRollCallRealTime(dto);
        });
    });
}

function disconnectWebSocket() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
}

function updateRollCallRealTime(dto) {
    // Check if the student row exists in the grid
    const row = document.querySelector(`.student-row[data-student-id="${dto.userId}"]`);
    if (!row) return;

    // Visual effect: highlight row quickly
    row.classList.add('bg-blue-100/50', 'transition-colors', 'duration-300');
    setTimeout(() => row.classList.remove('bg-blue-100/50'), 600);

    // Update checkboxes depending on the hours attended returned
    if (dto.hoursAttended && dto.hoursAttended > 0) {
        document.querySelectorAll(`.slot-checkbox[data-user-id="${dto.userId}"]`).forEach(cb => {
            cb.checked = true;
        });
    }

    // Add "Scanned" badge if not present by extracting the text container
    const nameContainer = row.querySelector('.flex.items-center.gap-2');
    if (nameContainer && !nameContainer.innerHTML.includes('Scanned')) {
        nameContainer.insertAdjacentHTML('beforeend', '<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase tracking-widest rounded-md">Scanned</span>');
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

    // Build header
    let headHtml = `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] w-1/3">Student</th>`;
    for (let i = 0; i < totalHours; i++) {
        headHtml += `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] text-center">H${i+1}</th>`;
    }
    headHtml += `<th class="px-5 py-4 font-black text-[#00B0FF] uppercase tracking-widest text-[10px] text-center">Actions</th>`;
    thead.innerHTML = headHtml;

    tbody.innerHTML = records.map(r => {
        const isLive = r.isLive;
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
            <tr class="student-row hover:bg-blue-50/30 transition-colors border-b border-slate-50 last:border-0 ${isLive ? 'bg-blue-50/40' : ''}" data-student-id="${r.userId}">
                <td class="px-5 py-4">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-black text-slate-900">${r.firstName} ${r.lastName}</span>
                            ${isLive ? '<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase tracking-widest rounded-md">Scanned</span>' : ''}
                        </div>
                        <span class="text-[10px] font-bold text-slate-400 font-mono tracking-tight">${r.matricule || 'NO-MATRIC'}</span>
                    </div>
                </td>
                ${hoursHtml}
                <td class="px-4 py-3 text-center align-middle">
                    <button onclick="teacherMarkAllPresent(${r.userId})"
                            title="Mark all hours present"
                            class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-sm shadow-emerald-500/20">
                        ✓ All
                    </button>
                </td>
            </tr>`;
    }).join('');
}

window.markHourStatus = async (userId, hourIndex, isPresent) => {
    try {
        await fetch(`/api/attendance/session/${activeSessionId}/student/${userId}/hour/${hourIndex}?status=${isPresent ? 'PRESENT' : 'ABSENT'}`, { method: 'POST' });
    } catch {
        showNotification('Update failed', 'error');
    }
};

window.teacherMarkAllPresent = async (userId) => {
    try {
        await fetch('/api/attendance/teacher/verify-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: activeSessionId, userId })
        });
        // Immediately update all checkboxes for this student in the UI
        document.querySelectorAll(`.slot-checkbox[data-user-id="${userId}"]`).forEach(cb => cb.checked = true);
        showNotification('Marked all present.', 'success');
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
            } catch (_) {}
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
        ov.classList.add('flex');
        generateQr();
        connectWebSocket();
        startQrTimer();
    } else {
        ov.classList.add('hidden');
        ov.classList.remove('flex');
        disconnectWebSocket();
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
