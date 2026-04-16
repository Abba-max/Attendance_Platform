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

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Dashboard
    loadDashboardStats();
    loadGridSessions();
    loadCourseStats();
    loadJustifications();
});

/**
 * --- TAB NAVIGATION ---
 */
function switchTab(tabId) {
    // Hide all views
    document.querySelectorAll('.content-section, #view-status, #view-checkin, #view-justification, #view-courses, #view-stats, #view-calendar').forEach(el => el.classList.add('hidden'));
    
    // Show selected
    const target = document.getElementById('view-' + tabId);
    if (target) target.classList.remove('hidden');
    
    // Update Tab Styles
    const tabs = ['status', 'checkin', 'justification', 'courses', 'stats', 'calendar'];
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
    if (tabId === 'stats' || tabId === 'courses') loadCourseStats();
    if (tabId === 'justification') loadJustifications();
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
    btn.classList.add('bg-white', 'text-blue-600', 'hover:bg-blue-50', 'shadow-md');
    btn.classList.remove('bg-white/10', 'text-white');
    
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
        const response = await fetch('/api/student/sessions/grid');
        allGridSessions = await response.json();
        
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

        renderGrid();
    } catch (err) {
        stack.innerHTML = `<p class="text-rose-500 font-bold text-center col-span-full">Sync Error: ${err.message}</p>`;
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

    const startRow = Math.floor(sMinutesSince8 / 30) + 2; 
    const endRow = Math.ceil(eMinutesSince8 / 30) + 2;
    
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

    for (let slot = 0; slot < 18; slot++) {
        const rowIndex = slot + 2; 
        const hour = 8 + Math.floor(slot / 2);

        if (slot % 2 === 0) {
            const label = document.createElement('div');
            label.className = 'time-label';
            label.style.gridRow = `${rowIndex} / span 2`;
            label.style.gridColumn = '1';
            label.textContent = `${String(hour).padStart(2,'0')}:00`;
            matrix.appendChild(label);
        }

        for (let d = 0; d < 6; d++) {
            const cell = document.createElement('div');
            cell.className = `timetable-slot ${slot % 2 === 0 ? 'border-b border-slate-100' : 'border-b border-dashed border-slate-100/50'}`;
            cell.style.gridRow = String(rowIndex);
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
        alert("The course has not been initiated by the instructor yet. Please wait.");
    } else if (status === 'COMPLETED') {
        const s = allGridSessions.find(x => x.sessionId === sessionId);
        const st = s?.attendanceStatus || 'ABSENT';
        alert(`Session complete! Your attendance status is: ${st}`);
    }
}

function renderSessionCard(s, isGrid = false) {
    const isLive = s.status === 'IN_PROGRESS';
    const isDone = s.status === 'COMPLETED';
    const isAttended = s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'LATE';
    
    // Grid mode
    if (isGrid) {
        let cardBg = 'border-indigo-300 bg-indigo-50/80 hover:bg-indigo-100/80';
        let textCourse = 'text-indigo-950';
        let textTime = 'text-indigo-600';
        let textRoom = 'text-indigo-500';

        if (isLive) {
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

        // Onlick triggers handleSessionClick
        const clickAction = `handleSessionClick(${s.sessionId}, '${s.status}')`;

        return `
            <div onclick="${clickAction}" class="h-full w-full p-2 rounded-xl border-l-4 ${cardBg} cursor-pointer transition-all flex flex-col justify-start gap-1 overflow-hidden relative">
                ${isAttended && isDone ? '<div class="absolute top-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-emerald-600"><svg class="w-2 h-2" fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg></div>' : ''}
                <p class="text-[10px] font-black ${textCourse} truncate leading-tight w-[85%]">${s.courseName || 'Course'}</p>
                <div class="flex flex-col gap-0.5">
                    <span class="text-[9px] font-bold ${textTime}">${(s.startTime||'--:--').substring(0,5)}–${(s.endTime||'--:--').substring(0,5)}</span>
                    <span class="text-[9px] font-medium ${textRoom} truncate">${s.classroomName || ''}</span>
                </div>
            </div>`;
    }
    
    // Mobile layout
    return `
        <div onclick="handleSessionClick(${s.sessionId}, '${s.status}')" class="bg-white p-5 rounded-2xl border-2 ${isLive ? 'border-[#00B0FF] shadow-lg shadow-blue-500/10' : 'border-slate-100'} hover:border-[#00B0FF]/30 cursor-pointer transition-all flex items-center justify-between group">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl ${isLive ? 'bg-blue-50 text-blue-600' : (isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400')} flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                    <h4 class="text-sm font-black text-slate-900 mb-0.5 line-clamp-1">${s.courseName}</h4>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${(s.startTime||'--:--').substring(0,5)} • ${s.teacherName}</p>
                </div>
            </div>
            <div class="flex flex-col items-end gap-1">
                <span class="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${isLive ? 'bg-blue-600 text-white' : (isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}">${isLive ? 'LIVE' : s.status}</span>
                ${isAttended && isDone ? '<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>' : ''}
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
            <div class="bg-[#00B0FF] p-6 rounded-3xl border-2 border-white/20 hover:bg-[#0091EA] hover:shadow-xl hover:shadow-blue-500/30 transition-all flex flex-col justify-between group relative overflow-hidden shadow-lg shadow-blue-500/10">
                <div class="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                
                <div class="relative z-10">
                    <div class="flex items-start justify-between mb-4">
                        <div class="space-y-1">
                            <h4 class="text-lg font-black text-white leading-tight">${c.courseName}</h4>
                            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Academic Insight</p>
                        </div>
                        <div class="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 group-hover:bg-white/20 shadow-inner overflow-hidden backdrop-blur-sm">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        </div>
                    </div>
                </div>

                <div class="relative z-10 pt-4 border-t border-white/10 mt-4">
                    <div class="flex items-center justify-between mb-3 text-xs">
                         <div class="flex items-center gap-2">
                             <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                             <span class="font-black text-white/90 uppercase tracking-tighter">${c.teacherName || 'TBD'}</span>
                         </div>
                         <div class="px-2 py-0.5 rounded-lg border border-white/30 bg-white/10 font-black text-[9px] uppercase tracking-widest text-white">${pct}% Global Yield</div>
                    </div>

                    <div class="flex items-baseline gap-1.5 mb-2.5 text-white">
                        <span class="text-2xl font-black">${c.studentAttendedHours}<span class="text-xs font-bold text-white/50 ml-1">Attended Hours</span></span>
                    </div>

                    <div class="w-full bg-white/10 h-2.5 rounded-full overflow-hidden shadow-inner flex">
                        <div class="bg-white h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(255,255,255,0.4)]" style="width: ${pct}%"></div>
                    </div>
                    
                    <div class="flex justify-between mt-1.5">
                        <span class="text-[9px] font-black text-white/40 uppercase tracking-tighter">Objective: ${c.courseTotalHours}h</span>
                        <span class="text-[9px] font-black text-white uppercase tracking-tight">${pct}% Goal Milestone</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        if (container) container.innerHTML = html;
        const detailContainer = document.getElementById('detailed-reports-container');
        if (detailContainer) detailContainer.innerHTML = html;

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
function openScanner(sessionId) {
    currentCheckinContext.sessionId = sessionId;
    currentCheckinContext.qrCode = null;
    currentCheckinContext.pin = null;
    
    // Reset Modal State
    document.getElementById('scanner-overlay').classList.remove('hidden');
    document.getElementById('pin-input').value = '';
    
    const btn = document.getElementById('btn-validate');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Validate Presence';
        btn.classList.replace('bg-emerald-500', 'bg-[#00B0FF]');
    }

    try {
        html5QrScanner = new Html5Qrcode("qr-reader");
        html5QrScanner.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess
        ).catch(err => {
            console.warn("Camera fallback or unsupported.", err);
            html5QrScanner = null;
        });
    } catch (err) {
        console.warn("Failed to init scanner", err);
    }
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
        alert('Please scan the instructor\'s QR code first.');
        return;
    }
    if (!pin || pin.length < 4) {
        alert('Please enter the 4-digit PIN provided by the instructor.');
        return;
    }
    
    if (pin && pin.length === 4) {
        currentCheckinContext.pin = pin;
    }

    const btn = document.getElementById('btn-validate');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

    try {
        const response = await fetch('/api/student/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: currentCheckinContext.sessionId,
                qrData:   currentCheckinContext.qrCode,
                pinCode:  currentCheckinContext.pin
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
            alert(data.error || 'Invalid QR code or PIN. Please try again.');
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
        alert('Network error. Please try again.');
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
 * --- 5. JUSTIFICATIONS (Unchanged) ---
 */
function toggleJustifyModal() {
    const modal = document.getElementById('justify-modal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        populateAbsentSessions();
    }
}

async function populateAbsentSessions() {
    const select = document.getElementById('absent-sessions-select');
    try {
        const response = await fetch('/api/student/attendance/history?status=ABSENT');
        const data = await response.json();
        const sessions = data.content || [];
        
        select.innerHTML = sessions.length > 0 
            ? sessions.map(s => `<option value="${s.attendanceId}">${s.courseName} (${s.date})</option>`).join('')
            : '<option disabled selected>No recordable absences found</option>';
    } catch (err) {
        console.error("Failed to load absences", err);
    }
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
    formData.append('attendanceId', document.getElementById('absent-sessions-select').value);
    formData.append('reason', document.getElementById('just-reason').value);
    formData.append('file', document.getElementById('just-file').files[0]);

    try {
        const response = await fetch('/api/student/justifications/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Upload failed. Verify file size/type.");
        
        alert("Justification successfully sent for review.");
        toggleJustifyModal();
        loadJustifications();
    } catch (err) {
        alert(err.message);
    }
});

async function loadJustifications() {
    const list = document.getElementById('justification-list');
    try {
        const response = await fetch('/api/student/justifications');
        const justifications = await response.json();
        
        list.innerHTML = justifications.length > 0 
            ? justifications.map(j => `
                <div class="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                    <div>
                        <p class="text-[13px] font-bold text-slate-900 group-hover:text-[#00B0FF] transition-colors line-clamp-1">${j.reason}</p>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Ref ID: ${j.id}</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${getStatusStyle(j.status)}">
                        ${j.status}
                    </span>
                </div>
            `).join('')
            : '<p class="text-slate-500 text-xs text-center py-4">No justification records found.</p>';
    } catch (err) {}
}

function getStatusStyle(status) {
    switch(status) {
        case 'APPROVED': return 'bg-emerald-50 text-emerald-700';
        case 'REJECTED': return 'bg-red-50 text-red-700';
        default: return 'bg-orange-50 text-orange-700';
    }
}
