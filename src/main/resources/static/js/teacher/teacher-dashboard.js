document.addEventListener('DOMContentLoaded', function() {
    console.log('Teacher Dashboard initializing...');
    
    // Initialize Navigation
    initNavigation();
    
    // Initial Load
    loadSessions();
});

function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            switchSection(section);
            
            navItems.forEach(nav => {
                nav.classList.remove('active', 'bg-[#00B0FF]', 'text-white');
                nav.classList.add('text-slate-500');
            });
            item.classList.add('active', 'bg-[#00B0FF]', 'text-white');
            item.classList.remove('text-slate-500');
        });
    });
}

function switchSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${sectionId}`).classList.remove('hidden');
}

/**
 * Session Management
 */
let currentSessions = [];

async function loadSessions() {
    try {
        const response = await fetch(`/api/teacher/sessions?teacherId=${window.user.id}`);
        if (!response.ok) throw new Error("Failed to load sessions");
        
        currentSessions = await response.json();
        renderDashboard();
    } catch (error) {
        console.error("Session load error:", error);
    }
}

function renderDashboard() {
    const grid = document.getElementById('sessions-grid');
    if (!currentSessions || currentSessions.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 font-bold">No sessions scheduled.</div>';
        return;
    }

    // Sort by proximity to now (Most upcoming first)
    const now = new Date();
    const sorted = [...currentSessions].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime}`);
        const dateB = new Date(`${b.date}T${b.startTime}`);
        
        // Filter out past sessions or treat them differently?
        // For now, simple ascending order (earliest/closest first)
        return dateA - dateB;
    });

    // Populate "Next Class" highlight
    const nextClass = sorted[0];
    document.getElementById('next-class-name').textContent = nextClass.courseName || 'Class';
    document.getElementById('next-class-time').textContent = nextClass.startTime.substring(0, 5);
    document.getElementById('next-class-room').textContent = nextClass.locationGeographicalCoordinates || 'Room --';

    // Render Grid
    grid.innerHTML = sorted.map(s => renderSessionCard(s)).join('');
}

function renderSessionCard(session) {
    const date = new Date(session.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const isToday = session.date === new Date().toISOString().split('T')[0];
    
    return `
        <div class="bg-white p-6 rounded-[2.5rem] border border-slate-200 hover:border-[#00B0FF] transition-all group cursor-pointer" onclick="openAttendance(${session.id})">
            <div class="flex items-center justify-between mb-4">
                <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">${session.courseName || 'Course'}</span>
                <span class="text-xs font-bold text-slate-400">${date} • ${session.startTime.substring(0, 5)}</span>
            </div>
            <h4 class="text-xl font-black text-slate-800 mb-6 line-clamp-1 group-hover:text-[#00B0FF] transition-colors">${session.courseName || 'Unnamed Session'}</h4>
            
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                        <span class="text-[10px] font-bold text-slate-500">BS</span>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${session.locationGeographicalCoordinates || 'Room TBD'}</span>
                </div>
                <button class="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-[#00B0FF] group-hover:text-white transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>
    `;
}

/**
 * Attendance Implementation
 */
window.openAttendance = async function(sessionId) {
    const session = currentSessions.find(s => s.id === sessionId);
    if (!session) return;

    switchSection('attendance');
    
    // Update Panel Header
    document.getElementById('att-course-tag').textContent = session.courseName;
    document.getElementById('att-course-name').textContent = session.courseName;
    document.getElementById('att-details').textContent = `${session.locationGeographicalCoordinates || 'Room TBD'} • ${session.day}, ${session.date} (${session.startTime.substring(0, 5)} - ${session.endTime.substring(0, 5)})`;
    
    // Session Actions (5-min logic)
    const actionsCont = document.getElementById('session-actions');
    const now = new Date();
    const sessionTime = new Date(`${session.date}T${session.startTime}`);
    const timeDiffMinutes = (sessionTime - now) / (1000 * 60);

    let actionHtml = '';
    if (timeDiffMinutes > 5) {
        actionHtml = `<span class="text-amber-500 font-bold text-sm">Starts in ${Math.round(timeDiffMinutes)} mins</span>`;
    } else {
        actionHtml = `
            <button onclick="markTeacherPresence(${session.id})" class="px-6 py-2.5 bg-[#00B0FF] text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">Start Session</button>
            <button onclick="exportAttendance(${session.id})" class="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Export & Submit</button>
        `;
    }
    actionsCont.innerHTML = actionHtml;

    // Load Students
    loadStudents(sessionId);
};

async function loadStudents(sessionId) {
    const tbody = document.getElementById('student-list-body');
    tbody.innerHTML = '<tr><td colspan="4" class="py-12 text-center text-slate-400 font-bold">Fetching enrolled students...</td></tr>';

    try {
        const response = await fetch(`/api/teacher/sessions/${sessionId}/students`);
        if (!response.ok) throw new Error("Failed to load students");
        const students = await response.json();
        
        tbody.innerHTML = students.map(s => `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-8 py-5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">${s.firstName[0]}${s.lastName[0]}</div>
                        <div>
                            <p class="font-bold text-slate-800 text-sm">${s.firstName} ${s.lastName}</p>
                            <p class="text-[10px] font-medium text-slate-400 tracking-tight">${s.matricule || 'No Matricule'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-5">
                    <span class="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest">Not Marked</span>
                </td>
                <td class="px-8 py-5">
                    <input type="text" placeholder="Add optional comment..." class="w-full bg-transparent border-none focus:ring-0 text-xs text-slate-500 placeholder-slate-300">
                </td>
                <td class="px-8 py-5">
                    <div class="flex items-center gap-2">
                        <button class="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Present">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                        <button class="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Absent">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                        <button class="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all" title="Late">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-12 text-center text-rose-500 font-bold">${error.message}</td></tr>`;
    }
}

window.markTeacherPresence = function(sessionId) {
    alert("This will mark you as present and notify the assistant.");
};

window.exportAttendance = function(sessionId) {
    alert("Exporting PDF and sending it to the Pedagogic Assistant...");
};
