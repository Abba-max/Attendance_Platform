/**
 * Student Dashboard - Precision Attendance Engine
 */
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadDailySchedule();
    loadJustifications();
});

let html5QrScanner = null;

/**
 * 1. Attendance Status Ring
 */
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/student/dashboard/stats');
        if (!response.ok) throw new Error("Sync failed");
        
        const stats = await response.json();
        const score = Math.round(stats.presenceRate || 0);
        
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
    
    // Status Color Logic
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

/**
 * 2. Daily Schedule Stack
 */
async function loadDailySchedule() {
    const stack = document.getElementById('student-schedule-stack');
    try {
        const response = await fetch('/api/student/schedule/today');
        const schedule = await response.json();
        
        if (schedule.length === 0) {
            stack.innerHTML = '<div class="py-12 glass-panel rounded-premium text-center text-slate-400 font-bold italic">No sessions scheduled for today. Free day!</div>';
            return;
        }

        stack.innerHTML = schedule.map(s => renderSessionEntry(s)).join('');
        
        // Update Check-in Widget if a session is LIVE
        const active = schedule.find(s => s.status === 'IN_PROGRESS');
        if (active) {
            enableCheckinWidget(active);
        }

    } catch (err) {
        stack.innerHTML = `<p class="text-rose-500 font-bold text-center">Sync Error: ${err.message}</p>`;
    }
}

function renderSessionEntry(s) {
    const isLive = s.status === 'IN_PROGRESS';
    const isAttended = s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'LATE';
    
    return `
        <div class="glass-panel p-6 rounded-premium border border-white/40 shadow-sm flex items-center justify-between transition-all hover:scale-[1.01] ${isLive ? 'ring-2 ring-blue-500 ring-offset-2' : ''}">
            <div class="flex items-center gap-4 min-w-0">
                <div class="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-xs text-slate-400 shadow-sm">
                    ${s.startTime.substring(0, 5)}
                </div>
                <div class="min-w-0">
                    <h4 class="text-sm font-black text-slate-800 truncate">${s.courseName}</h4>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${s.location || 'Room TBD'} • ${s.teacherName}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${isAttended ? '<span class="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></span>' : ''}
                <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isLive ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}">
                    ${isLive ? 'Live' : (s.attendanceStatus || 'Next')}
                </span>
            </div>
        </div>
    `;
}

function enableCheckinWidget(session) {
    const widget = document.getElementById('check-in-widget');
    const title = document.getElementById('current-session-name');
    const desc = document.getElementById('current-session-details');
    const btn = document.getElementById('start-scan-btn');
    
    widget.classList.add('ring-4', 'ring-white/10');
    title.textContent = session.courseName;
    desc.textContent = "Within secure proximity. Scanner ready.";
    btn.disabled = false;
    btn.classList.add('bg-blue-500', 'hover:bg-blue-600');
    btn.classList.remove('bg-white/10');
    
    // Store session ID for scanning
    window.activeSessionId = session.sessionId;
}

/**
 * 3. Mobile Camera & Justification Flow
 */
function toggleJustifyModal() {
    document.getElementById('justify-modal').classList.toggle('hidden');
    if (!document.getElementById('justify-modal').classList.contains('hidden')) {
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

/**
 * 4. QR Scanner Engine (Mobile Specific)
 */
function openScanner() {
    document.getElementById('scanner-overlay').classList.remove('hidden');
    
    html5QrScanner = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrScanner.start(
        { facingMode: "environment" }, 
        config,
        onScanSuccess
    ).catch(err => {
        alert("Camera permission required for check-in.");
        closeScanner();
    });
}

async function onScanSuccess(decodedText, decodedResult) {
    // Vibrate device if possible
    if (navigator.vibrate) navigator.vibrate(200);
    
    closeScanner();
    console.log("Scanned Token:", decodedText);

    try {
        const response = await fetch('/api/student/attendance/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: window.activeSessionId,
                qrCode: decodedText
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert("Perfect! Check-in successful.");
            loadDailySchedule();
        } else {
            alert(data.error || "Token validation failed. Try again.");
        }
    } catch (err) {
        alert("Network error. Please try again.");
    }
}

function closeScanner() {
    document.getElementById('scanner-overlay').classList.add('hidden');
    if (html5QrScanner) {
        html5QrScanner.stop().catch(() => {});
    }
}
