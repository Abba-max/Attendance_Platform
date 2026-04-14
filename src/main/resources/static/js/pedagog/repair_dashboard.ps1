$originalFile = "c:\Users\UsER\Documents\Transversal project\Student Attendance System\stuattendance\src\main\resources\static\js\pedagog\pedagog-dashboard.js"
$backupFile = "c:\Users\UsER\Documents\Transversal project\Student Attendance System\stuattendance\src\main\resources\static\js\pedagog\pedagog-dashboard.js.bak"

# 1. Back up
Copy-Item $originalFile $backupFile

# 2. Extract first 2503 lines
$head = Get-Content $originalFile -Head 2503

# 3. Define the correct tail
$tail = @"
}

window.cancelSession = async function(sessionId) {
    if (!confirm("Are you sure you want to cancel this session?")) return;
    try {
        const res = await fetch(`/api/sessions/` + sessionId, { method: 'DELETE' });
        if (!res.ok) throw new Error("Could not cancel session");
        showNotification("Session has been cancelled successfully.", "success");
        loadSessionsMonitor();
    } catch (e) {
        console.error(e);
        showNotification("Could not cancel session.", "error");
    }
};

window.viewSessionDetails = function(sessionId) {
    const session = smAllSessions?.find(s => s.sessionId === parseInt(sessionId));
    if (!session) {
        showNotification("Session data not found.", "error");
        return;
    }
    
    document.getElementById('rsCourseName').textContent = session.courseName || '—';
    document.getElementById('rsTeacherName').textContent = session.teacherName || '—';
    document.getElementById('rsClassroomName').textContent = session.classroomName || '—';
    document.getElementById('rsSessionId').value = session.sessionId;
    
    document.getElementById('rsDate').value = session.date || '';
    document.getElementById('rsStartTime').value = session.startTime ? session.startTime.substring(0, 5) : '';
    document.getElementById('rsEndTime').value = session.endTime ? session.endTime.substring(0, 5) : '';
    
    const isCancelled = (session.status === 'CANCELLED');
    document.getElementById('rsDate').disabled = isCancelled;
    document.getElementById('rsStartTime').disabled = isCancelled;
    document.getElementById('rsEndTime').disabled = isCancelled;
    
    const cw = document.getElementById('rsCancelledMessage');
    if (cw) cw.classList.toggle('hidden', !isCancelled);
        
    const fc = document.getElementById('rsFooterControls');
    if (fc) fc.classList.toggle('hidden', isCancelled);
    
    const modal = document.getElementById('rescheduleModal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.bg-white').classList.remove('scale-95');
        }, 10);
    }
};

window.closeSessionModal = function() {
    const modal = document.getElementById('rescheduleModal');
    if(modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.bg-white').classList.add('scale-95');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }
};

window.saveSessionReschedule = async function() {
    const sessionId = document.getElementById('rsSessionId').value;
    const date = document.getElementById('rsDate').value;
    const startTime = document.getElementById('rsStartTime').value;
    const endTime = document.getElementById('rsEndTime').value;
    
    if (!date || !startTime || !endTime) {
        showNotification("Please fill in all fields.", "error");
        return;
    }
    
    const payload = {
        date: date,
        startTime: startTime.length === 5 ? startTime + ':00' : startTime,
        endTime: endTime.length === 5 ? endTime + ':00' : endTime
    };

    try {
        const res = await fetch(`/api/sessions/` + sessionId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Could not save session reschedule");
        showNotification("Session successfully rescheduled!", "success");
        closeSessionModal();
        loadSessionsMonitor();
    } catch (e) {
        console.error(e);
        showNotification("Error saving session timing.", "error");
    }
};

// =========================================================================
// GLOBAL ROLL CALL HUB
// =========================================================================

window.loadHubClasses = async function() {
    // Initial classrooms are loaded via Thymeleaf
};

window.loadHubSessions = async function() {
    const classId     = document.getElementById('hubClassFilter').value;
    const specFilter  = document.getElementById('hubSpecFilter').value;
    const levelFilter = document.getElementById('hubLevelFilter').value;
    const sessSelect  = document.getElementById('hubSessionFilter');
    const loadBtn     = document.getElementById('hubLoadBtn');

    sessSelect.innerHTML = '<option value="">— Choose Session —</option>';
    sessSelect.disabled  = true;
    loadBtn.disabled     = true;

    if (smAllSessions.length === 0) {
        await loadSessionsMonitor();
    }

    let filtered = smAllSessions;
    if (specFilter)  filtered = filtered.filter(s => s.specialityName === specFilter);
    if (levelFilter) filtered = filtered.filter(s => String(s.level) === levelFilter);
    if (classId)     filtered = filtered.filter(s => String(s.classroomId) === classId);

    if (filtered.length === 0) {
        sessSelect.innerHTML = '<option value="">No sessions found</option>';
        return;
    }

    filtered.sort((a,b) => (a.date||'').localeCompare(b.date||''));
    
    filtered.forEach(s => {
        const dateStr = s.date ? new Date(s.date).toLocaleDateString('en-GB') : s.day;
        const opt = document.createElement('option');
        opt.value = s.sessionId;
        opt.textContent = dateStr + " | " + s.courseName + " (" + (s.startTime||'').substring(0,5) + ")";
        sessSelect.appendChild(opt);
    });

    sessSelect.disabled = false;
    loadBtn.disabled = false;
};

window.loadHubRoster = async function() {
    const sessionId = document.getElementById('hubSessionFilter').value;
    if (!sessionId) return;

    const tbody = document.getElementById('hubRosterBody');
    tbody.innerHTML = `<tr><td colspan="3" class="py-12 text-center text-slate-400">Loading roster...</td></tr>`;
    document.getElementById('hubWorkspace').style.display = 'block';
    document.getElementById('hubEmptyState').style.display = 'none';

    try {
        const res = await fetch(`/api/timetablecontent/attendance/` + sessionId);
        if (!res.ok) throw new Error("Failed to fetch roster");
        const data = await res.json();
        renderHubRoster(data);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="3" class="py-12 text-center text-red-500 font-bold">Error: ` + e.message + `</td></tr>`;
    }
};

function renderHubRoster(records) {
    const tbody = document.getElementById('hubRosterBody');
    if (!records || records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-12 text-center text-slate-400">No students recorded for this session.</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map(r => {
        const fullName = escapeHtml((r.firstName || '') + " " + (r.lastName || ''));
        const email = escapeHtml(r.email || '');
        const matricule = escapeHtml(r.matricule || '—');
        
        return \`
        <tr class="hover:bg-slate-50 transition">
            <td class="px-6 py-4">
                <div class="font-bold text-slate-700">\$${fullName}</div>
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">\$${email}</div>
            </td>
            <td class="px-6 py-4 text-sm font-bold text-slate-500">\$${matricule}</td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="hubMarkAttendance(\$${r.attendanceId}, 'PRESENT')"
                            class="px-3 py-1.5 rounded-lg text-[10px] font-bold border \$${r.status === 'PRESENT' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200' : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200 hover:text-emerald-500'} transition">
                        PRESENT
                    </button>
                    <button onclick="hubMarkAttendance(\$${r.attendanceId}, 'ABSENT')"
                            class="px-3 py-1.5 rounded-lg text-[10px] font-bold border \$${r.status === 'ABSENT' ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-200' : 'bg-white text-slate-400 border-slate-100 hover:border-red-200 hover:text-red-500'} transition">
                        ABSENT
                    </button>
                </div>
            </td>
        </tr>
    \`; }).join('');
}

window.hubMarkAttendance = function(id, status) {
    fetch(`/api/timetablecontent/attendance/` + id + `/status?status=` + status, { method: 'POST' })
        .then(res => {
            if (!res.ok) throw new Error();
            loadHubRoster();
        })
        .catch(() => showNotification("Failed to update status", "error"));
};

window.hubMarkAll = async function(status) {
    const sessionId = document.getElementById('hubSessionFilter').value;
    if (!sessionId) return;
    
    try {
        const res = await fetch(`/api/timetablecontent/attendance/session/` + sessionId + `/mark-all?status=` + status, { method: 'POST' });
        if (!res.ok) throw new Error();
        showNotification("All students marked " + status.toLowerCase(), "success");
        loadHubRoster();
    } catch (e) {
        showNotification("Failed to update roster", "error");
    }
};

window.saveHubRoster = function() {
    showNotification("Roster saved successfully.", "success");
};

window.exportHubAttendance = function() {
    const sessionId = document.getElementById('hubSessionFilter').value;
    if (!sessionId) return;
    window.open(`/api/timetablecontent/attendance/export/pdf/` + sessionId, '_blank');
};

// ==========================================
// NAVIGATION SYSTEM
// ==========================================

window.navigateTo = function(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('section-' + section);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
    const activeItem = document.querySelector(\`[data-section="\$${section}"]\`);
    if (activeItem) activeItem.classList.add('active');

    if (section === 'sessions') loadSessionsMonitor();
    if (section === 'attendance') {
        if (smAllSessions.length === 0) loadSessionsMonitor().then(loadHubSessions);
        else loadHubSessions();
    }
};
"@

# 4. Combine and Save
$total = $head + $tail
$total | Set-Content $originalFile -Encoding UTF8
