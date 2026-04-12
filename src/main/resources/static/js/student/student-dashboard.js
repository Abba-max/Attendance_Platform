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
            el.classList.add('bg-[#00B0FF]', 'text-white', 'shadow-md', 'shadow-blue-500/10');
            el.classList.remove('text-[#00B0FF]', 'bg-white', 'hover:bg-white', 'hover:text-slate-900');
        } else {
            el.classList.remove('bg-[#00B0FF]', 'text-white', 'shadow-md', 'shadow-blue-500/10');
            el.classList.add('text-[#00B0FF]', 'hover:bg-white', 'hover:text-slate-900');
        }
    });

    // Render Data with Priority Sorting
    const stack = document.getElementById('student-schedule-stack');
    let filtered = status === 'ALL' ? allGridSessions : allGridSessions.filter(s => s.status === status);
    
    // Status Priority: IN_PROGRESS (1) > SCHEDULED (2) > COMPLETED (3)
    const priority = { 'IN_PROGRESS': 1, 'SCHEDULED': 2, 'COMPLETED': 3 };
    filtered.sort((a, b) => {
        const pA = priority[a.status] || 99;
        const pB = priority[b.status] || 99;
        if (pA !== pB) return pA - pB;
        // Secondary sort by date/time
        return (a.date || '').localeCompare(b.date || '') || (a.startTime || '').localeCompare(b.startTime || '');
    });

    if (filtered.length === 0) {
        stack.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm col-span-full">No sessions found for this filter.</div>`;
        return;
    }

    stack.innerHTML = filtered.map(s => renderSessionCard(s)).join('');
}

function renderSessionCard(s) {
    const isLive = s.status === 'IN_PROGRESS';
    const isAttended = s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'LATE';
    
    return `
        <div class="bg-white p-6 rounded-3xl border-2 ${isLive ? 'border-[#00B0FF] shadow-blue-500/10' : 'border-slate-50 hover:border-[#00B0FF]/30'} transition-all flex flex-col justify-between group relative overflow-hidden">
            ${isLive ? '<div class="absolute top-0 right-0 w-16 h-16 bg-[#00B0FF]/5 rounded-bl-full"></div>' : ''}
            <div class="flex items-start justify-between mb-4">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isLive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : (s.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-200')}">
                    ${isLive ? 'Live' : s.status}
                </span>
                ${isAttended ? '<div class="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div>' : ''}
            </div>
            
            <div class="mb-6">
                <h4 class="text-base font-black text-[#00B0FF] leading-tight mb-3 drop-shadow-sm">${s.courseName}</h4>
                <div class="space-y-1.5">
                    <p class="text-xs font-bold text-slate-500 flex items-center gap-2"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ${s.date} • ${s.startTime.substring(0,5)}</p>
                    <p class="text-xs font-bold text-slate-500 flex items-center gap-2"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> ${s.teacherName}</p>
                    <p class="text-xs font-bold text-slate-500 flex items-center gap-2"><svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> ${s.classroomName || 'Room TBD'}</p>
                </div>
            </div>

            ${isLive && !isAttended ? `
                <button onclick="openScanner(${s.sessionId})" class="w-full py-3 bg-[#00B0FF] shadow-lg shadow-blue-500/20 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:-translate-y-0.5 active:scale-95">
                    Check In Now
                </button>
            ` : `
                <div class="w-full py-3 bg-slate-50 text-slate-400 text-center font-black text-[10px] uppercase tracking-widest rounded-xl border-2 border-slate-100 flex items-center justify-center gap-2">
                    ${isAttended ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Attendance Logged' : 'Registration Closed'}
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
