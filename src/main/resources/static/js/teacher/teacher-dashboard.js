/**
 * Teacher Dashboard - Precision Roll Call Engine
 */
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    // Refresh schedule every 5 mins
    setInterval(loadSessions, 300000);
});

let currentSessions = [];
let activeSessionId = null;
let stompClient = null;
let qrTimer = 30;
let qrInterval = null;

/**
 * 1. Schedule & Vertical Time-Stack
 */
async function loadSessions() {
    try {
        const response = await fetch(`/api/teacher/sessions/my-schedule`);
        if (!response.ok) throw new Error("Cloud sync failed");
        
        currentSessions = await response.json();
        renderTimeline();
    } catch (err) {
        console.error("Schedule error:", err);
    }
}

function renderTimeline() {
    const grid = document.getElementById('sessions-grid');
    if (!currentSessions || currentSessions.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 font-bold italic">No sessions allocated for today.</div>';
        return;
    }

    const sorted = [...currentSessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Update "Next Class"
    const next = sorted.find(s => s.status === 'PLANNED' || s.status === 'IN_PROGRESS') || sorted[0];
    document.getElementById('next-class-name').textContent = next.courseName;
    document.getElementById('next-class-time').textContent = next.startTime.substring(0, 5);
    document.getElementById('next-class-room').textContent = next.locationGeographicalCoordinates || 'Room TBD';

    grid.innerHTML = sorted.map(s => renderSessionCard(s)).join('');
}

function renderSessionCard(s) {
    const isActive = s.status === 'IN_PROGRESS';
    const isDone = s.status === 'COMPLETED';
    
    return `
        <div onclick="openAttendance(${s.sessionId})" 
             class="glass-panel p-6 rounded-premium border border-white/40 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group cursor-pointer relative overflow-hidden ${isActive ? 'ring-2 ring-blue-500 ring-offset-4 ring-offset-slate-50' : ''}">
            
            ${isActive ? '<div class="absolute top-0 right-0 p-4"><span class="flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span></div>' : ''}

            <div class="flex items-center gap-3 mb-4">
                <div class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isDone ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}">
                    ${s.status.replace('_', ' ')}
                </div>
                <span class="text-[10px] font-bold text-slate-400">${s.startTime.substring(0, 5)} - ${s.endTime.substring(0, 5)}</span>
            </div>

            <h4 class="text-lg font-black text-slate-800 mb-6 font-display tracking-tight group-hover:text-blue-600 transition-colors">${s.courseName}</h4>
            
            <div class="flex items-center justify-between mt-auto">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                        ${s.locationGeographicalCoordinates ? s.locationGeographicalCoordinates.substring(0,2) : '??'}
                    </div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${s.locationGeographicalCoordinates || 'No Room'}</span>
                </div>
                <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7-7 7"></path></svg>
                </div>
            </div>
        </div>
    `;
}

/**
 * 2. High-Precision Roll Call (Mobile Optimized)
 */
async function openAttendance(sessionId) {
    activeSessionId = sessionId;
    const session = currentSessions.find(s => s.sessionId === sessionId);
    if (!session) return;

    // UI transitions
    document.getElementById('attendance-panel-container').classList.remove('hidden');
    document.getElementById('att-course-name').textContent = session.courseName;
    document.getElementById('att-details').textContent = `${session.locationGeographicalCoordinates || 'No Room'} • ${session.startTime.substring(0, 5)} - ${session.endTime.substring(0, 5)}`;
    
    // Status color
    const btn = document.getElementById('final-submit-btn');
    if (session.status === 'COMPLETED') {
        btn.textContent = "Roll Call Closed";
        btn.disabled = true;
        btn.className = "px-6 py-3 bg-slate-100 text-slate-400 font-bold rounded-2xl text-sm";
    }

    loadStudents(sessionId);
}

function closeAttendance() {
    document.getElementById('attendance-panel-container').classList.add('hidden');
    activeSessionId = null;
    disconnectWebSocket();
}

async function loadStudents(sessionId) {
    const loader = document.getElementById('student-list-loader');
    const container = document.getElementById('student-cards-body');
    
    loader.classList.remove('hidden');
    container.innerHTML = '';

    try {
        const [studentsResp, attendanceResp] = await Promise.all([
            fetch(`/api/attendance/session/${sessionId}/students`), // Assuming this endpoint gives all students in session
            fetch(`/api/attendance/session/${sessionId}`)
        ]);

        const students = await studentsResp.json();
        const records = await attendanceResp.json();
        const attendanceMap = new Map(records.map(r => [r.userId, r]));

        loader.classList.add('hidden');
        
        container.innerHTML = students.map(s => {
            const record = attendanceMap.get(s.userId);
            return renderStudentCard(s, record);
        }).join('');

    } catch (err) {
        console.error("Student load error:", err);
        loader.innerHTML = `<p class="text-rose-500 font-bold">Failed to load classroom: ${err.message}</p>`;
    }
}

/**
 * Three-State Toggle Component (Green/Amber/Red)
 */
function renderStudentCard(s, record) {
    const status = record ? record.status : 'NOT_MARKED';
    const isLate = status === 'LATE';
    const isPresent = status === 'PRESENT';
    const isAbsent = status === 'ABSENT';

    return `
        <div class="glass-panel p-6 rounded-[2.5rem] border border-white/40 shadow-sm flex flex-col gap-6 group hover:shadow-md transition-all" data-student-id="${s.userId}">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-300 text-xl overflow-hidden shadow-inner uppercase">
                   ${s.firstName[0]}${s.lastName[0]}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-black text-slate-800 truncate">${s.firstName} ${s.lastName}</h4>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${s.matricule || 'STU-000'}</p>
                </div>
            </div>

            <!-- THREE STATE TOGGLE -->
            <div class="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button onclick="markStatus(${s.userId}, 'PRESENT')" 
                        class="status-btn-present flex items-center justify-center py-3 rounded-xl transition-all ${isPresent ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-emerald-500'}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </button>
                <button onclick="markStatus(${s.userId}, 'LATE')" 
                        class="status-btn-late flex items-center justify-center py-3 rounded-xl transition-all ${isLate ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-amber-500'}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </button>
                <button onclick="markStatus(${s.userId}, 'ABSENT')" 
                        class="status-btn-absent flex items-center justify-center py-3 rounded-xl transition-all ${isAbsent ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-rose-500'}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        </div>
    `;
}

window.markStatus = async (studentId, status) => {
    try {
        const response = await fetch('/api/attendance/mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: studentId,
                sessionId: activeSessionId,
                status: status,
                verifiedByTeacher: true
            })
        });

        if (response.ok) {
            // Instant UI Feedback
            const card = document.querySelector(`[data-student-id="${studentId}"]`);
            const btns = {
                'PRESENT': card.querySelector('.status-btn-present'),
                'LATE': card.querySelector('.status-btn-late'),
                'ABSENT': card.querySelector('.status-btn-absent')
            };

            // Reset all
            Object.values(btns).forEach(b => {
                b.className = b.className.replace(/bg-\w+-500 text-white shadow-lg/, 'text-slate-400');
            });

            // Set active
            const color = status === 'PRESENT' ? 'emerald' : (status === 'LATE' ? 'amber' : 'rose');
            btns[status].classList.add(`bg-${color}-500`, 'text-white', 'shadow-lg');
            btns[status].classList.remove('text-slate-400');
        }
    } catch (err) {
        alert("Marking failed. Please retry.");
    }
};

/**
 * 3. Dedicated QR Mode (WebSocket/WS Integrated)
 */
function toggleQrView() {
    const overlay = document.getElementById('qr-overlay');
    const isClosing = !overlay.classList.contains('hidden');
    
    overlay.classList.toggle('hidden');

    if (isClosing) {
        disconnectWebSocket();
        clearInterval(qrInterval);
    } else {
        connectWebSocket();
        startQrTimer();
        // Request immediate token
        fetch(`/api/attendance/session/${activeSessionId}/token?type=QR`, { method: 'POST' })
            .then(r => r.text())
            .then(token => generateQrCode(token));
    }
}

function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Quiet mode

    stompClient.connect({}, () => {
        stompClient.subscribe(`/topic/session/${activeSessionId}/qr`, (message) => {
            generateQrCode(message.body);
            resetQrTimer();
        });
    });
}

function disconnectWebSocket() {
    if (stompClient) stompClient.disconnect();
}

function generateQrCode(token) {
    const placeholder = document.getElementById('qr-canvas-placeholder');
    placeholder.innerHTML = '<canvas id="qr-canvas" class="w-full h-full"></canvas>';
    
    QRCode.toCanvas(document.getElementById('qr-canvas'), token, {
        width: 1024,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' }
    });
}

function startQrTimer() {
    clearInterval(qrInterval);
    qrTimer = 30;
    const progress = document.getElementById('qr-timer-progress');
    const text = document.getElementById('qr-timer-text');

    qrInterval = setInterval(() => {
        qrTimer--;
        if (qrTimer < 0) qrTimer = 30;
        
        text.textContent = qrTimer;
        progress.style.width = `${(qrTimer / 30) * 100}%`;
    }, 1000);
}

function resetQrTimer() {
    qrTimer = 30;
}

window.submitRollCall = async () => {
    if (!confirm("Finalize roll call? No more auto-changes will occur.")) return;
    try {
        await fetch(`/api/teacher/sessions/${activeSessionId}/end`, { method: 'POST' });
        loadSessions();
        closeAttendance();
    } catch (err) {
        alert("Submission failed.");
    }
};
