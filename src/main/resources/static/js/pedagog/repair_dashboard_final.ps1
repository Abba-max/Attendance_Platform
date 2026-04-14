$originalFile = "c:\Users\UsER\Documents\Transversal project\Student Attendance System\stuattendance\src\main\resources\static\js\pedagog\pedagog-dashboard.js"
$backupFile = "c:\Users\UsER\Documents\Transversal project\Student Attendance System\stuattendance\src\main\resources\static\js\pedagog\pedagog-dashboard.js.final.bak"

# 1. Back up
Copy-Item $originalFile $backupFile

# 2. Extract first 2269 lines
$head = Get-Content $originalFile -Head 2269

# 3. Define the correct tail
$tail = @"
// =========================================================================
// CONFIRM & PUBLISH TIMETABLE
// =========================================================================

/** Called when the "Confirm & Publish" button is clicked */
window.confirmAndPublishTimetable = function () {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const blocks = document.querySelectorAll('.tt-block');

    if (blocks.length === 0) {
        showNotification('The timetable grid is <strong>empty</strong>. Add at least one session before publishing.', 'warning');
        return;
    }

    const entries = [];
    blocks.forEach(block => {
        const cell = block.closest('.grid-cell');
        if (!cell) return;
        const dayIndex  = parseInt(cell.getAttribute('data-day-index') ?? 0);
        const startHour = parseInt(cell.getAttribute('data-hour') ?? 8);
        const duration  = parseInt(block.getAttribute('data-duration') || 1);
        const courseName = block.querySelector('.tt-name')?.textContent?.trim() || block.getAttribute('data-event-name') || '—';
        const teacherName = block.querySelector('.tt-teacher')?.textContent?.trim() || null;

        entries.push({
            day:         DAYS[dayIndex] ?? "Day " + dayIndex,
            startTime:   (startHour.toString().padStart(2,'0')) + ":00",
            endTime:     ((startHour + duration).toString().padStart(2,'0')) + ":00",
            courseName,
            teacherName
        });
    });

    // Populate modal
    const total    = entries.length;
    const withTchr = entries.filter(e => e.teacherName).length;
    const noTchr   = total - withTchr;

    const tTot = document.getElementById('ctTotalEntries');
    const tWth = document.getElementById('ctWithTeacher');
    const tNo  = document.getElementById('ctNoTeacher');
    const tWrn = document.getElementById('ctNoTeacherWarn');

    if (tTot) tTot.textContent = total;
    if (tWth) tWth.textContent = withTchr;
    if (tNo)  tNo.textContent  = noTchr;
    if (tWrn) tWrn.style.display = noTchr > 0 ? '' : 'none';

    const tbody = document.getElementById('ctEntryList');
    if (tbody) {
        tbody.innerHTML = entries.map(e => {
            return '<tr style="border-top:1px solid #f1f5f9">' +
                '<td style="padding:9px 14px;font-size:13px;font-weight:600;color:var(--text)">' + e.day + '</td>' +
                '<td style="padding:9px 14px;font-size:13px;color:var(--text-2)">' + e.startTime + ' – ' + e.endTime + '</td>' +
                '<td style="padding:9px 14px;font-size:13px;color:var(--text)">' + e.courseName + '</td>' +
                '<td style="padding:9px 14px">' +
                    (e.teacherName
                        ? '<span style="padding:2px 8px;background:var(--blue-lt);color:var(--blue-dk);border-radius:6px;font-size:11px;font-weight:700">' + e.teacherName + '</span>'
                        : '<span style="color:#f97316;font-size:11px;font-weight:700">⚠ Unassigned</span>') +
                '</td>' +
            '</tr>';
        }).join('');
    }

    // Open modal
    const modal = document.getElementById('confirmTTOverlay');
    if (modal) modal.classList.add('active');
};

window.closeConfirmTT = function () {
    const modal = document.getElementById('confirmTTOverlay');
    if (modal) modal.classList.remove('active');
};

/** Actually save + publish — called from the modal button */
window.publishTimetable = async function () {
    const lbl    = document.getElementById('ctPublishLbl');
    const loader = document.getElementById('ctPublishLoader');
    const btn    = document.getElementById('ctPublishBtn');
    if (lbl) lbl.style.display = 'none';
    if (loader) loader.style.display = '';
    if (btn) btn.disabled = true;

    try {
        await window.saveTimetable();
        closeConfirmTT();
        showNotification('Timetable published! Sessions are now visible to teachers.', 'success');
        setTimeout(() => navigateTo('sessions'), 600);
    } catch (err) {
        showNotification('Failed to publish: ' + err.message, 'error');
    } finally {
        if (lbl) lbl.style.display = '';
        if (loader) loader.style.display = 'none';
        if (btn) btn.disabled = false;
    }
};

// =========================================================================
// SESSIONS MONITOR (Pedagog Follow-Up)
// =========================================================================

let smAllSessions = [];

window.loadSessionsMonitor = async function () {
    const tbody = document.getElementById('smTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="padding:48px 20px;text-align:center">' +
        '<div style="width:28px;height:28px;border:3px solid #93c5fd;border-top-color:#2563eb;border-radius:50%;' +
             'animation:spin .7s linear infinite;margin:0 auto 10px"></div>' +
        '<div style="font-size:13px;color:var(--text-3);font-weight:500">Loading sessions…</div>' +
    '</td></tr>';

    try {
        const res = await fetch('/api/timetablecontent/sessions/all');
        if (!res.ok) throw new Error("HTTP " + res.status);
        smAllSessions = await res.json();

        // Populate classroom filter
        const classSelect = document.getElementById('smClassFilter');
        if (classSelect) {
            const classMap = new Map();
            smAllSessions.forEach(s => {
                if (s.classroomId && s.classroomName) classMap.set(s.classroomId, s.classroomName);
            });
            const prevVal = classSelect.value;
            classSelect.innerHTML = '<option value="">All Classrooms</option>';
            classMap.forEach((name, id) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = name;
                if (String(id) === prevVal) opt.selected = true;
                classSelect.appendChild(opt);
            });
        }

        renderSessionsTable();

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="7" style="padding:48px 20px;text-align:center;color:#ef4444;font-weight:600">' +
            'Failed to load sessions: ' + err.message + '</td></tr>';
    }
};

function renderSessionsTable() {
    const tbody       = document.getElementById('smTableBody');
    if (!tbody) return;

    const classFilter = document.getElementById('smClassFilter')?.value || '';
    const specFilter  = document.getElementById('smSpecFilter')?.value || '';
    const levelFilter = document.getElementById('smLevelFilter')?.value || '';
    const statusFilter= document.getElementById('smStatusFilter')?.value || '';
    const weekInput   = document.getElementById('smWeekFilter')?.value || '';

    let sessions = smAllSessions;

    if (specFilter)   sessions = sessions.filter(s => s.specialityName === specFilter);
    if (levelFilter)  sessions = sessions.filter(s => String(s.level) === levelFilter);
    if (classFilter)  sessions = sessions.filter(s => String(s.classroomId) === classFilter);
    if (statusFilter) sessions = sessions.filter(s => s.status === statusFilter);
    if (weekInput) {
        const parts = weekInput.split('-W');
        if (parts.length > 1) {
            sessions = sessions.filter(s => s.week === parseInt(parts[1]));
        }
    }

    if (!sessions.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:56px 20px;text-align:center">' +
            '<div style="font-size:13px;color:var(--text-3);font-weight:500">No sessions match the selected filters.</div>' +
        '</td></tr>';
        return;
    }

    // Sort by date then startTime
    sessions.sort((a, b) => {
        const d = (a.date || '').localeCompare(b.date || '');
        return d !== 0 ? d : (a.startTime || '').localeCompare(b.startTime || '');
    });

    tbody.innerHTML = sessions.map(s => renderSessionRow(s)).join('');
}

function renderSessionRow(s) {
    const STATUS_STYLES = {
        SCHEDULED:   { bg: '#f0fdf4', color: '#15803d', label: 'Scheduled' },
        IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8', label: 'In Progress' },
        COMPLETED:   { bg: '#f8fafc', color: '#475569', label: 'Completed' },
        CANCELLED:   { bg: '#fff1f2', color: '#be123c', label: 'Cancelled' },
    };
    const st = STATUS_STYLES[s.status] || { bg: '#f8fafc', color: '#64748b', label: s.status || '—' };

    const dateStr = s.date
        ? new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
        : (s.day || '—');
    const timeStr = (s.startTime || '--').substring(0,5) + " – " + (s.endTime || '--').substring(0,5);

    // Attendance bar
    const attBar = s.status === 'COMPLETED'
        ? '<div style="display:flex;align-items:center;gap:6px">' +
               '<div style="flex:1;height:6px;background:#e2e8f0;border-radius:4px;overflow:hidden">' +
                   '<div style="height:100%;background:#10b981;border-radius:4px;width:' + (s.attendanceRate || 0) + '%"></div>' +
               '</div>' +
               '<span style="font-size:11px;font-weight:700;color:#475569">' + (s.attendanceRate || '?') + '%</span>' +
           '</div>'
        : '<span style="font-size:11px;color:var(--text-3)">—</span>';

    return '<tr style="border-top:1px solid #f1f5f9;transition:background .15s" onmouseover="this.style.background=\'#fafcff\'" onmouseout="this.style.background=\'\'">' +
            '<td style="padding:13px 16px">' +
                '<div style="font-weight:600;font-size:13px;color:var(--text)">' + (s.courseName || 'Event') + '</div>' +
                '<div style="font-size:11px;color:var(--text-3)">Week ' + (s.week || '—') + '</div>' +
                (s.specialityName ? '<span style="font-size:9px;color:var(--text-3)">' + s.specialityName + ' (L' + s.level + ')</span>' : '') +
            '</td>' +
            '<td style="padding:13px 16px">' +
                '<span style="padding:3px 10px;background:var(--blue-lt);color:var(--blue-dk);border-radius:20px;font-size:11px;font-weight:700">' +
                    (s.classroomName || '—') +
                '</span>' +
            '</td>' +
            '<td style="padding:13px 16px;font-size:13px;font-weight:500;color:var(--text-2)">' +
                dateStr + '<br><span style="color:var(--text-3);font-size:11px">' + timeStr + '</span>' +
            '</td>' +
            '<td style="padding:13px 16px;font-size:13px;color:var(--text-2)">' + (s.teacherName || '<em style="color:var(--text-3)">Unassigned</em>') + '</td>' +
            '<td style="padding:13px 16px">' +
                '<span style="padding:3px 10px;background:' + st.bg + ';color:' + st.color + ';border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">' +
                    st.label +
                '</span>' +
            '</td>' +
            '<td style="padding:13px 16px;min-width:120px">' + attBar + '</td>' +
            '<td style="padding:13px 16px;text-align:right">' +
                '<button onclick="viewSessionDetails(' + s.sessionId + ')" ' +
                        'style="padding:5px 10px;border:1px solid var(--border);background:var(--surface);border-radius:8px;font-size:11px;font-weight:600;color:var(--text-2);cursor:pointer;white-space:nowrap">' +
                    'View' +
                '</button>' +
                ((s.status !== 'CANCELLED' && s.status !== 'COMPLETED') ? ('<button onclick="cancelSession(' + s.sessionId + ')" style="margin-left:4px;padding:5px 10px;border:1px solid #fecdd3;background:#fff1f2;border-radius:8px;font-size:11px;font-weight:600;color:#e11d48;cursor:pointer;white-space:nowrap">Cancel</button>') : '') +
            '</td>' +
        '</tr>';
}

window.cancelSession = async function(sessionId) {
    if (!confirm("Are you sure you want to cancel this session?")) return;
    try {
        const res = await fetch("/api/sessions/" + sessionId, { method: 'DELETE' });
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
        const res = await fetch("/api/sessions/" + sessionId, {
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
    tbody.innerHTML = '<tr><td colspan="3" class="py-12 text-center text-slate-400">Loading roster...</td></tr>';
    document.getElementById('hubWorkspace').style.display = 'block';
    document.getElementById('hubEmptyState').style.display = 'none';

    try {
        const res = await fetch("/api/timetablecontent/attendance/" + sessionId);
        if (!res.ok) throw new Error("Failed to fetch roster");
        const data = await res.json();
        renderHubRoster(data);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="3" class="py-12 text-center text-red-500 font-bold">Error: ' + e.message + '</td></tr>';
    }
};

function renderHubRoster(records) {
    const tbody = document.getElementById('hubRosterBody');
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="py-12 text-center text-slate-400">No students recorded for this session.</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(r => {
        const fullName = escapeHtml((r.firstName || '') + " " + (r.lastName || ''));
        const email = escapeHtml(r.email || '');
        const matricule = escapeHtml(r.matricule || '—');
        
        return '<tr class="hover:bg-slate-50 transition">' +
            '<td class="px-6 py-4">' +
                '<div class="font-bold text-slate-700">' + fullName + '</div>' +
                '<div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">' + email + '</div>' +
            '</td>' +
            '<td class="px-6 py-4 text-sm font-bold text-slate-500">' + matricule + '</td>' +
            '<td class="px-6 py-4 text-right">' +
                '<div class="flex items-center justify-end gap-2">' +
                    '<button onclick="hubMarkAttendance(' + r.attendanceId + ', \'PRESENT\')" ' +
                            'class="px-3 py-1.5 rounded-lg text-[10px] font-bold border ' + (r.status === 'PRESENT' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200' : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200 hover:text-emerald-500') + ' transition">' +
                        'PRESENT' +
                    '</button>' +
                    '<button onclick="hubMarkAttendance(' + r.attendanceId + ', \'ABSENT\')" ' +
                            'class="px-3 py-1.5 rounded-lg text-[10px] font-bold border ' + (r.status === 'ABSENT' ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-200' : 'bg-white text-slate-400 border-slate-100 hover:border-red-200 hover:text-red-500') + ' transition">' +
                        'ABSENT' +
                    '</button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    }).join('');
}

window.hubMarkAttendance = function(id, status) {
    fetch("/api/timetablecontent/attendance/" + id + "/status?status=" + status, { method: 'POST' })
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
        const res = await fetch("/api/timetablecontent/attendance/session/" + sessionId + "/mark-all?status=" + status, { method: 'POST' });
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
    window.open("/api/timetablecontent/attendance/export/pdf/" + sessionId, '_blank');
};

// ==========================================
// NAVIGATION SYSTEM
// ==========================================

window.navigateTo = function(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('section-' + section);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
    const activeItem = document.querySelector('[data-section="' + section + '"]');
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
