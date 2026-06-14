/**
 * Student Dashboard - Precision Attendance Engine
 */

let allGridSessions = [];
let html5QrScanner = null;
let selectedMobileDay = 'MONDAY';
let currentCheckinContext = {
    sessionId: null,
    qrCode: null,
    pin: null,
    lat: null,
    lng: null
};

let currentCourses = [];
let currentHistory = [];
let currentJustifications = [];

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

let currentScheduleWeek = getISOWeek(new Date());

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Dashboard (Only load active view stats and sessions)
    loadDashboardStats();
    loadGridSessions();
    loadNotifications();
    // Temporarily disabled to prevent looping in Chrome/Attendee App
    // if (typeof initializeGlobalWebSockets === 'function') initializeGlobalWebSockets();
});

window.initializeGlobalWebSockets = function() {
    if (typeof window.SockJS === 'undefined' || typeof window.Stomp === 'undefined') return;
    
    const socket = new window.SockJS('/ws', null, { transports: ['websocket'] });
    const globalStompClient = window.Stomp.over(socket);
    globalStompClient.debug = null;

    globalStompClient.connect({}, function (frame) {
        console.log('Connected to Global WebSocket');
        
        // Subscribe to user-specific notifications
        globalStompClient.subscribe('/user/queue/notifications', function (msg) {
            const notification = JSON.parse(msg.body);
            Swal.fire({
                title: 'Notification',
                text: notification.message,
                icon: 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000
            });
            if (typeof loadNotifications === 'function') loadNotifications();
        });

        // Subscribe to session updates
        globalStompClient.subscribe('/topic/sessions', function (msg) {
            console.log('Session update received via WebSocket');
            if (typeof loadGridSessions === 'function') loadGridSessions();
        });
    }, function (error) {
        console.error('Global WebSocket error:', error);
        setTimeout(initializeGlobalWebSockets, 5000);
    });
};

/**
 * --- TAB NAVIGATION ---
 */
const TAB_MAP = {
    status:        { view: 'view-status',        desk: 'nav-desk-status',        mob: 'nav-mob-status' },
    calendar:      { view: 'view-calendar',      desk: 'nav-desk-calendar',      mob: 'nav-mob-calendar' },
    justification: { view: 'view-justification', desk: 'nav-desk-justification', mob: 'nav-mob-justification' },
    courses:       { view: 'view-courses',       desk: 'nav-desk-courses',        mob: 'nav-mob-courses' },
    stats:         { view: 'view-stats',         desk: 'nav-desk-stats',          mob: null },
    settings:      { view: 'view-settings',      desk: 'nav-desk-settings',       mob: 'nav-mob-settings' },
};

function switchTab(tabId) {
    // Reset scroll position to top
    const scrollingContent = document.getElementById('main-scrolling-content');
    if (scrollingContent) scrollingContent.scrollTop = 0;

    // Hide all views
    Object.values(TAB_MAP).forEach(t => {
        const el = document.getElementById(t.view);
        if (el) el.classList.add('hidden');
    });

    // Remove active from all nav items
    document.querySelectorAll('.nav-desktop, .nav-mobile').forEach(el => {
        el.classList.remove('active');
        if (el.classList.contains('nav-desktop')) el.classList.add('text-slate-500');
    });

    const t = TAB_MAP[tabId];
    if (!t) return;

    // Show target view
    const view = document.getElementById(t.view);
    if (view) view.classList.remove('hidden');

    // Activate nav items
    if (t.desk) {
        const d = document.getElementById(t.desk);
        if (d) {
            d.classList.add('active');
            d.classList.remove('text-slate-500');
        }
    }
    if (t.mob) {
        const m = document.getElementById(t.mob);
        if (m) m.classList.add('active');
    }

    // Load data based on tab
    if (tabId === 'checkin' || tabId === 'calendar') loadGridSessions();
    if (tabId === 'courses') loadCourseStats();
    if (tabId === 'justification') loadAttendanceHistory();
}

/**
 * --- 1. STATUS RING & HOME WIDGET ---
 */
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/student/dashboard/stats');
        if (!response.ok) throw new Error("Stats sync failed");
        
        const stats = await response.json();
        const score = stats.overallAttendanceRate != null ? Math.round(stats.overallAttendanceRate) : 100;
        
        updatePresenceRing(score);
    } catch (err) {
        console.error("Stats error:", err);
    }
}

function updatePresenceRing(percentage) {
    const ring = document.getElementById('status-ring-progress');
    const text = document.getElementById('ring-text');
    const pctMsg = document.getElementById('presence-percentage');
    const label = document.getElementById('status-label');
    
    // SVG Dash Array calculation
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    ring.style.strokeDasharray = `${circumference}, ${circumference}`;
    ring.style.strokeDashoffset = offset;
    
    text.textContent = `${percentage}%`;
    pctMsg.textContent = `${percentage}%`;
    
    if (percentage >= 80) {
        ring.classList.replace('stroke-blue-500', 'stroke-emerald-500');
        label.classList.replace('bg-slate-100', 'bg-emerald-50');
        label.classList.replace('text-slate-400', 'text-emerald-600');
        label.textContent = "Safe Zone";
    } else if (percentage >= 70) {
        ring.classList.replace('stroke-blue-500', 'stroke-amber-500');
        label.classList.replace('bg-slate-100', 'bg-amber-50');
        label.classList.replace('text-slate-400', 'text-amber-600');
        label.textContent = "Warning";
    } else {
        ring.classList.replace('stroke-blue-500', 'stroke-rose-500');
        label.classList.replace('bg-slate-100', 'bg-rose-50');
        label.classList.replace('text-slate-400', 'text-rose-600');
        label.textContent = "Critical";
    }
}

function enableCheckinWidget(session) {
    const widget = document.getElementById('check-in-widget');
    const title = document.getElementById('current-session-name');
    const desc = document.getElementById('current-session-details');
    const btn = document.getElementById('start-scan-btn');
    
    widget.classList.add('ring-2', 'ring-blue-400', 'cursor-pointer');
    
    const safeStart = session.startTime ? String(session.startTime).substring(0,5) : '--:--';
    const safeEnd = session.endTime ? String(session.endTime).substring(0,5) : '--:--';
    const profName = session.teacherName || 'TBD';
    const roomName = session.classroomName && session.classroomName !== 'N/A' ? session.classroomName : 'Room TBD';

    title.textContent = session.courseName || 'Unknown Course';
    desc.innerHTML = `Live Now • ${safeStart} - ${safeEnd}<br>Prof. ${profName} • ${roomName}`;
    desc.classList.remove('text-[10px]', 'italic', 'text-slate-300');
    desc.classList.add('text-xs', 'text-blue-100');
    
    btn.disabled = false;
    btn.classList.add('bg-[#00B0FF]', 'text-white', 'hover:bg-blue-600', 'shadow-md');
    btn.classList.remove('bg-white/10', 'text-white/50');
    
    // Bind click wrapper bounds
    const trigger = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openScanner(session.sessionId);
    };
    
    btn.onclick = trigger;
    widget.onclick = trigger;
}


/**
 * --- 2. GRID SYSTEM ---
 */
async function loadGridSessions() {
    const stack = document.getElementById('student-schedule-stack');
    try {
        const response = await fetch('/api/student/sessions/grid?week=' + currentScheduleWeek);
        allGridSessions = await response.json();
        
        // Update week display
        const weekDisplay = document.getElementById('current-week-display');
        if (weekDisplay) {
            weekDisplay.textContent = 'Week ' + currentScheduleWeek;
        }
        
        // Update Home Check-in Widget if there's a LIVE session
        const active = allGridSessions.find(s => s.status === 'IN_PROGRESS');
        if (active) {
            enableCheckinWidget(active);
        }

        // Add 'day' parameter manually because Student DTO only sends 'date'
        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        allGridSessions.forEach(s => {
            if (s.date) {
                const d = new Date(s.date);
                s.day = dayNames[d.getDay()];
            }
        });

        // Update Date and Today's Class Count
        const dateEl = document.getElementById('current-date-student');
        const countBadge = document.getElementById('today-count-student');
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        
        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = now.toLocaleDateString('en-US', options);
        }
        
        const sessionsToday = allGridSessions.filter(s => s.date === todayStr);
        if (countBadge) {
            countBadge.textContent = `${sessionsToday.length} ${sessionsToday.length === 1 ? 'class' : 'classes'} today`;
        }

        renderGrid();
    } catch (err) {
        if (stack) stack.innerHTML = `<p class="text-rose-500 font-bold text-center col-span-full">Sync Error: ${err.message}</p>`;
    }
}

window.setMobileDay = function(day) {
    selectedMobileDay = day;
    document.querySelectorAll('.day-tab').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        btn.classList.toggle('active', onclickAttr.includes(`'${day}'`));
    });
    renderGrid();
};

window.changeWeek = function(delta) {
    currentScheduleWeek += delta;
    if (currentScheduleWeek < 1) currentScheduleWeek = 52;
    if (currentScheduleWeek > 52) currentScheduleWeek = 1;
    loadGridSessions();
};

function calculateGridPosition(startStr, endStr) {
    if (!startStr || !endStr) return null;
    const sTime = startStr.split(':');
    const eTime = endStr.split(':');
    if (sTime.length < 2 || eTime.length < 2) return null;

    const sHour = parseInt(sTime[0], 10), sMin = parseInt(sTime[1], 10);
    const eHour = parseInt(eTime[0], 10), eMin = parseInt(eTime[1], 10);

    const sMinutesSince8 = (sHour - 8) * 60 + sMin;
    const eMinutesSince8 = (eHour - 8) * 60 + eMin;

    if (sMinutesSince8 < 0 || eMinutesSince8 <= sMinutesSince8) return null;

    // 1 minute = 1 row. Base row is 2 (row 1 is header)
    const startRow = sMinutesSince8 + 2; 
    const endRow = eMinutesSince8 + 2;
    
    return { start: startRow, end: endRow };
}

function renderGrid() {
    const matrix = document.getElementById('timetable-matrix');
    const mobileList = document.getElementById('student-schedule-stack');
    if (!matrix || !mobileList) return;

    // 1. Render Desktop Matrix
    const headerEls = Array.from(matrix.children).slice(0, 7).map(el => el.cloneNode(true));
    matrix.innerHTML = '';
    headerEls.forEach(h => matrix.appendChild(h));

    // Create 9 hour blocks (8:00 to 17:00)
    for (let hourOffset = 0; hourOffset < 9; hourOffset++) {
        const hour = 8 + hourOffset;
        const startRow = (hourOffset * 60) + 2;

        const label = document.createElement('div');
        label.className = 'time-label';
        label.style.gridRow = `${startRow} / span 60`;
        label.style.gridColumn = '1';
        label.textContent = `${String(hour).padStart(2,'0')}:00`;
        matrix.appendChild(label);

        for (let d = 0; d < 6; d++) {
            const cell = document.createElement('div');
            cell.className = `timetable-slot border-b border-r border-slate-200`;
            cell.style.gridRow = `${startRow} / span 60`;
            cell.style.gridColumn = String(d + 2);
            matrix.appendChild(cell);
        }
    }

    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    allGridSessions.forEach(s => {
        const pos = calculateGridPosition(s.startTime, s.endTime);
        const dayIdx = days.indexOf(s.day?.toUpperCase());
        if (pos && dayIdx !== -1 && pos.start < pos.end) {
            const card = document.createElement('div');
            card.className = 'session-card-grid';
            card.style.gridRow = `${pos.start} / ${pos.end}`;
            card.style.gridColumn = String(dayIdx + 2);
            card.style.zIndex = '10';
            card.style.margin = '2px';
            card.innerHTML = renderSessionCard(s, true);
            matrix.appendChild(card);
        }
    });

    // 2. Render Mobile List
    const mobileDay = selectedMobileDay || 'MONDAY';
    const mobileSessions = allGridSessions
        .filter(s => s.day?.toUpperCase() === mobileDay)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    if (mobileSessions.length === 0) {
        mobileList.innerHTML = `<div class="py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No sessions for ${mobileDay.charAt(0) + mobileDay.slice(1).toLowerCase()}</div>`;
    } else {
        mobileList.innerHTML = mobileSessions.map(s => renderSessionCard(s, false)).join('');
    }
}

function handleSessionClick(sessionId, status) {
    if (status === 'IN_PROGRESS') {
        openScanner(sessionId);
    } else if (status === 'SCHEDULED') {
        Swal.fire('Session Scheduled', 'The course has not been initiated by the instructor yet. Please wait.', 'info');
    } else if (status === 'COMPLETED') {
        const s = allGridSessions.find(x => x.sessionId === sessionId);
        const st = s?.attendanceStatus || 'ABSENT';
        Swal.fire('Session Complete', `Your attendance status is: ${st}`, 'success');
    } else if (status === 'MISSED') {
        Swal.fire('Session Missed', 'This session was scheduled but did not take place. No attendance can be recorded.', 'warning');
    }
}

function renderSessionCard(s, isGrid = false) {
    const isLive = s.status === 'IN_PROGRESS';
    const isDone = s.status === 'COMPLETED';
    const isMissed = s.status === 'MISSED';
    const isAttended = s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'LATE';
    
    // Grid mode
    if (isGrid) {
        let cardBg = 'border-indigo-300 bg-indigo-50/80 hover:bg-indigo-100/80';
        let textCourse = 'text-indigo-950';
        let textTime = 'text-indigo-600';
        let textRoom = 'text-indigo-500';

        if (isLive) {
            cardBg = 'border-[#0091D5] bg-[#00B0FF] shadow-md shadow-blue-500/30 hover:bg-blue-400 animate-pulse-subtle';
            textCourse = 'text-white';
            textTime = 'text-blue-50';
            textRoom = 'text-blue-100';
        } else if (isDone) {
            cardBg = isAttended ? 'border-emerald-600 bg-emerald-500 hover:bg-emerald-400' : 'border-slate-400 bg-slate-200 hover:bg-slate-300';
            textCourse = isAttended ? 'text-white' : 'text-slate-700';
            textTime = isAttended ? 'text-emerald-50' : 'text-slate-500';
            textRoom = isAttended ? 'text-emerald-100' : 'text-slate-400';
        } else if (isMissed) {
            cardBg = 'border-slate-300 bg-slate-100/60 opacity-60 grayscale-[0.5]';
            textCourse = 'text-slate-600 line-through';
            textTime = 'text-slate-400';
            textRoom = 'text-slate-400';
        }

        // Onlick triggers handleSessionClick
        const clickAction = `handleSessionClick(${s.sessionId}, '${s.status}')`;
        const badgeHtml = isLive ? '<span class="absolute top-1 right-1 px-1 py-0.5 bg-red-500 text-white text-[7px] font-black rounded">LIVE</span>' : 
                         (isMissed ? '<span class="absolute top-1 right-1 px-1 py-0.5 bg-slate-400 text-white text-[7px] font-black rounded uppercase">Missed</span>' : '');

        return `
            <div onclick="${clickAction}" class="h-full w-full p-2 rounded-xl border-l-4 ${cardBg} cursor-pointer transition-all flex flex-col justify-start gap-1 overflow-hidden relative">
                ${isAttended && isDone ? '<div class="absolute top-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-emerald-600"><svg class="w-2 h-2" fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg></div>' : badgeHtml}
                <p class="text-[10px] font-black ${textCourse} truncate leading-tight w-[85%]">${s.courseName || 'Course'}</p>
                <div class="flex flex-col gap-0.5">
                    <span class="text-[9px] font-bold ${textTime}">${(s.startTime||'--:--').substring(0,5)}–${(s.endTime||'--:--').substring(0,5)}</span>
                    <span class="text-[9px] font-medium ${textRoom} truncate">${s.classroomName || ''}</span>
                    ${isDone ? `<span class="text-[7px] font-black mt-0.5 ${isAttended ? 'text-emerald-100' : 'text-slate-400'}">${s.attendanceStatus || 'ABSENT'}</span>` : ''}
                </div>
            </div>`;
    }
    
    // Mobile layout
    const statusLabel = isLive ? 'LIVE' : (isMissed ? 'MISSED' : (isDone ? 'DONE' : 'WAIT'));
    let statusBg = 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    if (isLive) statusBg = 'bg-[#00B0FF] text-white shadow-md shadow-blue-500/30 animate-pulse';
    else if (isDone) statusBg = 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30';
    else if (isMissed) statusBg = 'bg-rose-100 text-rose-600 border border-rose-200';

    return `
        <div onclick="handleSessionClick(${s.sessionId}, '${s.status}')" class="bg-white p-5 rounded-2xl border-2 ${isLive ? 'border-[#00B0FF] shadow-lg shadow-blue-500/10' : 'border-slate-100'} ${isMissed ? 'opacity-60' : ''} hover:border-[#00B0FF]/30 cursor-pointer transition-all flex items-center justify-between group">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl ${isLive ? 'bg-blue-50 text-blue-600' : (isDone ? (isAttended ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400') : 'bg-slate-50 text-slate-400')} flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                    <h4 class="text-sm font-black text-slate-900 mb-0.5 line-clamp-1 ${isMissed ? 'line-through' : ''}">${s.courseName}</h4>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${(s.startTime||'--:--').substring(0,5)} • ${s.teacherName}</p>
                </div>
            </div>
            <div class="flex flex-col items-end gap-1">
                <span class="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${statusBg}">${statusLabel}</span>
                ${isAttended && isDone ? '<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>' : ''}
                ${!isAttended && isDone && !isMissed ? '<span class="text-[8px] font-black text-rose-500">ABSENT</span>' : ''}
            </div>
        </div>
    `;
}

/**
 * --- 3. COURSE METRICS ---
 */
async function loadCourseStats() {
    const container = document.getElementById('course-stats-container');
    try {
        const response = await fetch('/api/student/attendance/stats');
        const stats = await response.json();
        
        // Populate summary cards
        const totalCourses = stats.length;
        const totalAttended = stats.reduce((acc, c) => acc + (c.studentAttendedHours || 0), 0);
        const totalObjective = stats.reduce((acc, c) => acc + (c.courseTotalHours || 0), 0);
        const overallRate = totalObjective > 0 ? Math.round((totalAttended / totalObjective) * 100) : 0;

        document.getElementById('total-enrolled-courses').textContent = totalCourses;
        document.getElementById('total-attended-hours').textContent = totalAttended + 'h';
        document.getElementById('overall-yield').textContent = overallRate + '%';
        
        currentCourses = stats;
        searchCourses();

    } catch (err) {
        container.innerHTML = `<p class="text-rose-500 font-bold text-center col-span-full">Failed to load courses: ${err.message}</p>`;
    }
}

function searchCourses() {
    const container = document.getElementById('course-stats-container');
    const searchInput = document.getElementById('course-search-input');
    const thresholdFilter = document.getElementById('course-threshold-filter');
    const sortFilter = document.getElementById('course-sort-filter');
    
    if (!container) return;
    
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const threshold = thresholdFilter ? thresholdFilter.value : '';
    const sortBy = sortFilter ? sortFilter.value : 'name';
    
    let filtered = [...currentCourses];
    
    // 1. Search Filter
    if (query) {
        filtered = filtered.filter(c => 
            c.courseName.toLowerCase().includes(query) || 
            (c.teacherName && c.teacherName.toLowerCase().includes(query))
        );
    }
    
    // 2. Threshold Filter
    if (threshold) {
        filtered = filtered.filter(c => {
            const pct = Math.round(c.attendanceRate);
            if (threshold === 'CRITICAL') return pct < 75;
            if (threshold === 'WARNING') return pct >= 75 && pct <= 85;
            if (threshold === 'GOOD') return pct > 85;
            return true;
        });
    }
    
    // 3. Sort
    filtered.sort((a, b) => {
        if (sortBy === 'name') {
            return a.courseName.localeCompare(b.courseName);
        } else if (sortBy === 'yield-low') {
            return a.attendanceRate - b.attendanceRate;
        } else if (sortBy === 'yield-high') {
            return b.attendanceRate - a.attendanceRate;
        }
        return 0;
    });
    
    // 4. Render
    if (filtered.length === 0) {
        container.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm col-span-full">No courses match the filters.</div>`;
        return;
    }

    const html = filtered.map(c => {
        const pct = Math.round(c.attendanceRate);
        let colorClass = 'text-[#00B0FF] bg-blue-50 border-blue-100';
        let barClass = 'from-blue-500 to-[#00B0FF]';
        
        if (pct < 75) {
            colorClass = 'text-red-600 bg-red-50 border-red-100';
            barClass = 'from-red-500 to-rose-600';
        } else if (pct <= 85) {
            colorClass = 'text-amber-600 bg-amber-50 border-amber-100';
            barClass = 'from-amber-400 to-amber-600';
        }

        return `
        <div class="bg-white p-4 rounded-2xl border border-slate-100 hover:border-[#00B0FF]/30 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#00B0FF] border border-blue-100 flex-shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-900 leading-tight">${c.courseName}</h4>
                    <p class="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        ${c.teacherName || 'TBD'}
                    </p>
                </div>
            </div>
            
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                <div class="flex-1 sm:w-32 w-full">
                    <div class="flex justify-between mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        <span>Progress</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                        <div class="bg-gradient-to-r ${barClass} h-full rounded-full transition-all duration-1000" style="width: ${pct}%"></div>
                    </div>
                </div>

                <div class="flex flex-col items-start sm:items-end">
                    <span class="text-base font-black text-slate-800">${c.studentAttendedHours}h</span>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Attended</p>
                </div>

                <div class="flex flex-col items-start sm:items-end">
                    <span class="text-base font-black text-slate-500">${c.courseTotalHours}h</span>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Objective</p>
                </div>

                <div class="${colorClass} px-2.5 py-1 rounded-lg border font-black text-[9px] uppercase tracking-widest self-start sm:self-center">
                    ${pct}% Yield
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = html;
}

/**
 * --- 4. CHECK-IN : QR OU PIN (exclusif) ---
 * L'étudiant choisit un seul moyen : scanner le QR ou saisir le PIN.
 */
let checkinMode = null; // 'qr' | 'pin'

async function openScanner(sessionId) {
    if (!sessionId) {
        // Automatically find the IN_PROGRESS session
        const active = allGridSessions.find(s => s.status === 'IN_PROGRESS');
        if (active) {
            sessionId = active.sessionId;
        } else {
            Swal.fire('No Active Session', 'There are no active classes available for check-in right now.', 'info');
            return;
        }
    }

    // Geofence check BEFORE opening
    Swal.fire({
        title: 'Checking Location',
        text: 'Verifying your position...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const geoCheck = await validateGeofence();
        Swal.close();
        if (!geoCheck.allowed) {
            showNotification(geoCheck.message || 'You must be in the classroom to check in.', 'error');
            return;
        }
        currentCheckinContext.lat = geoCheck.lat;
        currentCheckinContext.lng = geoCheck.lng;
    } catch (e) {
        Swal.close();
        showNotification('Unable to determine your location. Please ensure location services are enabled.', 'error');
        return;
    }

    currentCheckinContext.sessionId = sessionId;
    currentCheckinContext.qrCode = null;
    currentCheckinContext.pin = null;
    checkinMode = null;

    document.getElementById('scanner-overlay').classList.remove('hidden');
    document.getElementById('pin-input').value = '';

    // Reset button state
    const btn = document.getElementById('btn-validate');
    if (btn) {
        btn.disabled = true; // disabled until a mode is chosen and filled
        btn.innerHTML = 'Validate Presence';
        btn.classList.replace('bg-emerald-500', 'bg-[#00B0FF]');
    }

    // Show mode selector, hide both panels initially
    _showCheckinModeSelector();
}

function _showCheckinModeSelector() {
    const initialPanel = document.getElementById('initial-panel');
    const qrPanel   = document.getElementById('qr-panel');
    const pinPanel  = document.getElementById('pin-panel');
    
    if (initialPanel) initialPanel.classList.remove('hidden');
    if (qrPanel)   qrPanel.classList.add('hidden');
    if (pinPanel)  pinPanel.classList.add('hidden');

    const btnQr = document.getElementById('btn-mode-qr');
    const btnPin = document.getElementById('btn-mode-pin');
    
    if (btnQr) btnQr.className = "flex-1 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all text-slate-500 hover:text-slate-700";
    if (btnPin) btnPin.className = "flex-1 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all text-slate-500 hover:text-slate-700";

    // Stop any running scanner
    if (html5QrScanner) {
        html5QrScanner.stop().catch(() => {});
        html5QrScanner = null;
    }
}

window.selectCheckinMode = function(mode) {
    checkinMode = mode;
    const initialPanel = document.getElementById('initial-panel');
    const qrPanel   = document.getElementById('qr-panel');
    const pinPanel  = document.getElementById('pin-panel');
    const btnQr = document.getElementById('btn-mode-qr');
    const btnPin = document.getElementById('btn-mode-pin');
    
    if (initialPanel) initialPanel.classList.add('hidden');

    const activeClass = "flex-1 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all bg-white text-[#00B0FF] shadow-sm";
    const inactiveClass = "flex-1 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all text-slate-500 hover:text-slate-700";

    if (mode === 'qr') {
        if (btnQr) btnQr.className = activeClass;
        if (btnPin) btnPin.className = inactiveClass;
        if (qrPanel) qrPanel.classList.remove('hidden');
        if (pinPanel) pinPanel.classList.add('hidden');
        // Start camera
        try {
            html5QrScanner = new Html5Qrcode("qr-reader");
            html5QrScanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                onScanSuccess
            ).catch(err => {
                console.warn("Camera not available.", err);
                html5QrScanner = null;
            });
        } catch (err) {
            console.warn("Failed to init scanner", err);
        }
    } else {
        if (btnQr) btnQr.className = inactiveClass;
        if (btnPin) btnPin.className = activeClass;
        if (pinPanel) pinPanel.classList.remove('hidden');
        if (qrPanel)  qrPanel.classList.add('hidden');
        
        // Stop any running scanner
        if (html5QrScanner) {
            html5QrScanner.stop().catch(() => {});
            html5QrScanner = null;
        }

        // Enable validate button immediately when user types
        const pinInput = document.getElementById('pin-input');
        const btn = document.getElementById('btn-validate');
        if (pinInput && btn) {
            pinInput.oninput = () => {
                btn.disabled = pinInput.value.trim().length < 4;
            };
            pinInput.focus();
        }
    }
};

function onScanSuccess(decodedText) {
    if (navigator.vibrate) navigator.vibrate(200);
    currentCheckinContext.qrCode = decodedText;

    if (html5QrScanner) {
        html5QrScanner.stop().catch(() => {});
        html5QrScanner = null;
    }

    const btn = document.getElementById('btn-validate');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> QR Scanné — Valider';
        btn.classList.replace('bg-[#00B0FF]', 'bg-emerald-500');
    }
}

async function submitFinalCheckin() {
    const btn = document.getElementById('btn-validate');

    if (checkinMode === 'qr') {
        if (!currentCheckinContext.qrCode) {
            showNotification('Veuillez scanner le QR code affiché par le professeur.', 'warning');
            return;
        }
    } else if (checkinMode === 'pin') {
        const pinVal = document.getElementById('pin-input').value.trim();
        if (!pinVal || pinVal.length < 4) {
            showNotification('Veuillez saisir le code PIN à 4 chiffres fourni par le professeur.', 'warning');
            return;
        }
        currentCheckinContext.pin = pinVal;
    } else {
        showNotification('Veuillez choisir un mode de pointage (QR ou PIN).', 'warning');
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Vérification...'; }

    try {
        const locationStr = currentCheckinContext.lat ? `${currentCheckinContext.lat},${currentCheckinContext.lng}` : null;
        
        const response = await fetch('/api/attendance/student/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: currentCheckinContext.sessionId,
                qrData:   currentCheckinContext.qrCode || null,
                pinCode:  currentCheckinContext.pin    || null,
                location: locationStr
            })
        });

        const data = await response.json();
        if (response.ok) {
            closeScanner();
            showCheckinSuccess();
            loadGridSessions();
            loadDashboardStats();
            loadCourseStats();
        } else {
            showNotification(data.error || 'Code invalide. Veuillez réessayer.', 'error');
            currentCheckinContext.qrCode = null;
            currentCheckinContext.pin = null;
            _showCheckinModeSelector();
            if (btn) {
                btn.disabled = true;
                btn.classList.replace('bg-emerald-500', 'bg-[#00B0FF]');
                btn.textContent = 'Validate Presence';
            }
        }
    } catch (err) {
        showNotification('Erreur réseau. Veuillez réessayer.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Validate Presence'; }
    }
}

function showCheckinSuccess() {
    // Brief success toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-2 animate-bounce';
    toast.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Attendance recorded!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function closeScanner() {
    document.getElementById('scanner-overlay').classList.add('hidden');
    if (html5QrScanner) {
        html5QrScanner.stop().catch(() => {});
        html5QrScanner = null;
    }
}

/**
 * --- 5. HISTORY & JUSTIFICATIONS ---
 */
function openJustifyModal(attendanceId, courseName, dateStr, hourSlots) {
    const modal = document.getElementById('justify-modal');
    document.getElementById('just-attendance-id').value = attendanceId;
    document.getElementById('just-session-display').textContent = `${courseName} (${dateStr})`;
    
    // Reset form
    document.getElementById('just-reason').value = '';
    document.getElementById('just-file').value = '';
    document.getElementById('camera-preview').classList.add('hidden');
    
    // Populate hour slot selector
    const select = document.getElementById('just-hour-index');
    if (select) {
        select.innerHTML = '<option value="">All Missed Hours</option>';
        if (hourSlots && hourSlots.length > 0) {
            const absentSlots = hourSlots.filter(slot => slot.status === 'ABSENT');
            absentSlots.forEach(slot => {
                const opt = document.createElement('option');
                opt.value = slot.hourIndex;
                opt.textContent = `Hour ${slot.hourIndex + 1}`;
                select.appendChild(opt);
            });
            // Hide container if no absent slots to target individually
            const container = document.getElementById('just-hour-index-container');
            if (container) container.style.display = absentSlots.length > 0 ? '' : 'none';
        }
    }
    
    modal.classList.remove('hidden');
}

function toggleJustifyModal() {
    document.getElementById('justify-modal').classList.add('hidden');
}

function previewFile(input) {
    const preview = document.getElementById('camera-preview');
    const img = document.getElementById('preview-img');
    const docPreview = document.getElementById('doc-preview-name');

    if (input.files && input.files[0]) {
        const file = input.files[0];
        const isImage = file.type.startsWith('image/');

        if (isImage) {
            // Show image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                img.classList.remove('hidden');
                if (docPreview) docPreview.classList.add('hidden');
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            // Show a file name label for non-image docs (PDF, Word, etc.)
            img.classList.add('hidden');
            preview.classList.remove('hidden');
            if (docPreview) {
                docPreview.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                docPreview.classList.remove('hidden');
            } else {
                img.src = '';
                img.alt = file.name;
                preview.classList.remove('hidden');
            }
        }
    } else {
        preview.classList.add('hidden');
        img.src = '';
    }
}

function clearJustifyFile() {
    const input = document.getElementById('just-file');
    if (input) input.value = '';
    const preview = document.getElementById('camera-preview');
    const img = document.getElementById('preview-img');
    if (preview) preview.classList.add('hidden');
    if (img) img.src = '';
}


document.getElementById('justification-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Prevent double-submission and infinite spinner
    if (submitBtn.disabled) return;
    
    const originalBtnHTML = submitBtn.innerHTML;

    // Show preloader
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="w-5 h-5 animate-spin mx-auto text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
    `;

    const formData = new FormData();
    formData.append('attendanceId', document.getElementById('just-attendance-id').value);
    formData.append('reason', document.getElementById('just-reason').value);
    
    const fileInput = document.getElementById('just-file');
    if (fileInput.files[0]) formData.append('file', fileInput.files[0]);

    // Append hourIndex if a specific slot is targeted
    const hourSelect = document.getElementById('just-hour-index');
    if (hourSelect && hourSelect.value !== '') {
        formData.append('hourIndex', hourSelect.value);
    }

    try {
        const response = await fetch('/api/student/justifications/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errBody = await response.text();
            let errMsg = "Upload failed. Verify file size/type.";
            try {
                const parsed = JSON.parse(errBody);
                if (parsed.message && parsed.message.includes('missing permissions')) {
                    errMsg = "Upload failed: The server's file storage is not configured properly (missing permissions). Please notify the administrator.";
                } else if (parsed.message) {
                    errMsg = "Upload failed: " + parsed.message;
                }
            } catch(e) {
                // If it's not JSON, use default or raw text if short
                if (errBody && errBody.length < 100) errMsg = errBody;
            }
            throw new Error(errMsg);
        }
        
        Swal.fire({
            title: 'Submitted!',
            text: 'Your justification has been sent for review.',
            icon: 'success',
            confirmButtonColor: '#00B0FF',
            timer: 3000
        });
        
        toggleJustifyModal();
        loadAttendanceHistory();
    } catch (err) {
        Swal.fire({
            title: 'Submission Failed',
            text: err.message,
            icon: 'error',
            confirmButtonColor: '#EF4444'
        });
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

async function loadAttendanceHistory() {
    const container = document.getElementById('history-list-container');
    if (!container) return;
    
    try {
        // Fetch history, justifications, and stats in parallel
        let url = '/api/student/attendance/history?size=100';

        const [historyRes, justRes] = await Promise.all([
            fetch(url),
            fetch('/api/student/justifications')
        ]);
        
        const historyData = await historyRes.json();
        const historyList = historyData.content || [];
        const justifications = await justRes.json();

        // Calculate counts based on new logic
        let absencesCount = 0;
        historyList.forEach(h => {
            const isAbsent = h.status === 'ABSENT' || (h.hourSlots || []).some(s => s.status === 'ABSENT');
            if (isAbsent) absencesCount++;
        });
        
        let pendingJustCount = justifications.filter(j => j.status === 'PENDING').length;

        // Populate summary cards
        const totalAbsencesEl = document.getElementById('total-absences-count');
        const pendingJustificationsEl = document.getElementById('pending-justifications-count');
        if (totalAbsencesEl) totalAbsencesEl.textContent = absencesCount;
        if (pendingJustificationsEl) pendingJustificationsEl.textContent = pendingJustCount;
        
        currentHistory = historyList;
        currentJustifications = justifications;
        currentHistoryPage = 1;
        renderHistoryWithFilters();

    } catch (err) {
        container.innerHTML = '<p class="text-rose-500 text-sm text-center py-4">Failed to load history.</p>';
    }
}

let currentHistoryPage = 1;
const HISTORY_PAGE_SIZE = 10;

function renderHistoryWithFilters(append = false) {
    if (!append) {
        currentHistoryPage = 1;
    }
    const container = document.getElementById('history-list-container');
    const justFilter = document.getElementById('absence-justification-filter');
    const statusFilter = document.getElementById('absence-status-filter');
    
    if (!container) return;
    
    const justificationFilter = justFilter ? justFilter.value : '';
    const statusValue = statusFilter ? statusFilter.value : '';
    const dateFilter = document.getElementById('absence-date-filter') ? document.getElementById('absence-date-filter').value : '';
    
    let filtered = [...currentHistory];
    
    if (dateFilter) {
        filtered = filtered.filter(h => h.date && h.date.startsWith(dateFilter));
    }
    
    // Client-side filter for Attendance Status
    if (statusValue) {
        filtered = filtered.filter(h => {
            const isAbsent = h.status === 'ABSENT' || (h.hourSlots || []).some(s => s.status === 'ABSENT');
            const isLate = h.status === 'LATE' || (h.hourSlots || []).some(s => s.status === 'LATE');
            const isExcused = h.status === 'EXCUSED' || (h.hourSlots || []).some(s => s.status === 'EXCUSED');
            
            let computedStatus = 'PRESENT';
            if (isAbsent) computedStatus = 'ABSENT';
            else if (isLate) computedStatus = 'LATE';
            else if (isExcused) computedStatus = 'EXCUSED';
            
            return computedStatus === statusValue;
        });
    }
    
    // Client-side filter for Justification Status
    if (justificationFilter) {
        filtered = filtered.filter(h => {
            const just = currentJustifications.find(j => j.attendanceId === h.attendanceId);
            
            if (justificationFilter === 'UNJUSTIFIED') {
                return (h.status === 'ABSENT' || (h.hourSlots || []).some(s => s.status === 'ABSENT')) && !just;
            }
            
            if (just) {
                return just.status === justificationFilter;
            }
            
            return false;
        });
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-sm text-center py-6 border border-slate-200 rounded-2xl bg-white">No history records match the filters.</p>';
        return;
    }

    const paginated = filtered.slice(0, currentHistoryPage * HISTORY_PAGE_SIZE);
    const hasMore = paginated.length < filtered.length;

    const html = paginated.map(h => {
        const isAbsent = h.status === 'ABSENT' || (h.hourSlots || []).some(s => s.status === 'ABSENT');
        const isLate = h.status === 'LATE' || (h.hourSlots || []).some(s => s.status === 'LATE');
        const isExcused = h.status === 'EXCUSED' || (h.hourSlots || []).some(s => s.status === 'EXCUSED');
        
        let statusBadge = '';
        let actionHtml = '';

        // Status Styling priority: ABSENT > LATE > EXCUSED > PRESENT
        if (isAbsent) {
            statusBadge = '<span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-100">ABSENT</span>';
        } else if (isLate) {
            statusBadge = '<span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100">LATE</span>';
        } else if (isExcused) {
            statusBadge = '<span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">EXCUSED</span>';
        } else {
            statusBadge = '<span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">PRESENT</span>';
        }

        // Hourly slot breakdown pills
        let slotsHtml = '';
        if (h.hourSlots && h.hourSlots.length > 0) {
            const slotColors = {
                'PRESENT':  'bg-emerald-50 text-emerald-700 border-emerald-100',
                'LATE':     'bg-amber-50 text-amber-700 border-amber-100',
                'EXCUSED':  'bg-blue-50 text-blue-700 border-blue-100',
                'ABSENT':   'bg-rose-50 text-rose-700 border-rose-100'
            };
            const pillsHtml = h.hourSlots.map(slot => {
                const colorCls = slotColors[slot.status] || slotColors['ABSENT'];
                return `<span class="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${colorCls}">H${slot.hourIndex + 1}: ${slot.status}</span>`;
            }).join('');
            slotsHtml = `<div class="flex flex-wrap gap-1.5 mt-2.5">${pillsHtml}</div>`;
        }

        // Check justifications for absences
        if (isAbsent || isExcused) {
            const just = currentJustifications.find(j => j.attendanceId === h.attendanceId);
            if (just) {
                const jStatus = just.status;
                let jStyle = (jStatus === 'ACCEPTED' || jStatus === 'APPROVED') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                             jStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                             'bg-amber-50 text-amber-700 border-amber-100';
                const slotLabel = just.hourIndex != null ? `Hour ${just.hourIndex + 1}` : 'All Hours';
                let docUrl = just.documentPath;
                if (docUrl && !docUrl.startsWith('http') && !docUrl.startsWith('/')) {
                    docUrl = '/' + docUrl;
                }
                
                let docHtml = '';
                if (docUrl) {
                    const isPdf = docUrl.match(/\.pdf(\?.*)?$/i) || (docUrl.includes('/raw/upload/') && docUrl.includes('.pdf'));
                    const isImage = !isPdf && (docUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i) || docUrl.includes('/image/upload/'));
                    
                    let previewUrl = docUrl;
                    if (isPdf && docUrl.includes('res.cloudinary.com')) {
                        previewUrl = docUrl.replace('.pdf', '.jpg').replace('/raw/upload/', '/image/upload/');
                    }

                    if (isImage || (isPdf && docUrl.includes('res.cloudinary.com'))) {
                        docHtml = `
                            <div class="mt-3 relative w-full h-32 rounded-xl overflow-hidden border-2 border-slate-100 cursor-pointer group" onclick="openImageLightbox('${previewUrl}')">
                                <img src="${previewUrl}" alt="Justification Attachment" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <div class="bg-white/90 backdrop-blur text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg>
                                    </div>
                                </div>
                                ${isPdf ? '<div class="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-sm">PDF</div>' : ''}
                            </div>
                        `;
                    } else if (isPdf) {
                        docHtml = `
                            <div class="mt-3 flex items-center gap-2">
                                <a href="${docUrl}" target="_blank" class="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100 flex items-center gap-1.5 hover:bg-red-100 transition-colors"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg> Open PDF</a>
                            </div>`;
                    } else {
                        docHtml = `
                            <div class="mt-3 flex items-center gap-2">
                                <a href="${docUrl}" target="_blank" class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 flex items-center gap-1.5 hover:bg-blue-100 transition-colors"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg> View Document</a>
                            </div>`;
                    }
                }
                
                actionHtml = `<div class="mt-3 pt-3 border-t border-slate-100 flex flex-col">
                                <div class="flex items-start justify-between gap-2">
                                    <span class="text-xs text-slate-500 font-medium flex flex-wrap items-center">
                                        Justification <span class="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-black mx-1">${slotLabel}</span>: 
                                        <span class="font-bold text-slate-700 truncate max-w-[150px] sm:max-w-[200px] inline-block align-bottom ml-1" title="${just.reason}">${just.reason}</span>
                                    </span>
                                    <span class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border flex-shrink-0 ${jStyle}">${jStatus}</span>
                                </div>
                                ${docHtml}
                              </div>`;
            } else if (isAbsent) {
                const safeName = (h.courseName || '').replace(/'/g, "\\'");
                const slotsJson = JSON.stringify(h.hourSlots || []).replace(/"/g, '&quot;').replace(/'/g, "\\'");
                actionHtml = `<div class="mt-3 pt-3 border-t border-slate-100">
                                <button onclick="openJustifyModal(${h.attendanceId}, '${safeName}', '${h.date}', ${slotsJson})" class="w-full py-2 bg-white border-2 border-slate-200 hover:border-[#00B0FF] hover:text-[#00B0FF] hover:bg-blue-50 rounded-xl text-slate-600 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                    Submit Justification
                                </button>
                              </div>`;
            }
        }

        return `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-slate-900 text-sm leading-tight">${h.courseName}</h4>
                    <p class="text-xs text-slate-500 mt-1"><span class="font-semibold text-slate-700">${h.date}</span> • ${(h.startTime||'').substring(0,5)} - ${(h.endTime||'').substring(0,5)}</p>
                </div>
                ${statusBadge}
            </div>
            ${slotsHtml}
            ${actionHtml}
        </div>`;
    }).join('');

    container.innerHTML = html;

    if (hasMore) {
        const btnId = 'btn-load-more-history';
        container.innerHTML += `
            <div class="flex justify-center mt-6">
                <button id="${btnId}" class="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 font-bold text-[11px] uppercase tracking-widest rounded-xl transition-colors active:scale-95 shadow-sm">
                    Load More
                </button>
            </div>
        `;
        document.getElementById(btnId).addEventListener('click', () => {
            currentHistoryPage++;
            renderHistoryWithFilters(true);
        });
    }
}

/**
 * --- GEOFENCING VALIDATION ---
 */
async function validateGeofence() {
    try {
        // 1. Fetch Geofence Data
        const geofenceRes = await fetch('/api/student/geofence');
        if (!geofenceRes.ok) return { allowed: true };
        
        const geofence = await geofenceRes.json();
        if (!geofence || !geofence.geofencingEnabled || !geofence.geofenceData) return { allowed: true };
        
        const polygon = JSON.parse(geofence.geofenceData);
        if (!polygon || polygon.length < 3) return { allowed: true };

        // 2. Get Student Location
        let position;
        try {
            position = await getCurrentPosition();
        } catch (e) {
            throw e;
        }
        
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const studentPoint = [lat, lng];
        
        console.log(`[Geofence] Student at: ${lat}, ${lng} (Accuracy: ${Math.round(accuracy)}m)`);
        
        // Store for request
        currentCheckinContext.lat = lat;
        currentCheckinContext.lng = lng;
        
        // 3. Ray Casting Check
        const isInside = isPointInPolygon(studentPoint, polygon);
        if (isInside) return { allowed: true, lat, lng };

        // 4. Buffer Check (20m)
        const minDistance = getMinDistanceToPolygon(studentPoint, polygon);
        if (minDistance <= 20) return { allowed: true, lat, lng }; 

        return { 
            allowed: false, 
            message: `Location Error: You are outside the campus perimeter. (Approx. ${Math.round(minDistance)}m away)`,
            lat,
            lng
        };
    } catch (err) {
        if (err.message.includes('Location Error')) throw err;
        console.warn("Geofence check failed, allowing as fallback", err);
        return { allowed: true };
    }
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported by this browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, (err) => {
            let msg = "Location Error: ";
            
            // Check for insecure origin (Chrome blocks geolocation on HTTP)
            if (!window.isSecureContext) {
                msg += "Browser security blocked location access because this site is not using HTTPS. Please use a secure connection.";
                reject(new Error(msg));
                return;
            }

            switch(err.code) {
                case 1: // PERMISSION_DENIED
                    msg += "Permission Denied. Please tap the 'lock' or 'settings' icon in your browser's address bar and ensure 'Location' is set to 'Allow'.";
                    break;
                case 2: // POSITION_UNAVAILABLE
                    msg += "Position Unavailable. We couldn't get a fix on your location. Try moving near a window or outdoors.";
                    break;
                case 3: // TIMEOUT
                    msg += "Verification Timeout. It took too long to get a GPS lock. Please ensure your GPS is active and try again.";
                    break;
                default:
                    msg += "An unexpected error occurred while fetching your location.";
                    break;
            }
            reject(new Error(msg));
        }, {
            enableHighAccuracy: true,
            timeout: 30000, // 30 seconds for mobile GPS lock
            maximumAge: 0
        });
    });
}

function isPointInPolygon(point, polygon) {
    const lat = point[0], lng = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function getMinDistanceToPolygon(point, polygon) {
    let minDistance = Infinity;
    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const dist = getDistanceToSegment(point, p1, p2);
        if (dist < minDistance) minDistance = dist;
    }
    return minDistance;
}

function getDistanceToSegment(p, v, w) {
    // Earth radius in meters
    const R = 6371000;
    
    // Convert to radians for math
    const toRad = (deg) => deg * Math.PI / 180;
    const latP = toRad(p[0]), lngP = toRad(p[1]);
    const latV = toRad(v[0]), lngV = toRad(v[1]);
    const latW = toRad(w[0]), lngW = toRad(w[1]);

    // Use Equirectangular approximation for small distances
    const xV = (lngV - lngP) * Math.cos((latP + latV) / 2);
    const yV = (latV - latP);
    const xW = (lngW - lngP) * Math.cos((latP + latW) / 2);
    const yW = (latW - latP);

    // Vector from V to W
    const dx = xW - xV;
    const dy = yW - yV;
    const l2 = dx * dx + dy * dy;

    if (l2 === 0) return getHaversineDistance(p, v);

    // Projection factor
    let t = ((-xV) * dx + (-yV) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    // Closest point on segment in local cartesian
    const closestX = xV + t * dx;
    const closestY = yV + dy * t;

    // Distance in meters
    return Math.sqrt(closestX * closestX + closestY * closestY) * R;
}

function getHaversineDistance(p1, p2) {
    const R = 6371000;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(p2[0] - p1[0]);
    const dLon = toRad(p2[1] - p1[1]);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(p1[0])) * Math.cos(toRad(p2[0])) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

window.loadClassDocuments = async function() {
    // Deprecated - sharing is strictly via email and notifications
};

// Notifications State & Logic
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

