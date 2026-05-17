import sys

with open('src/main/resources/static/js/student/student-dashboard.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace switchTab block in JS
start_marker = 'function switchTab(tabId) {'
end_marker = '/**'

start_idx = js.find(start_marker)
end_idx = js.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    new_switchTab = '''const TAB_MAP = {
    status:        { view: 'view-status',        desk: 'nav-desk-status',        mob: 'nav-mob-status' },
    calendar:      { view: 'view-calendar',      desk: 'nav-desk-calendar',      mob: 'nav-mob-calendar' },
    justification: { view: 'view-justification', desk: 'nav-desk-justification', mob: 'nav-mob-justification' },
    courses:       { view: 'view-courses',       desk: 'nav-desk-courses',        mob: 'nav-mob-courses' },
    stats:         { view: 'view-stats',         desk: 'nav-desk-stats',          mob: null },
    settings:      { view: 'view-settings',      desk: 'nav-desk-settings',       mob: 'nav-mob-settings' },
};

function switchTab(tabId) {
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

'''
    js = js[:start_idx] + new_switchTab + js[end_idx:]

with open('src/main/resources/static/js/student/student-dashboard.js', 'w', encoding='utf-8') as f:
    f.write(js)
