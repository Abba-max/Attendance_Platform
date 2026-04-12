/**
 * Student Dashboard - Precision Attendance Engine
 */

let allGridSessions = [];
let html5QrScanner = null;
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
    document.getElementById('view-status').classList.add('hidden');
    document.getElementById('view-calendar').classList.add('hidden');
    document.getElementById('view-courses').classList.add('hidden');
    
    // Show selected
    document.getElementById('view-' + tabId).classList.remove('hidden');
    
    // Update Tab Styles
    const tabs = ['status', 'calendar', 'courses'];
    tabs.forEach(t => {
        const el = document.getElementById('nav-' + t);
        if (t === tabId) {
            el.classList.add('active');
            el.classList.remove('hover:bg-blue-50');
        } else {
            el.classList.remove('active');
            el.classList.add('hover:bg-blue-50');
        }
    });
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
    
    widget.classList.add('ring-4', 'ring-blue-500/40', 'cursor-pointer');
    
    const safeStart = session.startTime ? String(session.startTime).substring(0,5) : '--:--';
    const safeEnd = session.endTime ? String(session.endTime).substring(0,5) : '--:--';
    const profName = session.teacherName || 'TBD';
    const roomName = session.classroomName && session.classroomName !== 'N/A' ? session.classroomName : 'Room TBD';

    title.textContent = session.courseName || 'Unknown Course';
    desc.innerHTML = `Live Now • ${safeStart} - ${safeEnd}<br>Prof. ${profName} • ${roomName}`;
    desc.classList.remove('text-[10px]', 'italic');
    desc.classList.add('text-[11px]');

    
    btn.disabled = false;
    btn.classList.add('bg-blue-500', 'hover:bg-blue-600', 'shadow-lg', 'shadow-blue-500/30');
    btn.classList.remove('bg-white/10');
    
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
        
        filterGrid('ALL'); // Initial render
        
        // Update Home Check-in Widget if there's a LIVE session
        const active = allGridSessions.find(s => s.status === 'IN_PROGRESS');
        if (active) {
            enableCheckinWidget(active);
        }

    } catch (err) {
        stack.innerHTML = `<p class="text-rose-500 font-bold text-center col-span-full">Sync Error: ${err.message}</p>`;
    }
}

function filterGrid(status) {
    // UI Update for Filter Bar
    ['ALL', 'IN_PROGRESS', 'SCHEDULED', 'COMPLETED'].forEach(f => {
        const el = document.getElementById('filter-' + f);
        if (f === status) {
            el.classList.replace('bg-white', 'bg-slate-800');
            el.classList.replace('text-slate-400', 'text-white');
            el.classList.remove('border-slate-200');
            el.classList.add('border-slate-800');
        } else {
            el.classList.replace('bg-slate-800', 'bg-white');
            el.classList.replace('text-white', 'text-slate-400');
            el.classList.replace('border-slate-800', 'border-slate-200');
            if(!el.classList.contains('border')) el.classList.add('border');
        }
    });

    // Render Data
    const stack = document.getElementById('student-schedule-stack');
    const filtered = status === 'ALL' ? allGridSessions : allGridSessions.filter(s => s.status === status);
    
    if (filtered.length === 0) {
        stack.innerHTML = `<div class="py-12 glass-panel rounded-premium text-center text-slate-400 font-bold italic col-span-full">No sessions found for this filter.</div>`;
        return;
    }

    stack.innerHTML = filtered.map(s => renderSessionCard(s)).join('');
}

function renderSessionCard(s) {
    const isLive = s.status === 'IN_PROGRESS';
    const isAttended = s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'LATE';
    
    return `
        <div class="glass-panel p-6 rounded-premium border border-white/40 shadow-sm flex flex-col justify-between transition-all hover:scale-[1.02] ${isLive ? 'ring-2 ring-blue-500 ring-offset-4' : ''}">
            <div class="flex items-start justify-between mb-4">
                <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isLive ? 'bg-blue-600 text-white animate-pulse' : (s.status === 'COMPLETED' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600')}">
                    ${isLive ? 'Live' : s.status}
                </span>
                ${isAttended ? '<span class="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></span>' : ''}
            </div>
            
            <div class="mb-6">
                <h4 class="text-lg font-black text-slate-800 leading-tight mb-2">${s.courseName}</h4>
                <div class="space-y-1">
                    <p class="text-xs font-bold text-slate-400 flex items-center gap-2"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ${s.date} • ${s.startTime.substring(0,5)}</p>
                    <p class="text-xs font-bold text-slate-400 flex items-center gap-2"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> ${s.teacherName}</p>
                    <p class="text-xs font-bold text-slate-400 flex items-center gap-2"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> ${s.classroomName || 'Room TBD'}</p>
                </div>
            </div>

            ${isLive && !isAttended ? `
                <button onclick="openScanner(${s.sessionId})" class="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-lg shadow-blue-500/30">
                    Check-in Now
                </button>
            ` : `
                <div class="w-full py-3 bg-slate-50 text-slate-400 text-center font-black text-xs uppercase tracking-widest rounded-xl border border-dashed border-slate-200">
                    ${isAttended ? 'Attendance Logged' : 'Unavailable'}
                </div>
            `}
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
            container.innerHTML = `<div class="py-12 glass-panel rounded-premium text-center text-slate-400 font-bold italic col-span-full">No courses enrolled.</div>`;
            return;
        }

        container.innerHTML = stats.map(c => `
            <div class="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                    <h4 class="text-sm font-black text-slate-800 mb-1 truncate">${c.courseName}</h4>
                    <p class="text-[10px] font-bold text-slate-400 mb-4 truncate flex items-center gap-1">
                        <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        ${c.teacherName || 'TBD'} • ${c.teacherEmail || 'N/A'}
                    </p>
                </div>
                <div>
                    <div class="flex items-end justify-between mb-2 mt-4">
                        <span class="text-3xl font-black font-display text-slate-800 tracking-tighter">${c.studentAttendedHours}<span class="text-sm text-slate-400">/${c.courseTotalHours}h</span></span>
                        <span class="px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-bold text-[10px] uppercase tracking-widest">${Math.round(c.attendanceRate)}% Presence</span>
                    </div>
                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="bg-blue-500 h-full rounded-full transition-all duration-1000" style="width: ${c.attendanceRate}%"></div>
                    </div>
                </div>
            </div>
        `).join('');

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
    
    // Reset Modal State
    document.getElementById('scanner-overlay').classList.remove('hidden');
    document.getElementById('step-qr').classList.remove('hidden');
    document.getElementById('step-pin').classList.add('hidden');
    document.getElementById('pin-input').value = '';

    // Geolocation pre-fetch (for when implemented)
    // if (navigator.geolocation) {
    //     navigator.geolocation.getCurrentPosition(p => {
    //         currentCheckinContext.lat = p.coords.latitude;
    //         currentCheckinContext.lng = p.coords.longitude;
    //     });
    // }
    
    html5QrScanner = new Html5Qrcode("qr-reader");
    html5QrScanner.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess
    ).catch(err => {
        alert("Camera permission required or device unsupported. Fallback PIN mode.");
        // If camera fails, fallback directly to PIN mode
        html5QrScanner = null;
        transitionToPinEntry(); 
    });
}

function onScanSuccess(decodedText) {
    if (navigator.vibrate) navigator.vibrate(200);
    currentCheckinContext.qrCode = decodedText;
    
    if (html5QrScanner) {
        html5QrScanner.stop().catch(()=>{});
        html5QrScanner = null;
    }
    
    // Sequence to PIN entry
    transitionToPinEntry();
}

function transitionToPinEntry() {
    document.getElementById('step-qr').classList.add('hidden');
    document.getElementById('step-pin').classList.remove('hidden');
    document.getElementById('pin-input').focus();
}

async function submitFinalCheckin() {
    const pin = document.getElementById('pin-input').value;
    if (!pin || pin.length < 4) {
        alert("Please enter the 4-digit PIN.");
        return;
    }
    currentCheckinContext.pin = pin;

    try {
        const response = await fetch('/api/student/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: currentCheckinContext.sessionId,
                qrData: currentCheckinContext.qrCode, // Can be null if camera failed
                pinCode: currentCheckinContext.pin,
                latitude: currentCheckinContext.lat,
                longitude: currentCheckinContext.lng
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert("Perfect! Check-in successful.");
            closeScanner();
            loadGridSessions(); // Refresh grid
            loadDashboardStats(); // Refresh ring
            loadCourseStats(); // Refresh hours
        } else {
            alert(data.error || "Token/PIN validation failed. Try again.");
             document.getElementById('pin-input').value = '';
        }
    } catch (err) {
        alert("Network error. Please try again.");
    }
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
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Claim: ${j.id}</p>
                        <p class="text-sm font-bold text-slate-800 line-clamp-1">${j.reason}</p>
                    </div>
                    <span class="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${getStatusStyle(j.status)}">${j.status}</span>
                </div>
            `).join('')
            : '<p class="text-slate-400 text-xs font-bold text-center py-4">No justification records found.</p>';
    } catch (err) {}
}

function getStatusStyle(status) {
    switch(status) {
        case 'APPROVED': return 'bg-emerald-50 text-emerald-600';
        case 'REJECTED': return 'bg-rose-50 text-rose-600';
        default: return 'bg-amber-50 text-amber-600';
    }
}
