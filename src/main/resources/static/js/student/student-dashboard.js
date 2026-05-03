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

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

let currentScheduleWeek = getISOWeek(new Date());

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Dashboard
    loadDashboardStats();
    loadGridSessions();
    loadCourseStats();
    loadAttendanceHistory();
});

/**
 * --- TAB NAVIGATION ---
 */
function switchTab(tabId) {
    // Hide all views
    document.querySelectorAll('.content-section, #view-status, #view-checkin, #view-justification, #view-courses, #view-calendar').forEach(el => el.classList.add('hidden'));
    
    // Show selected
    const target = document.getElementById('view-' + tabId);
    if (target) target.classList.remove('hidden');
    
    // Update Tab Styles
    const tabs = ['status', 'checkin', 'justification', 'courses', 'calendar'];
    tabs.forEach(t => {
        // Desktop
        const deskEl = document.getElementById('nav-desk-' + t);
        if (deskEl) {
            if (t === tabId) {
                deskEl.classList.add('active');
                deskEl.classList.remove('text-slate-500');
            } else {
                deskEl.classList.remove('active');
                deskEl.classList.add('text-slate-500');
            }
        }
        
        // Mobile
        const mobEl = document.getElementById('nav-mob-' + t);
        if (mobEl) {
            if (t === tabId) {
                mobEl.classList.add('active');
            } else {
                mobEl.classList.remove('active');
            }
        }
    });

    // Specific triggers
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
        if (!response.ok) throw new Error("Sync failed");
        
        const stats = await response.json();
        const score = Math.round(stats.overallAttendanceRate || 0); // Note: assuming endpoint updated name if needed, else fallback
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
    const statusLabel = isLive ? 'LIVE' : (isMissed ? 'MISSED' : s.status);
    const statusBg = isLive ? 'bg-blue-600 text-white animate-pulse' : (isMissed ? 'bg-slate-200 text-slate-500' : (isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'));

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
        
        if (stats.length === 0) {
            container.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm col-span-full">No courses enrolled.</div>`;
            return;
        }

        const html = stats.map(c => {
            const pct = Math.round(c.attendanceRate);
            let colorClass = 'text-[#00B0FF] bg-blue-50 border-blue-100';
            let barClass = 'from-blue-500 to-[#00B0FF]';
            
            if (pct < 75) {
                colorClass = 'text-red-600 bg-red-50 border-red-100';
                barClass = 'from-red-500 to-rose-600';
            } else if (pct < 90) {
                colorClass = 'text-amber-600 bg-amber-50 border-amber-100';
                barClass = 'from-amber-400 to-amber-600';
            }

            return `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#00B0FF]/30 hover:shadow-lg shadow-sm transition-all flex flex-col justify-between group relative overflow-hidden">
                <div class="relative z-10">
                    <div class="flex items-start justify-between mb-3">
                        <div class="space-y-0.5">
                            <h4 class="text-base font-bold text-slate-900 leading-tight">${c.courseName}</h4>
                            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Academic Insight</p>
                        </div>
                        <div class="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 text-[#00B0FF]">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        </div>
                    </div>
                </div>

                <div class="relative z-10 pt-3 border-t border-slate-100 mt-2">
                    <div class="flex items-center justify-between mb-2 text-xs">
                         <div class="flex items-center gap-1.5 text-slate-600">
                             <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                             <span class="font-bold">${c.teacherName || 'TBD'}</span>
                         </div>
                         <div class="${colorClass} px-2 py-0.5 rounded-lg border font-black text-[9px] uppercase tracking-widest">${pct}% Yield</div>
                    </div>

                    <div class="flex items-baseline gap-1.5 mb-2 text-slate-800">
                        <span class="text-xl font-black">${c.studentAttendedHours}<span class="text-xs font-bold text-slate-400 ml-1">Attended Hours</span></span>
                    </div>

                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        <div class="bg-gradient-to-r ${barClass} h-full rounded-full transition-all duration-1000" style="width: ${pct}%"></div>
                    </div>
                    
                    <div class="flex justify-between mt-1.5">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Objective: ${c.courseTotalHours}h</span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">${pct}% Goal</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        if (container) container.innerHTML = html;

    } catch (err) {
        container.innerHTML = `<p class="text-rose-500 font-bold text-center col-span-full">Failed to load courses: ${err.message}</p>`;
    }
}

function searchCourses() {
    const input = document.getElementById('course-search-input');
    if (!input) return;
    
    const query = input.value.toLowerCase();
    const cards = document.querySelectorAll('#course-stats-container > div');
    
    cards.forEach(card => {
        const titleEl = card.querySelector('h4');
        if (titleEl) {
            const match = titleEl.textContent.toLowerCase().includes(query);
            card.style.display = match ? '' : 'none';
        }
    });
}

/**
 * --- 4. MULTI-STEP CHECK-IN (QR -> PIN) ---
 */
async function openScanner(sessionId) {
    currentCheckinContext.sessionId = sessionId;
    currentCheckinContext.qrCode = null;
    currentCheckinContext.pin = null;
    
    const locModal = document.getElementById('location-modal');
    const locContent = document.getElementById('location-modal-content');
    if (!locModal || !locContent) return;

    // 1. Show Location Modal First
    locModal.classList.remove('hidden');
    locContent.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-500">
            <div class="relative w-20 h-20 mb-2">
                <div class="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                <div class="relative bg-white rounded-full p-5 shadow-sm border border-blue-50">
                    <svg class="w-10 h-10 text-[#00B0FF] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                </div>
            </div>
            <div class="space-y-1">
                <h3 class="text-lg font-black text-slate-800 tracking-tight">Perimeter Sync</h3>
                <p class="text-xs text-slate-500 font-medium">Authenticating your presence on campus...</p>
            </div>
            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 relative">
                <div class="bg-[#00B0FF] h-full absolute inset-0 animate-[shimmer_2s_infinite] w-full origin-left" style="background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); background-size: 200% 100%;"></div>
            </div>
        </div>
    `;

    try {
        // --- Geofence Check with 60s Timeout ---
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Verification Timeout: The location check is taking too long. Please ensure GPS is active.")), 60000)
        );

        const geoCheck = await Promise.race([validateGeofence(), timeoutPromise]);
        
        if (!geoCheck.allowed) {
            Swal.fire({
                title: 'Access Denied',
                text: geoCheck.message,
                icon: 'error',
                confirmButtonColor: '#00B0FF'
            });
            locModal.classList.add('hidden');
            return;
        }

        // 2. Success Animation & Transition
        locContent.innerHTML = `
            <div class="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-300">
                <div class="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div class="space-y-1">
                    <h3 class="text-lg font-black text-slate-800">Zone Verified</h3>
                    <p class="text-xs text-slate-500 font-medium">Secure connection established.</p>
                </div>
            </div>
        `;

        setTimeout(() => {
            locModal.classList.add('hidden');
            // Now open the actual scanner modal
            document.getElementById('scanner-overlay').classList.remove('hidden');
            document.getElementById('pin-input').value = '';
            
            const btn = document.getElementById('btn-validate');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Validate Presence';
                btn.classList.remove('bg-emerald-500', 'opacity-50');
                btn.classList.add('bg-[#00B0FF]');
            }
            startQrCamera();
        }, 1200);

    } catch (err) {
        Swal.fire({
            title: 'Sync Failed',
            text: err.message || 'Please enable GPS to check in.',
            icon: 'warning',
            confirmButtonColor: '#00B0FF'
        });
        locModal.classList.add('hidden');
    }
}

function startQrCamera() {
    const readerEl = document.getElementById('qr-reader');
    if (!readerEl) return;

    // Stop any previous scanner instance
    if (html5QrScanner) {
        html5QrScanner.stop().catch(() => {});
        html5QrScanner = null;
    }

    // Check if camera APIs are available at all
    // On HTTP (non-localhost), mobile browsers block camera APIs
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        readerEl.innerHTML = `<div class="flex flex-col items-center justify-center h-full gap-2 p-3">
            <svg class="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <p class="text-[10px] text-rose-600 font-black text-center uppercase tracking-wide">Camera unavailable</p>
            <p class="text-[9px] text-slate-400 text-center">Camera requires a secure (HTTPS) connection.<br>Enter the PIN manually if you have it.</p>
        </div>`;
        return;
    }

    // Show a loading indicator while requesting camera
    readerEl.innerHTML = `<div class="flex flex-col items-center justify-center h-full gap-2 p-4">
        <svg class="w-8 h-8 text-[#00B0FF] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
        <p class="text-xs text-slate-400 font-bold">Allow camera access...</p>
    </div>`;

    // Start Html5Qrcode directly — it handles getUserMedia and the OS permission dialog internally
    // We do NOT use a probe stream; that probe was unreliable on HTTP and caused a double-permission flow
    try {
        html5QrScanner = new Html5Qrcode('qr-reader');
        html5QrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 180, height: 180 } },
            onScanSuccess
        )
        .then(() => {
            // Scanner started — clear any placeholder content Html5Qrcode may have hidden
        })
        .catch(err => {
            console.warn('Scanner start failed:', err);
            const msg = (err && err.toString().toLowerCase().includes('permission'))
                || (err && err.toString().toLowerCase().includes('denied'))
                || (err && err.toString().toLowerCase().includes('notallowed'))
                ? 'permission' : 'error';
            if (msg === 'permission') {
                showCameraPermissionDenied(readerEl);
            } else {
                showCameraError(readerEl);
            }
        });
    } catch (err) {
        console.warn('Html5Qrcode init failed:', err);
        showCameraError(readerEl);
    }
}

function showCameraError(readerEl) {
    html5QrScanner = null;
    readerEl.innerHTML = `<div class="flex flex-col items-center justify-center h-full gap-2 p-3">
        <svg class="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p class="text-xs text-rose-500 font-bold text-center">Camera failed to start</p>
        <button onclick="startQrCamera()" class="mt-1 px-3 py-1 bg-[#00B0FF] text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Retry</button>
    </div>`;
}

function showCameraPermissionDenied(readerEl) {
    html5QrScanner = null;
    readerEl.innerHTML = `<div class="flex flex-col items-center justify-center h-full gap-1 p-3">
        <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
        <p class="text-[10px] text-amber-600 font-black text-center uppercase tracking-wide">Camera Access Denied</p>
        <p class="text-[9px] text-slate-400 text-center">Allow camera in your browser settings,<br>then tap Retry.</p>
        <button onclick="startQrCamera()" class="mt-1 px-3 py-1 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Retry</button>
    </div>`;
}

function onScanSuccess(decodedText) {
    if (navigator.vibrate) navigator.vibrate(200);
    currentCheckinContext.qrCode = decodedText;

    if (html5QrScanner) {
        html5QrScanner.stop().catch(() => {});
        html5QrScanner = null;
    }

    const btn = document.getElementById('btn-validate');
    if (btn) {
        btn.innerHTML = '<svg class="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> QR Scanned. Now enter PIN...';
        btn.classList.replace('bg-[#00B0FF]', 'bg-emerald-500');
    }
}

async function submitFinalCheckin() {
    const pin = document.getElementById('pin-input').value.trim();

    // Enforce Logical AND — BOTH are required
    if (!currentCheckinContext.qrCode) {
        Swal.fire('Scan Required', 'Please scan the instructor\'s QR code first.', 'warning');
        return;
    }
    if (!pin || pin.length < 4) {
        Swal.fire('PIN Required', 'Please enter the 4-digit PIN provided by the instructor.', 'warning');
        return;
    }
    
    if (pin && pin.length === 4) {
        currentCheckinContext.pin = pin;
    }

    const btn = document.getElementById('btn-validate');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

    try {
        // --- Geofence Check ---
        const geoCheck = await validateGeofence();
        if (!geoCheck.allowed) {
            Swal.fire('Location Restriction', geoCheck.message, 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Validate Presence'; }
            return;
        }

        const response = await fetch('/api/student/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: currentCheckinContext.sessionId,
                qrData:   currentCheckinContext.qrCode,
                pinCode:  currentCheckinContext.pin,
                latitude: geoCheck.lat,
                longitude: geoCheck.lng
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
            Swal.fire('Check-In Failed', data.error || 'Invalid QR code or PIN. Please try again.', 'error');
            document.getElementById('pin-input').value = '';
            
            // Re-render button state if failure
            if (btn) { 
                btn.classList.replace('bg-emerald-500', 'bg-[#00B0FF]'); 
                btn.disabled = false; 
                btn.textContent = 'Validate Presence'; 
            }
            // Reset QR so they can scan again if they want
            currentCheckinContext.qrCode = null;
            if (html5QrScanner && html5QrScanner.getState() !== 2) { // not scanning
               // they may need to reopen or type pin.
            }
        }
    } catch (err) {
        Swal.fire('Network Error', 'Please check your connection and try again.', 'error');
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
function openJustifyModal(attendanceId, courseName, dateStr) {
    const modal = document.getElementById('justify-modal');
    document.getElementById('just-attendance-id').value = attendanceId;
    document.getElementById('just-session-display').textContent = `${courseName} (${dateStr})`;
    
    // Reset form
    document.getElementById('just-reason').value = '';
    document.getElementById('just-file').value = '';
    document.getElementById('camera-preview').classList.add('hidden');
    
    modal.classList.remove('hidden');
}

function toggleJustifyModal() {
    document.getElementById('justify-modal').classList.add('hidden');
}

function previewFile(input) {
    const preview = document.getElementById('camera-preview');
    const img = document.getElementById('preview-img');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

document.getElementById('justification-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('attendanceId', document.getElementById('just-attendance-id').value);
    formData.append('reason', document.getElementById('just-reason').value);
    formData.append('file', document.getElementById('just-file').files[0]);

    try {
        const response = await fetch('/api/student/justifications/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Upload failed. Verify file size/type.");
        
        Swal.fire('Success', 'Justification successfully sent for review.', 'success');
        toggleJustifyModal();
        loadAttendanceHistory();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
});

async function loadAttendanceHistory() {
    const container = document.getElementById('history-list-container');
    if (!container) return;
    
    try {
        // Fetch history and justifications in parallel
        const [historyRes, justRes] = await Promise.all([
            fetch('/api/student/attendance/history?size=100'),
            fetch('/api/student/justifications')
        ]);
        
        const historyData = await historyRes.json();
        const historyList = historyData.content || [];
        const justifications = await justRes.json();
        
        if (historyList.length === 0) {
            container.innerHTML = '<p class="text-slate-500 text-sm text-center py-6 border border-slate-200 rounded-2xl bg-white">No session history found.</p>';
            return;
        }

        container.innerHTML = historyList.map(h => {
            const isAbsent = h.status === 'ABSENT';
            let statusBadge = '';
            let actionHtml = '';

            // Status Styling
            if (h.status === 'PRESENT') {
                statusBadge = '<span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">PRESENT</span>';
            } else if (h.status === 'LATE') {
                statusBadge = '<span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100">LATE</span>';
            } else if (h.status === 'EXCUSED') {
                statusBadge = '<span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">EXCUSED</span>';
            } else {
                statusBadge = '<span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-100">ABSENT</span>';
            }

            // Check justifications for absences
            if (isAbsent || h.status === 'EXCUSED') {
                const just = justifications.find(j => j.attendanceId === h.attendanceId);
                if (just) {
                    const jStatus = just.status;
                    let jStyle = jStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                 jStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                 'bg-amber-50 text-amber-700 border-amber-100';
                    
                    actionHtml = `<div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <span class="text-xs text-slate-500 font-medium">Justification: <span class="font-bold text-slate-700 truncate max-w-[150px] inline-block align-bottom" title="${just.reason}">${just.reason}</span></span>
                                    <span class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${jStyle}">${jStatus}</span>
                                  </div>`;
                } else if (isAbsent) {
                    const safeName = (h.courseName || '').replace(/'/g, "\\'");
                    actionHtml = `<div class="mt-3 pt-3 border-t border-slate-100">
                                    <button onclick="openJustifyModal(${h.attendanceId}, '${safeName}', '${h.date}')" class="w-full py-2 bg-white border-2 border-slate-200 hover:border-[#00B0FF] hover:text-[#00B0FF] hover:bg-blue-50 rounded-xl text-slate-600 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95">
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
                ${actionHtml}
            </div>`;
        }).join('');

    } catch (err) {
        container.innerHTML = '<p class="text-rose-500 text-sm text-center py-4">Failed to load history.</p>';
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

