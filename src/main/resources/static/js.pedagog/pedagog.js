/* ═══════════════════════════════════════════════════════════
   attendee.js  —  Attendee Pedagogic Assistant
   Vanilla JS — no framework, no build step
═══════════════════════════════════════════════════════════ */
'use strict';

/* ─── API ENDPOINTS ──────────────────────────────────────── */
const API = {
  teachers:  '/api/admin/users',
  classrooms:'/api/admin/classrooms',
  subjects:  '/api/admin/subjects',
  students:  '/api/admin/students',
  timetable: '/api/admin/timetable',
  dashboard: '/api/dashboard/validation-queue',
  stuBulk:   '/api/admin/students/bulk-import',
};

/* ─── COLOUR PALETTE ─────────────────────────────────────── */
const COLORS = [
  '#e91e63','#1976d2','#388e3c','#f9a825','#7b1fa2',
  '#d84315','#00838f','#5d4037','#3949ab','#9e9d24',
  '#0097a7','#e53935','#43a047','#fb8c00','#8e24aa',
];

const PALETTES = [
  { bg:'#fce4ec', border:'#e91e63', text:'#c2185b' },
  { bg:'#e3f2fd', border:'#1976d2', text:'#1565c0' },
  { bg:'#e8f5e9', border:'#388e3c', text:'#2e7d32' },
  { bg:'#fff8e1', border:'#f9a825', text:'#e65100' },
  { bg:'#f3e5f5', border:'#7b1fa2', text:'#6a1b9a' },
  { bg:'#fbe9e7', border:'#d84315', text:'#bf360c' },
  { bg:'#e0f7fa', border:'#00838f', text:'#006064' },
  { bg:'#efebe9', border:'#5d4037', text:'#4e342e' },
  { bg:'#e8eaf6', border:'#3949ab', text:'#283593' },
  { bg:'#f9fbe7', border:'#9e9d24', text:'#827717' },
];

const pal = (i) => PALETTES[i % PALETTES.length];

/* ─── TIMETABLE CONSTANTS ────────────────────────────────── */
const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const START_H = 8;
const END_H   = 18;
const CELL_H  = 80;

/* ─── GLOBAL APP STATE ───────────────────────────────────── */
let teachers       = [];
let classes        = [];
let subjects       = [];
let students       = [];
let ttBlocks       = [];
let ttSideTab      = 'subjects';

let editingSubjId  = null;
let editingStuId   = null;
let sfSelTeachers  = [];
let sfSelClasses   = [];
let sfColor        = COLORS[0];
let ttEditBlock    = null;
let queueData      = [];
let queueTab       = 'attendance';
let importFile     = null;

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
const uid = () => Math.random().toString(36).slice(2, 9);

/** Escape HTML entities to prevent XSS */
const esc = (s) =>
  String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/** Generate initials from a full name */
const ini = (n) =>
  String(n || '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';

/** Lighten a hex colour to near-white tint */
function hexLight(h) {
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
  const bl = (c) => Math.round(c * .18 + 255 * .82);
  return `rgb(${bl(r)},${bl(g)},${bl(b)})`;
}

/** Darken a hex colour */
function hexDark(h) {
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
  return `rgb(${Math.round(r*.65)},${Math.round(g*.65)},${Math.round(b*.65)})`;
}

/* ─── HTTP helper ────────────────────────────────────────── */
async function apiFetch(url, opts = {}) {
  try {
    const isForm = opts.body instanceof FormData;
    const headers = isForm ? {} : { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const r = await fetch(url, { ...opts, headers });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch (e) {
    console.warn('API', url, e.message);
    return null;
  }
}

/* ─── Normalise API shapes ───────────────────────────────── */
const normTeacher = (t, i) => ({
  ...t,
  id:     String(t.userId    || t.id    || uid()),
  name:   t.username || t.name || '',
  dept:   t.dept     || t.department || '',
  palette: pal(i),
});
const normClass = (c) => ({
  ...c,
  id: String(c.classId || c.id || uid()),
});
/* normSubject defined below */
/* normStudent defined below */

/* ═══════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════════ */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="20 6 9 17 4 12"></polyline></svg>' + esc(msg);
  document.getElementById('toastStack').appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION / PAGE ROUTING
═══════════════════════════════════════════════════════════ */
function navigateTo(pageId) {
  // Alias map: nav data-page value → page section id suffix
  const aliases = { subjects: 'courses' };
  const resolved = aliases[pageId] || pageId;

  // Hide all pages, show target
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const pg = document.getElementById('pg-' + resolved);
  if (pg) pg.classList.add('active');

  // Highlight correct nav item (match both original and resolved)
  document.querySelectorAll('.nav-item[data-page]').forEach(n => {
    const dp = n.dataset.page;
    n.classList.toggle('active', dp === pageId || dp === resolved);
  });

  // Page-specific hooks
  if (resolved === 'timetable')    { refreshTTDropdowns(); renderTimetable(); }
  if (resolved === 'students')     { refreshStuClassFilter(); renderStudents(); }
  if (resolved === 'courses')      { /* data rendered by Thymeleaf */ }
  if (resolved === 'specialities') { loadSpecialitiesAndRooms(); }
  if (resolved === 'dashboard')    { renderDashboardStats(); }

  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth < 900) sidebar.classList.remove('mob-open');
}

/* Wire nav items */
document.querySelectorAll('.nav-item[data-page]').forEach(n => {
  n.addEventListener('click', () => navigateTo(n.dataset.page));
});
/* ── Mobile sidebar toggle ───────────────────────────────── */
function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay'); // element optional
  if (!sidebar) return;
  sidebar.classList.toggle('mob-open');
  if (overlay) overlay.classList.toggle('hidden');
}

/* ── Profile dropdown toggle ─────────────────────────────── */
function toggleProfileMenu() {
  const menu = document.getElementById('profileMenu');
  if (!menu) return;
  menu.classList.toggle('open');
}
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('profileDropdown');
  const menu     = document.getElementById('profileMenu');
  if (menu && dropdown && !dropdown.contains(e.target)) {
    menu.classList.remove('open');
  }
  // Close teacher dropdown if clicking outside
  const wrap = document.getElementById('cfTeacherWrap');
  const drop = document.getElementById('cfTeacherDrop');
  if (drop && wrap && !wrap.contains(e.target) && !drop.contains(e.target)) {
    drop.style.display = 'none';
  }
});



/* ═══════════════════════════════════════════════════════════
   BOOT — load all shared data once
═══════════════════════════════════════════════════════════ */
(async function boot() {
  const [t, c, s] = await Promise.all([
    apiFetch(API.teachers),
    apiFetch(API.classrooms),
    apiFetch(API.subjects),
  ]);

  teachers = (t || []).map(normTeacher);
  classes  = (c || []).map(normClass);
  subjects = (s || []).map(normSubject);

  renderDashboardStats();
  renderSubjects();
  refreshTTDropdowns();
  refreshStuClassFilter();
  loadStudents();
  loadQueue();
  updateSubjBadge();
  loadTimetable();
})();

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function renderDashboardStats() {
  const setEl = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setEl('dStatTeachers', teachers.length);
  setEl('dStatClasses', classes.length); setEl('dStatClasses2', classes.length);
  setEl('dStatSubjects', subjects.length); setEl('dStatStudents', students.length); setEl('dStatAdmins', teachers.length);
}

async function loadQueue() {
  const data = await apiFetch(API.dashboard);
  queueData = data || [];
  /* queue count — stat IDs handled by renderDashboardStats */
  renderQueue();
}

function switchQueueTab(tab) {
  queueTab = tab;
  document.getElementById('tabBtnAttend').classList.toggle('active', tab === 'attendance');
  document.getElementById('tabBtnJust').classList.toggle('active',   tab === 'justifications');
  renderQueue();
}

function renderQueue() {
  const list  = document.getElementById('queueList');
  const items = queueData.filter(i => queueTab === 'attendance' ? !i.isJustification : i.isJustification);

  if (!items.length) {
    list.innerHTML = `
      <div class="empty" style="padding:32px 0">
        <div class="empty-ico-box"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981"><path d="M9 11l3 3L22 4"/></svg></div>
        <div class="empty-title" style="font-size:16px">All caught up!</div>
        <div class="empty-msg">No pending ${queueTab} items.</div>
      </div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="queue-item">
      <div class="queue-avatar">${esc(ini(item.studentName || '?'))}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${esc(item.studentName || 'Unknown')}</div>
        <div style="font-size:11px;color:var(--text-3)">${esc(item.course)} • ${esc(item.date)}</div>
      </div>
      <button class="btn btn-success btn-sm" onclick="validateQueueItem(${item.id},true)">Validate</button>
      <button class="btn btn-danger btn-sm"  onclick="validateQueueItem(${item.id},false)">Reject</button>
    </div>`).join('');
}

function validateQueueItem(id, approve) {
  queueData = queueData.filter(i => i.id !== id);
  /* queue count displayed in renderQueue() */
  renderQueue();
  toast(approve ? 'Validated ✓' : 'Rejected', approve ? 'success' : 'info');
}

/* ═══════════════════════════════════════════════════════════
   SUBJECTS
═══════════════════════════════════════════════════════════ */
function updateSubjBadge() {
  // subjBadge element removed — courses page is Thymeleaf-rendered
  // No-op for compatibility
}

function renderSubjects() {
  // Courses page is rendered by Thymeleaf server-side.
  // This function is a safe no-op for client-side compatibility.
  // If API data is available, update the dynamic subjects badge.
  updateSubjBadge();
}

/* ── Subject Modal ───────────────────────────────────────── */
function openSubjectModal(id = null) {
  // Subjects are now managed as Courses via Thymeleaf.
  // Redirect to course modal for new entries.
  openCourseModal();
}

function closeSubjectModal() {
  const o = document.getElementById('courseOverlay');
  if (o) o.classList.remove('open');
}

async function saveSubject() {
  const name = (document.getElementById('sfName') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).value.trim();
  if (!name) { (document.getElementById('sfName') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).focus(); return; }

  const btn = (document.getElementById('sfSaveBtn') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}});
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const payload = {
    name,
    code:        (document.getElementById('sfCode') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).value.trim(),
    dept:        (document.getElementById('sfDept') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).value.trim(),
    credits:     (document.getElementById('sfCredits') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).value.trim(),
    description: (document.getElementById('sfDesc') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).value.trim(),
    color:       sfColor,
    teacherIds:  [...sfSelTeachers],
    classIds:    [...sfSelClasses],
  };

  const isEdit = !!editingSubjId;
  const res = await apiFetch(
    isEdit ? `${API.subjects}/${editingSubjId}` : API.subjects,
    { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }
  );
  const saved = normSubject(res || { ...payload, id: editingSubjId || uid() }, subjects.length);

  if (isEdit) subjects = subjects.map(s => s.id === editingSubjId ? saved : s);
  else        subjects = [saved, ...subjects];

  closeSubjectModal();
  renderSubjects();
  updateSubjBadge();
  toast(isEdit ? 'Subject updated' : 'Subject added', 'success');
  btn.disabled = false;
  btn.textContent = isEdit ? 'Save Changes' : 'Add Subject';
}

async function deleteSubject(id) {
  if (!confirm('Delete this subject? It will also be removed from the timetable.')) return;
  await apiFetch(`${API.subjects}/${id}`, { method: 'DELETE' });
  subjects  = subjects.filter(s => s.id !== id);
  ttBlocks  = ttBlocks.filter(b => b.subjectId !== id);
  renderSubjects();
  updateSubjBadge();
  toast('Subject deleted', 'info');
}


function normStudent(s, i) {
  return {
    id:         s.id         || s.studentId      || String(i),
    name:       s.name       || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unknown',
    firstName:  s.firstName  || (s.name || '').split(' ')[0] || '',
    lastName:   s.lastName   || (s.name || '').split(' ').slice(1).join(' ') || '',
    email:      s.email      || '',
    matricule:  s.matricule  || s.matriculeNumber || '',
    classId:    s.classId    || s.classroom?.classId || s.classroom?.id || '',
    className:  s.className  || s.classroom?.name    || '',
    level:      s.level      || s.classroom?.level   || '',
    speciality: s.speciality || s.classroom?.speciality?.name || '',
    gender:     s.gender     || '',
    dob:        s.dob        || '',
  };
}

function normSubject(s, i) {
  return { ...s, id: String(s.subjectId || s.id || uid()), color: s.color || COLORS[i % COLORS.length], palette: pal(i) };
}

/* ── Colour swatches ─────────────────────────────────────── */
function buildSfColorSwatches() {
  const wrap = (document.getElementById('sfColorSwatches') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}});
  wrap.innerHTML = '';
  COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (c === sfColor ? ' active' : '');
    sw.style.background = c;
    sw.dataset.color = c;
    sw.title = c;
    sw.onclick = () => {
      sfColor = c;
      wrap.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === c));
      updateSfColorPreview();
    };
    wrap.appendChild(sw);
  });
  updateSfColorPreview();
}

function updateSfColorPreview() {
  const label = (document.getElementById('sfCode') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).value.trim()
              || (document.getElementById('sfName') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).value.trim()
              || 'Preview';
  (document.getElementById('sfColorDot') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).style.background = sfColor;
  (document.getElementById('sfColorLabel') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).textContent    = label;
  const p = (document.getElementById('sfColorPreview') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}});
  p.style.background   = hexLight(sfColor);
  p.style.color        = hexDark(sfColor);
  p.style.borderLeft   = `4px solid ${sfColor}`;
}

(document.getElementById('sfName') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).addEventListener('input', () => {
  const _so = (document.getElementById('subjOverlay') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}) || document.getElementById('courseOverlay'); if (_so && _so.classList.contains('open')) updateSfColorPreview();
});
(document.getElementById('sfCode') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).addEventListener('input', () => {
  const _so = (document.getElementById('subjOverlay') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}) || document.getElementById('courseOverlay'); if (_so && _so.classList.contains('open')) updateSfColorPreview();
});

/* ── Multi-select widget ─────────────────────────────────── */
function buildMultiSelect(boxId, dropId, phId, arrowId, options, selected, onChanged) {
  const box   = document.getElementById(boxId);
  const drop  = document.getElementById(dropId);
  const ph    = document.getElementById(phId);
  const arrow = document.getElementById(arrowId);

  function renderBox() {
    box.querySelectorAll('.ms-chip').forEach(e => e.remove());
    if (!selected.length) {
      ph.style.display = '';
    } else {
      ph.style.display = 'none';
      selected.forEach(id => {
        const opt = options.find(o => o.id === id);
        if (!opt) return;
        const chip = document.createElement('span');
        chip.className = 'ms-chip';
        chip.innerHTML = `${esc(opt.name)} <span class="rm" data-id="${esc(id)}">×</span>`;
        chip.querySelector('.rm').onclick = e => {
          e.stopPropagation();
          selected.splice(selected.indexOf(id), 1);
          renderBox(); renderDrop(); onChanged(selected);
        };
        box.insertBefore(chip, arrow);
      });
    }
  }

  function renderDrop() {
    drop.innerHTML = '';
    if (!options.length) {
      drop.innerHTML = '<div class="ms-empty">No options available (add via admin panel)</div>';
      return;
    }
    options.forEach(opt => {
      const row = document.createElement('div');
      row.className = 'ms-option' + (selected.includes(opt.id) ? ' selected' : '');
      row.innerHTML = `
        <div class="ms-checkbox">${selected.includes(opt.id) ? '✓' : ''}</div>
        <div>
          <div class="ms-opt-name">${esc(opt.name)}</div>
          ${opt.sub ? `<div class="ms-opt-sub">${esc(opt.sub)}</div>` : ''}
        </div>`;
      row.onclick = () => {
        const idx = selected.indexOf(opt.id);
        if (idx > -1) selected.splice(idx, 1);
        else           selected.push(opt.id);
        renderBox(); renderDrop(); onChanged(selected);
      };
      drop.appendChild(row);
    });
  }

  function toggleOpen() {
    const open = drop.classList.toggle('open');
    box.classList.toggle('open', open);
    arrow.textContent = open ? '▲' : '▼';
    /* Close other open dropdowns */
    document.querySelectorAll('.ms-dropdown.open').forEach(d => {
      if (d !== drop) { d.classList.remove('open'); d.previousElementSibling?.classList.remove('open'); }
    });
  }

  box.onclick    = toggleOpen;
  box.onkeydown  = e => { if (e.key === 'Enter' || e.key === ' ') toggleOpen(); };
  renderBox(); renderDrop();
}

/* Close dropdowns when clicking outside */
document.addEventListener('click', e => {
  if (!e.target.closest('.multi-wrap')) {
    document.querySelectorAll('.ms-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.previousElementSibling?.classList.remove('open');
    });
  }
});

/* ═══════════════════════════════════════════════════════════
   STUDENTS
═══════════════════════════════════════════════════════════ */
async function loadStudents() {
  const data = await apiFetch(API.students);
  students = (data || []).map(normStudent);
  renderStudents();
  updateStuBadge();
}

function updateStuBadge() {
  const b = document.getElementById('stuBadge');
  b.textContent  = students.length;
  b.style.display = students.length ? '' : 'none';
}

function refreshStuClassFilter() {
  // Populate the classroom select inside student modal (if not already Thymeleaf-populated)
  const classroomSel = document.getElementById('classroomSelect');
  if (classroomSel && classes.length && classroomSel.options.length <= 1) {
    classroomSel.innerHTML = '<option value="">Select Classroom</option>' +
      classes.map(c => `<option value="${esc(c.id)}">${esc(c.name)}${c.level ? ` · L${esc(String(c.level))}` : ''}</option>`).join('');
  }

  // Populate the student page filter dropdowns if not already populated
  const classFilter = document.getElementById('studentClassFilter');
  if (classFilter && classes.length && classFilter.options.length <= 1) {
    classFilter.innerHTML = '<option value="">All Classrooms</option>' +
      classes.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
  }
}

function renderStudents() {
  // Render into the Thymeleaf table body that exists in HTML
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) return;

  // Read global search if available
  const q  = (document.getElementById('studentSearch')?.value || '').toLowerCase();

  const filtered = students.filter(s => {
    const name = (s.name || s.firstName + ' ' + s.lastName || '').toLowerCase();
    return !q || name.includes(q) || (s.matricule || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
  });

  if (!filtered.length && students.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="4" style="padding:56px 20px;text-align:center">
        <div class="empty-ico-box" style="margin:0 auto 12px"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#0ea5e9"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <div style="font-weight:600;color:var(--text-2);font-size:13px">No students registered yet.</div>
        <button class="btn btn-primary" style="margin-top:14px" onclick="openStudentModal()">Register First Student</button>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const name     = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || '—';
    const initial  = (name[0] || '?').toUpperCase();
    const cls      = classes.find(c => c.id === s.classId);
    const clsName  = cls ? cls.name : (s.className || '—');
    const level    = cls ? cls.level : (s.level || '');
    return `
      <tr class="student-row"
          data-spec="${esc(s.speciality || clsName)}"
          data-class="${esc(clsName)}"
          data-level="${esc(String(level))}"
          style="border-top:1px solid #f1f5f9">
        <td style="padding:14px 20px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:38px;height:38px;background:var(--blue-lt);color:var(--blue);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${initial}</div>
            <div>
              <div style="font-weight:600;color:var(--text)">${esc(name)}</div>
              <div style="font-size:12px;color:var(--text-3)">${esc(s.email || '—')}</div>
            </div>
          </div>
        </td>
        <td style="padding:14px 20px;font-size:13px;font-weight:500;color:var(--text-2)">
          <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:11px">${esc(s.matricule || '—')}</code>
        </td>
        <td style="padding:14px 20px">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="padding:3px 10px;background:var(--blue-lt);color:var(--blue);border-radius:20px;font-size:11px;font-weight:700">${esc(clsName)}</span>
            ${level ? `<span style="padding:2px 7px;background:#f1f5f9;color:#475569;border-radius:6px;font-size:10px;font-weight:800;text-transform:uppercase">L${esc(String(level))}</span>` : ''}
          </div>
        </td>
        <td style="padding:14px 20px;text-align:right">
          <button style="padding:6px 10px;color:#0ea5e9;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;margin-right:4px" onclick="openStudentModal('${esc(s.id)}')">Edit</button>
          <button style="padding:6px 10px;color:#ef4444;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600" onclick="deleteStudent('${esc(s.id)}')">Delete</button>
        </td>
      </tr>`;
  }).join('');
}

function openStudentModal(id = null) {
  editingStuId = id;
  const s = id ? students.find(x => x.id === id) : null;

  // Split name into first/last for the new form
  const nameParts = (s?.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName  = nameParts.slice(1).join(' ') || '';

  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };

  set('stfFirstName', s ? firstName : '');
  set('stfLastName',  s ? lastName  : '');
  set('stfEmail',     s?.email      || '');
  set('stfMatricule', s?.matricule  || '');
  set('classroomSelect', s?.classId || '');
  set('stfGender',    s?.gender     || '');
  set('stfDob',       s?.dob        || '');

  const title = document.getElementById('stuModalTitle');
  const btnSpan = document.querySelector('#stfSaveBtn span');
  if (title)   title.textContent    = s ? 'Edit Student' : 'Register Student';
  if (btnSpan) btnSpan.textContent  = s ? 'Save Changes' : 'Register Student';

  document.getElementById('stuOverlay').classList.add('open');
  const ff = document.getElementById('stfFirstName');
  if (ff) ff.focus();
}

function closeStuModal() {
  document.getElementById('stuOverlay').classList.remove('open');
  editingStuId = null;
}

async function saveStudent() {
  const firstName = (document.getElementById('stfFirstName')?.value || '').trim();
  const lastName  = (document.getElementById('stfLastName')?.value  || '').trim();
  const name      = [firstName, lastName].filter(Boolean).join(' ');
  const classId   = document.getElementById('classroomSelect')?.value || '';

  if (!name || !classId) { toast('Name and classroom are required', 'error'); return; }

  const btn     = document.getElementById('stfSaveBtn');
  const loader  = document.getElementById('studentSubmitLoader');
  if (btn)    { btn.disabled = true; }
  if (loader) { loader.style.display = 'block'; }

  const payload = {
    name,
    firstName,
    lastName,
    matricule: (document.getElementById('stfMatricule')?.value || '').trim(),
    classId,
    gender:    document.getElementById('stfGender')?.value    || '',
    dob:       document.getElementById('stfDob')?.value       || '',
    email:     (document.getElementById('stfEmail')?.value    || '').trim(),
  };

  const isEdit = !!editingStuId;
  const res = await apiFetch(
    isEdit ? `${API.students}/${editingStuId}` : API.students,
    { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }
  );
  const saved = normStudent({ ...payload, id: editingStuId || uid(), ...(res || {}) });

  if (isEdit) students = students.map(s => s.id === editingStuId ? saved : s);
  else        students = [saved, ...students];

  closeStuModal();
  renderStudents();
  updateStuBadge();
  toast(isEdit ? 'Student updated' : 'Student registered', 'success');
  if (btn)    { btn.disabled = false; }
  if (loader) { loader.style.display = 'none'; }
}

async function deleteStudent(id) {
  if (!confirm('Delete this student?')) return;
  await apiFetch(`${API.students}/${id}`, { method: 'DELETE' });
  students = students.filter(s => s.id !== id);
  renderStudents();
  updateStuBadge();
  toast('Student deleted', 'info');
}

/* ── Bulk Import ─────────────────────────────────────────── */
function openBulkImport() {
  importFile = null;
  document.getElementById('importFileName').textContent = 'Drop file or click to browse';
  document.getElementById('importStartBtn').disabled = true;
  document.getElementById('importStep1').style.display = '';
  document.getElementById('importStep2').style.display = 'none';

  const ids = document.getElementById('importClassIds');
  ids.innerHTML = classes.length
    ? `<div class="label" style="margin-bottom:6px">Your Class IDs</div>
       <div style="display:flex;flex-wrap:wrap;gap:6px">
         ${classes.map(c => `<div style="padding:2px 8px;border-radius:4px;background:#f5f5f5;font-size:11px">
           <code style="font-weight:700">${esc(c.id)}</code> → ${esc(c.name)}
         </div>`).join('')}
       </div>`
    : '';

  document.getElementById('importOverlay').classList.add('open');
}

function closeBulkImport() {
  document.getElementById('importOverlay').classList.remove('open');
}

function handleImportDrop(e) {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) setImportFile(f);
}

function handleImportFile(e) {
  const f = e.target.files[0];
  if (f) setImportFile(f);
}

function setImportFile(f) {
  const ext = f.name.split('.').pop().toLowerCase();
  if (!['csv','xlsx','xls'].includes(ext)) { toast('Use .csv .xlsx or .xls', 'error'); return; }
  importFile = f;
  document.getElementById('importFileName').textContent = `📄 ${f.name}`;
  document.getElementById('importStartBtn').disabled = false;
}

async function startImport() {
  if (!importFile) return;
  const btn = document.getElementById('importStartBtn');
  btn.disabled = true; btn.textContent = 'Importing…';

  const fd = new FormData();
  fd.append('file', importFile);
  const r = await fetch(API.stuBulk, { method: 'POST', body: fd })
    .then(x => x.ok ? x.json() : null)
    .catch(() => null);

  btn.disabled = false; btn.textContent = 'Start Import';

  if (r) {
    document.getElementById('impTotal').textContent   = r.totalRows   ?? 0;
    document.getElementById('impSuccess').textContent = r.successCount ?? 0;
    document.getElementById('impFailed').textContent  = r.failureCount ?? 0;
    document.getElementById('importStep1').style.display = 'none';
    document.getElementById('importStep2').style.display = '';
    await loadStudents();
  } else {
    toast('Import failed. Check file format.', 'error');
  }
}

function downloadTemplate() {
  const rows = classes.map(c => `# "${c.id}" = ${c.name}`).join('\n');
  const csv  = `# Class IDs:\n${rows || '# (none)'}\n\nname,matricule,classId,gender,dob,email\n`;
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'students_template.csv';
  a.click();
}

/* ═══════════════════════════════════════════════════════════
   TIMETABLE
═══════════════════════════════════════════════════════════ */
const ttKey = () =>
  `tt_${document.getElementById('ttSemester').value.replace(/\s+/g, '_')}`;

function refreshTTDropdowns() {
  /* Class filter in timetable header */
  const cf = document.getElementById('ttClassFilter');
  const cv = cf.value;
  cf.innerHTML = '<option value="all">— All Classes —</option>' +
    classes.map(c => `<option value="${esc(c.id)}"${c.id === cv ? ' selected' : ''}>${esc(c.name)}${c.level ? ` (${esc(c.level)})` : ''}</option>`).join('');

  /* Slot modal: subject */
  document.getElementById('ttSlotSubj').innerHTML =
    '<option value="">— Select subject —</option>' +
    subjects.map(s => `<option value="${esc(s.id)}">${esc(s.name)}${s.code ? ` (${esc(s.code)})` : ''}</option>`).join('');

  /* Slot modal: teacher */
  document.getElementById('ttSlotTchr').innerHTML =
    '<option value="">— No teacher —</option>' +
    teachers.map(t => `<option value="${esc(t.id)}">${esc(t.name)}${t.dept ? ` (${esc(t.dept)})` : ''}</option>`).join('');

  /* Slot modal: class */
  document.getElementById('ttSlotClass').innerHTML =
    '<option value="">— No class —</option>' +
    classes.map(c => `<option value="${esc(c.id)}">${esc(c.name)}${c.level ? ` (${esc(c.level)})` : ''}</option>`).join('');

  /* Admin warning banner */
  const w = document.getElementById('ttAdminWarn');
  w.style.display = (!subjects.length || !teachers.length || !classes.length) ? '' : 'none';
}

async function loadTimetable() {
  const sem  = document.getElementById('ttSemester').value;
  const data = await apiFetch(`${API.timetable}?semester=${encodeURIComponent(sem)}`);
  if (data) {
    ttBlocks = Array.isArray(data) ? data : (data.slots || []);
  } else {
    try { ttBlocks = JSON.parse(localStorage.getItem(ttKey()) || '[]'); } catch { ttBlocks = []; }
  }
  renderTimetable();
}

async function saveTimetable() {
  const sem   = document.getElementById('ttSemester').value;
  const label = document.getElementById('ttSaving');
  label.style.display = '';
  try { localStorage.setItem(ttKey(), JSON.stringify(ttBlocks)); } catch {}
  await apiFetch(API.timetable, { method: 'POST', body: JSON.stringify({ semester: sem, slots: ttBlocks }) });
  label.style.display = 'none';
  toast('Timetable saved!', 'success');
}

function getVisTTBlocks() {
  const cf = document.getElementById('ttClassFilter').value;
  return cf === 'all' ? ttBlocks : ttBlocks.filter(b => b.classId === cf);
}

function renderTimetable() {
  const vis = getVisTTBlocks();
  const cf  = document.getElementById('ttClassFilter').value;
  const cls = classes.find(c => c.id === cf);

  const lbl = document.getElementById('ttClassLabel');
  if (lbl) {
    if (cls) {
      lbl.innerHTML = `<span class="class-badge">🏫 ${esc(cls.name)}${cls.level ? ` <span style="color:#90caf9">— ${esc(cls.level)}</span>` : ''} <span style="font-size:11px;color:#90caf9">(${vis.length} slots)</span></span>`;
    } else {
      lbl.textContent = `All classes • ${ttBlocks.length} total slots`;
    }
  }

  renderTTSidebar();

  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const grid  = document.getElementById('ttGrid');
  if (!grid) return;

  // Total rows = 1 header + N hour rows
  const totalRows = 1 + hours.length;
  grid.style.gridTemplateColumns = `80px repeat(${DAYS.length}, 1fr)`;
  grid.style.gridTemplateRows   = `52px repeat(${hours.length}, ${CELL_H}px)`;
  grid.innerHTML = '';

  // ── Header row (row 1) ──────────────────────────────────────
  const timeHdr = document.createElement('div');
  timeHdr.className = 'tt-hdr-time';
  timeHdr.style.gridRow = '1';
  timeHdr.style.gridColumn = '1';
  timeHdr.textContent = 'Time';
  grid.appendChild(timeHdr);

  DAYS.forEach((d, di) => {
    const dh = document.createElement('div');
    dh.className = 'tt-hdr-day';
    dh.style.gridRow    = '1';
    dh.style.gridColumn = String(di + 2);
    if (di === DAYS.length - 1) dh.style.borderRadius = '0 12px 0 0';
    dh.textContent = d;
    grid.appendChild(dh);
  });

  // ── Build a set of covered (day, hour) pairs from spanning blocks ──
  const covered = new Set();
  vis.forEach(b => {
    const span = b.span || 1;
    for (let sp = 1; sp < span; sp++) {
      covered.add(`${b.day}|${b.startHour + sp}`);
    }
  });

  // ── Time + cells ──────────────────────────────────────────────
  hours.forEach((hour, hi) => {
    const rowIdx = hi + 2; // CSS grid row (1-based, +1 for header)

    // Time label
    const tc = document.createElement('div');
    tc.className = 'tt-time-cell';
    tc.style.gridRow    = `${rowIdx}`;
    tc.style.gridColumn = '1';
    tc.textContent = `${String(hour).padStart(2,'0')}:00`;
    grid.appendChild(tc);

    // Day cells
    DAYS.forEach((day, di) => {
      const colIdx = di + 2;

      // Skip cells that are covered by a spanning block above
      if (covered.has(`${day}|${hour}`)) return;

      const blk  = vis.find(b => b.day === day && b.startHour === hour);
      const span = blk ? Math.max(1, blk.span || 1) : 1;

      // Clamp span so it doesn't go past end of grid
      const clampedSpan = Math.min(span, hours.length - hi);

      const cell = document.createElement('div');
      cell.className   = 'tt-cell';
      cell.style.gridRow    = `${rowIdx} / span ${clampedSpan}`;
      cell.style.gridColumn = String(colIdx);
      cell.style.minHeight  = `${CELL_H * clampedSpan}px`;
      cell.style.position   = 'relative';

      // Drop events on empty cells
      if (!blk) {
        cell.addEventListener('dragover', ev => {
          ev.preventDefault();
          cell.classList.add('over');
          if (!cell.querySelector('.tt-drop-hint')) {
            const hint = document.createElement('div');
            hint.className = 'tt-drop-hint';
            hint.textContent = '+';
            cell.appendChild(hint);
          }
        });
        cell.addEventListener('dragleave', () => {
          cell.classList.remove('over');
          cell.querySelector('.tt-drop-hint')?.remove();
        });
        cell.addEventListener('drop', ev => handleTTDrop(ev, day, hour, cell));
      }

      if (blk) {
        const el = createBlockEl(blk, clampedSpan);
        cell.appendChild(el);
      }

      grid.appendChild(cell);
    });
  });
}

function createBlockEl(blk, displaySpan) {
  const subj  = subjects.find(s => s.id === blk.subjectId);
  const tchr  = teachers.find(t => t.id === blk.teacherId);
  const p     = subj?.palette || pal(0);
  const span  = displaySpan || blk.span || 1;

  const el = document.createElement('div');
  el.className = 'tt-block';
  el.draggable = true;
  // Fill the merged cell completely
  el.style.cssText = `
    position:absolute;top:2px;left:2%;width:96%;
    height:calc(100% - 4px);
    border-radius:8px;padding:10px 10px 18px;
    box-shadow:var(--sh-sm);cursor:grab;
    box-sizing:border-box;user-select:none;overflow:hidden;z-index:10;
    border-left:5px solid ${p.border};
    background:${p.bg};
  `;

  const hoursLabel = span > 1 ? `<span style="font-size:10px;opacity:.65;margin-left:6px">${span}h</span>` : '';
  el.innerHTML = `
    <button class="tt-block-del" title="Remove" style="position:absolute;top:5px;right:7px;border:none;background:none;cursor:pointer;font-size:13px;color:rgba(0,0,0,.25);line-height:1;padding:2px">✕</button>
    <div class="tt-block-title" style="color:${p.text}">${esc(subj?.name || 'Unknown')}${hoursLabel}</div>
    ${subj?.code ? `<div class="tt-block-code" style="color:${p.text}">${esc(subj.code)}</div>` : ''}
    <span class="tt-block-teacher">${tchr ? `👤 ${esc(tchr.name)}` : '<span style="opacity:.5">Drop teacher here</span>'}</span>
    <div class="tt-resize" title="Drag to resize" style="position:absolute;bottom:0;left:0;width:100%;height:16px;cursor:ns-resize;display:flex;justify-content:center;align-items:center;background:rgba(0,0,0,.04);border-radius:0 0 8px 8px">
      <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
        <line x1="2" y1="2" x2="18" y2="2" stroke="rgba(0,0,0,.25)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="2" y1="6" x2="18" y2="6" stroke="rgba(0,0,0,.25)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>`;

  el.querySelector('.tt-block-del').onclick = ev => { ev.stopPropagation(); removeTTBlock(blk.id); };
  el.onclick = () => openTTSlotModal(blk);

  el.addEventListener('dragstart', ev => {
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('type', 'block');
    ev.dataTransfer.setData('id', blk.id);
  });

  // ── Resize handle: drag vertically to extend/shrink span ────
  el.querySelector('.tt-resize').addEventListener('mousedown', ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const startY    = ev.clientY;
    const startSpan = blk.span || 1;
    let   lastSpan  = startSpan;

    // Visual feedback: highlight the block during resize
    el.style.opacity = '0.85';
    el.style.cursor  = 'ns-resize';

    const move = mev => {
      const diff = mev.clientY - startY;
      const ns   = Math.max(1, Math.min(END_H - blk.startHour, Math.round(startSpan + diff / CELL_H)));
      if (ns !== lastSpan) {
        lastSpan  = ns;
        blk.span  = ns;
        renderTimetable();
      }
    };
    const up = () => {
      el.style.opacity = '';
      el.style.cursor  = '';
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      toast(`Block spans ${blk.span}h`, 'info');
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });

  el.querySelector('.tt-resize').addEventListener('click', ev => ev.stopPropagation());
  return el;
}

function handleTTDrop(e, day, hour, cell) {
  e.preventDefault();
  cell.classList.remove('over');
  cell.querySelector('.tt-drop-hint')?.remove();

  const type = e.dataTransfer.getData('type');
  const id   = e.dataTransfer.getData('id');
  if (!type || !id) return;

  const vis = getVisTTBlocks();
  const cf  = document.getElementById('ttClassFilter').value;

  if (type === 'subject') {
    // Check if any hour in a reasonable default span (1h) is already occupied
    if (vis.find(b => b.day === day && b.startHour === hour)) {
      toast('Slot already occupied at this time', 'error'); return;
    }
    openTTSlotModal({
      isNew: true, id: uid(), day,
      startHour: hour, span: 1,
      subjectId: id, teacherId: '',
      classId: cf !== 'all' ? cf : ''
    });

  } else if (type === 'teacher') {
    const blk = vis.find(b => b.day === day && b.startHour === hour);
    if (blk) {
      blk.teacherId = id;
      renderTimetable();
      toast('Teacher assigned', 'success');
    } else {
      toast('Drop teacher onto an existing subject block', 'info');
    }

  } else if (type === 'block') {
    // Moving an existing block — check new position is free
    const conflict = ttBlocks.find(b => b.id !== id && b.day === day && b.startHour === hour);
    if (conflict) { toast('Slot occupied', 'error'); return; }
    const b = ttBlocks.find(b => b.id === id);
    if (b) {
      b.day       = day;
      b.startHour = hour;
      // Clamp span so it doesn't overflow past end of day
      b.span = Math.min(b.span || 1, END_H - hour);
    }
    renderTimetable();
    toast('Block moved', 'success');
  }
}

function removeTTBlock(id) {
  ttBlocks = ttBlocks.filter(b => b.id !== id);
  renderTimetable();
  toast('Block removed', 'info');
}

/* ── Timetable sidebar tabs ──────────────────────────────── */
function switchTTTab(tab) {
  ttSideTab = tab;
  document.getElementById('ttSideSubjTab').classList.toggle('active', tab === 'subjects');
  document.getElementById('ttSideTchrTab').classList.toggle('active', tab === 'teachers');
  document.getElementById('ttSideHint').textContent = tab === 'subjects'
    ? '🟦 Drag a subject onto a grid cell to schedule it'
    : '👤 Drag a teacher onto an existing subject block to assign';
  renderTTSidebar();
}

function renderTTSidebar() {
  const items = document.getElementById('ttSideItems');

  if (ttSideTab === 'subjects') {
    if (!subjects.length) {
      items.innerHTML = `<div style="text-align:center;padding:30px 10px;color:#bdbdbd;font-size:12px">
        No subjects yet.<br/>Add them via admin panel.</div>`;
      return;
    }
    items.innerHTML = subjects.map((s, i) => {
      const p = s.palette || pal(i);
      return `
        <div class="tt-subj-item" draggable="true" data-sid="${esc(s.id)}"
             style="border:2px solid ${p.border}22;border-left:5px solid ${p.border};background:${p.bg}">
          <div style="font-weight:700;font-size:13px;color:${p.text}">${esc(s.name)}</div>
          ${s.code ? `<div style="font-size:11px;color:${p.text};opacity:.7;margin-top:3px">${esc(s.code)}</div>` : ''}
        </div>`;
    }).join('');
    items.querySelectorAll('.tt-subj-item').forEach(el => {
      el.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('type', 'subject');
        e.dataTransfer.setData('id', el.dataset.sid);
      });
    });

  } else {
    if (!teachers.length) {
      items.innerHTML = `<div style="text-align:center;padding:30px 10px;color:#bdbdbd;font-size:12px">
        No teachers yet.<br/>Add them via admin panel.</div>`;
      return;
    }
    items.innerHTML = teachers.map(t => `
      <div class="tt-tchr-item" draggable="true" data-tid="${esc(t.id)}">
        <div style="font-weight:700;font-size:13px;color:#2e7d32;display:flex;align-items:center;gap:6px">
          👨‍🏫 ${esc(t.name)}
        </div>
        ${t.dept ? `<div style="font-size:11px;color:#388e3c;margin-top:3px;padding-left:22px">${esc(t.dept)}</div>` : ''}
      </div>`).join('');
    items.querySelectorAll('.tt-tchr-item').forEach(el => {
      el.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('type', 'teacher');
        e.dataTransfer.setData('id', el.dataset.tid);
      });
    });
  }
}

/* ── Timetable slot modal ────────────────────────────────── */
function openTTSlotModal(blk) {
  ttEditBlock = blk;
  document.getElementById('ttSlotTitle').textContent = blk.isNew ? 'Assign Slot' : 'Edit Slot';
  document.getElementById('ttSlotSub').textContent   = `${blk.day} • ${blk.startHour}:00`;
  document.getElementById('ttSlotSubj').value  = blk.subjectId || '';
  document.getElementById('ttSlotTchr').value  = blk.teacherId || '';
  document.getElementById('ttSlotClass').value = blk.classId   || '';
  document.getElementById('ttSlotSpan').value  = blk.span      || 1;
  document.getElementById('ttSlotOverlay').classList.add('open');
}

function closeTTSlot() {
  document.getElementById('ttSlotOverlay').classList.remove('open');
  ttEditBlock = null;
}

function saveTTSlot() {
  const subjectId = document.getElementById('ttSlotSubj').value;
  if (!subjectId) { toast('Please select a subject', 'error'); return; }

  const data = {
    ...ttEditBlock,
    subjectId,
    teacherId: document.getElementById('ttSlotTchr').value,
    classId:   document.getElementById('ttSlotClass').value,
    span:      parseInt(document.getElementById('ttSlotSpan').value),
  };
  const { isNew, ...rest } = data;

  if (isNew) {
    ttBlocks.push(rest);
  } else {
    const idx = ttBlocks.findIndex(b => b.id === rest.id);
    if (idx > -1) ttBlocks[idx] = rest;
  }

  closeTTSlot();
  renderTimetable();
  toast(isNew ? 'Slot created' : 'Slot updated', 'success');
}

/* ── PDF Export ──────────────────────────────────────────── */
function exportTTPDF() {
  const loadLib = () => new Promise((res, rej) => {
    if (window.jspdf) { res(window.jspdf.jsPDF); return; }
    const s = document.createElement('script');
    s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => res(window.jspdf.jsPDF);
    s.onerror = rej;
    document.head.appendChild(s);
  });

  const vis      = getVisTTBlocks();
  const cf       = document.getElementById('ttClassFilter').value;
  const cls      = classes.find(c => c.id === cf);
  const semester = document.getElementById('ttSemester').value;

  loadLib().then(jsPDF => {
    const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297, H = 210, PL = 12, PR = 12;
    const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
    const colW  = (W - PL - PR - 20) / DAYS.length;
    const rowH  = Math.min(14, (H - 40) / hours.length);
    const gTop  = 22;

    doc.setFillColor(25, 118, 210); doc.rect(0, 0, W, 13, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text('Attendee — Timetable', PL, 8.5);
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
    doc.text(`${cls ? cls.name : 'All Classes'}  •  ${semester}  •  ${new Date().toLocaleDateString()}`, W - PR, 8.5, { align: 'right' });

    doc.setFillColor(100, 181, 246); doc.rect(PL + 20, gTop, W - PL - PR - 20, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont(undefined, 'bold');
    DAYS.forEach((d, i) => doc.text(d, PL + 20 + i * colW + colW / 2, gTop + 5.5, { align: 'center' }));

    hours.forEach((h, ri) => {
      const y = gTop + 8 + ri * rowH;
      if (ri % 2 === 0) { doc.setFillColor(250, 251, 252); doc.rect(PL, y, W - PL - PR, rowH, 'F'); }
      doc.setTextColor(117, 117, 117); doc.setFontSize(6.5); doc.setFont(undefined, 'bold');
      doc.text(`${h}:00`, PL + 10, y + rowH / 2 + 1, { align: 'center' });

      DAYS.forEach((day, ci) => {
        const x = PL + 20 + ci * colW;
        doc.setDrawColor(240, 240, 240); doc.rect(x, y, colW, rowH);
        const blk  = vis.find(b => b.day === day && b.startHour === h); if (!blk) return;
        const subj = subjects.find(s => s.id === blk.subjectId);         if (!subj) return;
        const tchr = teachers.find(t => t.id === blk.teacherId);
        const p    = subj.palette || pal(0);
        const hex  = p.border;
        const r    = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        const span = blk.span || 1;
        doc.setFillColor(Math.min(255,r+175), Math.min(255,g+175), Math.min(255,b+175));
        doc.rect(x+.3, y+.3, colW-.6, rowH*span-.6, 'F');
        doc.setFillColor(r, g, b); doc.rect(x+.3, y+.3, 2.5, rowH*span-.6, 'F');
        doc.setTextColor(r, g, b); doc.setFontSize(6.5); doc.setFont(undefined, 'bold');
        doc.text(subj.code || subj.name || '', x+4, y+4, { maxWidth: colW-5 });
        doc.setTextColor(50, 50, 50); doc.setFontSize(5.5); doc.setFont(undefined, 'normal');
        doc.text((subj.name || '').split(' ').slice(0,4).join(' '), x+4, y+8, { maxWidth: colW-5 });
        if (tchr) {
          doc.setTextColor(100, 100, 100); doc.setFontSize(5);
          doc.text(`T: ${(tchr.name || '').split(' ').pop()}`, x+4, y+rowH*span-2, { maxWidth: colW-5 });
        }
      });
    });

    doc.setDrawColor(180, 180, 180); doc.rect(PL, gTop+8, W-PL-PR, hours.length*rowH);
    doc.setFillColor(245, 247, 250); doc.rect(0, H-7, W, 7, 'F');
    doc.setTextColor(180, 180, 180); doc.setFontSize(5.5); doc.setFont(undefined, 'normal');
    doc.text('Attendee  •  Confidential', W/2, H-2.5, { align: 'center' });
    doc.save(`Timetable_${(cls?.name || 'all').replace(/\s+/g,'_')}_${semester.replace(/\s+/g,'_')}.pdf`);
  }).catch(() => alert('Could not load PDF library. Check your internet connection.'));
}

/* ═══════════════════════════════════════════════════════════
   GLOBAL EVENTS
═══════════════════════════════════════════════════════════ */

/* Close overlays on backdrop click */
document.querySelectorAll('.overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

/* Keyboard shortcuts */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if ((document.getElementById('subjOverlay') || {value:'',innerHTML:'',style:{},textContent:'',checked:false,disabled:false,classList:{add:()=>{},remove:()=>{},contains:()=>false}}).classList.contains('open'))   saveSubject();
    else if (document.getElementById('stuOverlay').classList.contains('open'))    saveStudent();
    else if (document.getElementById('ttSlotOverlay').classList.contains('open')) saveTTSlot();
  }
});

/* ═══════════════════════════════════════════════════════════
   PEDAGOG DASHBOARD EXTENSIONS
   — Course modal, rich student form, classroom filter,
     student row filtering, and page routing additions
═══════════════════════════════════════════════════════════ */

/* ── Course Modal ─────────────────────────────────────────── */
/* ── Course modal selected teachers state ─────────────────── */
let cfSelectedTeachers = [];

function openCourseModal() {
  const g = id => document.getElementById(id);
  if (g('cfName'))      g('cfName').value      = '';
  if (g('cfCode'))      g('cfCode').value      = '';
  if (g('cfCredits'))   g('cfCredits').value   = '';
  if (g('cfSemester'))  g('cfSemester').value  = '';
  if (g('cfSpeciality'))g('cfSpeciality').value= '';
  if (g('cfLevel'))     g('cfLevel').value     = '';
  if (g('cfDesc'))      g('cfDesc').value      = '';
  if (g('cfTeacherIds'))g('cfTeacherIds').value= '';
  cfSelectedTeachers = [];
  renderCfTeacherChips();
  buildCfTeacherOptions();
  const overlay = g('courseOverlay');
  if (overlay) { overlay.classList.add('open'); setTimeout(() => g('cfName') && g('cfName').focus(), 60); }
}

function closeCourseModal() {
  const overlay = document.getElementById('courseOverlay');
  if (overlay) overlay.classList.remove('open');
  const drop = document.getElementById('cfTeacherDrop');
  if (drop) drop.style.display = 'none';
}

function toggleCfTeacherDrop() {
  const drop = document.getElementById('cfTeacherDrop');
  if (!drop) return;
  const isOpen = drop.style.display !== 'none';
  drop.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) buildCfTeacherOptions();
}

function buildCfTeacherOptions() {
  const container = document.getElementById('cfTeacherOptions');
  if (!container) return;
  if (!teachers.length) {
    container.innerHTML = '<div style="padding:12px 16px;font-size:12px;color:var(--text-3);text-align:center">No teachers available</div>';
    return;
  }
  container.innerHTML = teachers.map(t => {
    const selected = cfSelectedTeachers.includes(t.id);
    return `
      <div onclick="toggleCfTeacher('${esc(t.id)}')"
           style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border-lt);transition:background .1s;background:${selected ? 'var(--blue-lt)' : 'transparent'}"
           onmouseover="this.style.background='${selected ? 'var(--blue-lt)' : 'var(--bg)'}'"
           onmouseout="this.style.background='${selected ? 'var(--blue-lt)' : 'transparent'}'">
        <div style="width:18px;height:18px;border-radius:4px;border:1.5px solid ${selected ? 'var(--blue)' : 'var(--border)'};background:${selected ? 'var(--blue)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .12s">
          ${selected ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
        <div style="width:32px;height:32px;border-radius:8px;background:var(--blue-lt);color:var(--blue);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">${esc(ini(t.name))}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(t.name)}</div>
          ${t.dept ? `<div style="font-size:11px;color:var(--text-3)">${esc(t.dept)}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function toggleCfTeacher(id) {
  const idx = cfSelectedTeachers.indexOf(id);
  if (idx >= 0) cfSelectedTeachers.splice(idx, 1);
  else cfSelectedTeachers.push(id);
  const hiddenInput = document.getElementById('cfTeacherIds');
  if (hiddenInput) hiddenInput.value = cfSelectedTeachers.join(',');
  renderCfTeacherChips();
  buildCfTeacherOptions();
}

function renderCfTeacherChips() {
  const chips       = document.getElementById('cfTeacherChips');
  const placeholder = document.getElementById('cfTeacherPlaceholder');
  if (!chips) return;
  if (!cfSelectedTeachers.length) {
    chips.innerHTML = '';
    if (placeholder) placeholder.style.display = '';
    return;
  }
  if (placeholder) placeholder.style.display = 'none';
  chips.innerHTML = cfSelectedTeachers.map(id => {
    const t = teachers.find(x => x.id === id);
    if (!t) return '';
    return `<span style="display:inline-flex;align-items:center;gap:5px;background:var(--blue-lt);color:var(--blue-dk);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">
      ${esc(t.name)}
      <span onclick="event.stopPropagation();toggleCfTeacher('${esc(id)}')" style="cursor:pointer;opacity:.6;font-size:14px;line-height:1" title="Remove">×</span>
    </span>`;
  }).join('');
}

async function handleCreateCourse(event) {
  event.preventDefault();
  const g      = id => document.getElementById(id);
  const btn    = g('cfSaveBtn');
  const loader = g('courseSubmitLoader');
  if (btn)    btn.disabled = true;
  if (loader) loader.style.display = 'block';

  const name       = (g('cfName')?.value       || '').trim();
  const courseCode = (g('cfCode')?.value        || '').trim();

  if (!name || !courseCode) {
    toast('Course name and code are required', 'error');
    if (btn)    btn.disabled = false;
    if (loader) loader.style.display = 'none';
    return;
  }

  // Get speciality name for display
  const specEl   = g('cfSpeciality');
  const specName = specEl?.options[specEl.selectedIndex]?.text || '';

  const payload = {
    name,
    courseCode,
    credits:      g('cfCredits')?.value   || '',
    semester:     g('cfSemester')?.value  || '',
    specialityId: specEl?.value           || '',
    level:        g('cfLevel')?.value     || '',
    teacherIds:   cfSelectedTeachers,
    description:  (g('cfDesc')?.value     || '').trim(),
  };

  try {
    await apiFetch('/api/courses', { method: 'POST', body: JSON.stringify(payload) });
    toast('Course created successfully', 'success');

    // Build teacher names string for display
    const teacherNames = cfSelectedTeachers
      .map(id => teachers.find(t => t.id === id)?.name).filter(Boolean).join(', ');

    closeCourseModal();

    // Insert row live into the courses table
    const tbody = document.querySelector('#pg-courses table tbody');
    if (tbody) {
      const tr = document.createElement('tr');
      tr.className = 'course-row';
      tr.style.cssText = 'border-top:1px solid #f1f5f9;animation:toastIn .2s ease';
      tr.innerHTML = `
        <td style="padding:14px 20px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:38px;height:38px;background:#f3e8ff;color:#7c3aed;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${esc(name[0].toUpperCase())}</div>
            <div>
              <div style="font-weight:600;color:var(--text)">${esc(name)}</div>
              ${payload.description ? `<div style="font-size:11px;color:var(--text-3)">${esc(payload.description.slice(0,50))}${payload.description.length>50?'…':''}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding:14px 20px;font-size:13px;font-weight:600;color:var(--text-2)">${esc(courseCode)}</td>
        <td style="padding:14px 20px">
          <div style="display:flex;flex-direction:column;gap:4px">
            <span style="padding:3px 10px;background:#f3e8ff;color:#7c3aed;border-radius:20px;font-size:11px;font-weight:700;display:inline-block">${esc(specName || 'Common')}</span>
            ${payload.credits  ? `<span style="font-size:10px;color:var(--text-3);font-weight:600">⏱ ${esc(payload.credits)} hrs/wk${payload.semester ? ' · ' + esc(payload.semester) : ''}</span>` : ''}
          </div>
        </td>
        <td style="padding:14px 20px">
          ${teacherNames
            ? `<div style="display:flex;flex-wrap:wrap;gap:4px">${cfSelectedTeachers.map(id => {
                const t = teachers.find(x=>x.id===id); if(!t) return '';
                return `<span style="padding:2px 8px;background:var(--blue-lt);color:var(--blue-dk);border-radius:6px;font-size:11px;font-weight:600">${esc(t.name)}</span>`;
              }).join('')}</div>`
            : `<span style="color:var(--text-3);font-size:12px;font-style:italic">—</span>`}
        </td>
        <td style="padding:14px 20px;text-align:right">
          <button style="padding:6px 10px;color:#0ea5e9;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">Edit</button>
        </td>`;
      tbody.insertBefore(tr, tbody.firstChild);

      // Hide empty-state row if present
      const emptyRow = tbody.querySelector('tr td[colspan]');
      if (emptyRow) emptyRow.closest('tr').style.display = 'none';
      // Update course count display
      filterCourseRows();
    }
  } catch (e) {
    toast('Failed to create course', 'error');
  }

  if (btn)    btn.disabled = false;
  if (loader) loader.style.display = 'none';
}

/* ── Rich Student Form (source: pedagog-dashboard) ──────── */
/* Override openStudentModal to also populate the new split-name fields */
const _origOpenStudentModal = typeof openStudentModal === 'function' ? openStudentModal : null;
/* openStudentModal consolidated above */

/* Handle the new onsubmit form — mirrors handleCreateStudent from source */
async function handleCreateStudent(event) {
  event.preventDefault();
  const btn    = document.getElementById('stfSaveBtn');
  const loader = document.getElementById('studentSubmitLoader');
  if (btn)    btn.disabled = true;
  if (loader) loader.style.display = 'block';

  const firstName   = (document.getElementById('stfFirstName')?.value || '').trim();
  const lastName    = (document.getElementById('stfLastName')?.value  || '').trim();
  const email       = (document.getElementById('stfEmail')?.value     || '').trim();
  const matricule   = (document.getElementById('stfMatricule')?.value || '').trim();
  const classroomId = document.getElementById('classroomSelect')?.value || '';
  const gender      = document.getElementById('stfGender')?.value      || '';
  const dob         = document.getElementById('stfDob')?.value         || '';

  if (!firstName || !lastName || !matricule || !classroomId) {
    toast('First name, last name, matricule and classroom are required', 'error');
    if (btn)    btn.disabled = false;
    if (loader) loader.style.display = 'none';
    return;
  }

  const payload = { firstName, lastName, email, matricule, classroomId, gender, dob };

  try {
    const res = await apiFetch('/api/students', { method: 'POST', body: JSON.stringify(payload) });
    const saved = { id: res?.id || uid(), name: `${firstName} ${lastName}`, matricule, classId: classroomId, email, gender, dob };
    students = [saved, ...students];
    renderStudents();
    updateStuBadge();
    closeStuModal();
    toast(`${firstName} ${lastName} registered successfully`, 'success');
  } catch (e) {
    toast('Failed to register student', 'error');
  }

  if (btn)    btn.disabled = false;
  if (loader) loader.style.display = 'none';
}

/* ── Classroom filter by speciality (source: filterClassrooms) ── */
function filterClassrooms(specialityId) {
  const sel = document.getElementById('classroomSelect');
  if (!sel) return;
  Array.from(sel.options).forEach(opt => {
    if (!opt.value) return; // keep placeholder
    if (!specialityId) {
      opt.hidden = false;
    } else {
      opt.hidden = (opt.dataset.spec !== specialityId);
    }
  });
  sel.value = '';
}

/* ── Course search filter ────────────────────────────────── */
function filterCourseRows() {
  const q = (document.getElementById('courseSearch')?.value || '').toLowerCase();
  let visible = 0;

  document.querySelectorAll('#pg-courses .course-row').forEach(row => {
    const text = (row.textContent || '').toLowerCase();
    const show = !q || text.includes(q);
    row.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  const countEl = document.getElementById('courseCount');
  const total   = document.querySelectorAll('#pg-courses .course-row').length;
  if (countEl) countEl.textContent = total ? `${visible} of ${total} course${total !== 1 ? 's' : ''}` : '';
}

/* ── Student row filters (source: applyStudentFilters) ───── */
function applyStudentFilters() {
  const q     = (document.getElementById('studentSearch')?.value || '').toLowerCase();
  const spec  = (document.getElementById('studentSpecFilter')?.value  || '').toLowerCase();
  const cls   = (document.getElementById('studentClassFilter')?.value || '').toLowerCase();
  const level = (document.getElementById('studentLevelFilter')?.value || '');

  let visible = 0;
  document.querySelectorAll('.student-row').forEach(row => {
    const rowSpec  = (row.dataset.spec  || '').toLowerCase();
    const rowCls   = (row.dataset.class || '').toLowerCase();
    const rowLevel = (row.dataset.level || '');
    const rowText  = (row.textContent   || '').toLowerCase();

    const matchQ     = !q     || rowText.includes(q);
    const matchSpec  = !spec  || rowSpec  === spec;
    const matchCls   = !cls   || rowCls   === cls;
    const matchLevel = !level || rowLevel === level;

    const show = matchQ && matchSpec && matchCls && matchLevel;
    row.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  const countEl = document.getElementById('studentCount');
  const total   = document.querySelectorAll('.student-row').length;
  if (countEl) countEl.textContent = total ? `${visible} of ${total} student${total !== 1 ? 's' : ''}` : '';
}

function filterStudentRows() {
  applyStudentFilters();
}

/* Navigation fully handled by navigateTo() above */

/* ═══════════════════════════════════════════════════════════
   SPECIALITIES & CLASSROOMS  — self-managed, no admin needed
═══════════════════════════════════════════════════════════ */

/* ── State ───────────────────────────────────────────────── */
let specialities  = [];   // { id, name, code, description }
let rooms         = [];   // { id, name, specialityId, level, capacity }
let editingSpecId = null;
let editingRoomId = null;

const API_SPEC  = '/api/specialities';
const API_ROOMS = '/api/classrooms';

/* ── Boot: load both collections ────────────────────────── */
async function loadSpecialitiesAndRooms() {
  const [sp, rm] = await Promise.all([
    apiFetch(API_SPEC),
    apiFetch(API_ROOMS),
  ]);
  specialities = (sp || []).map(s => ({
    id:          String(s.specialityId || s.id || uid()),
    name:        s.name        || '',
    code:        s.code        || '',
    description: s.description || '',
  }));
  rooms = (rm || []).map(r => ({
    id:           String(r.classId || r.id || uid()),
    name:         r.name          || '',
    specialityId: String(r.speciality?.specialityId || r.specialityId || ''),
    level:        r.level         || '',
    capacity:     r.capacity      || '',
  }));
  // Also update the shared `classes` array used by timetable / students
  classes = rooms.map(r => ({
    id:   r.id,
    name: r.name,
    level: r.level,
    specialityId: r.specialityId,
    speciality: specialities.find(s => s.id === r.specialityId)?.name || '',
  }));
  renderSpecs();
  renderRooms();
  refreshStuClassFilter();
  refreshTTDropdowns();
}

/* ── Render specialities list ────────────────────────────── */
function renderSpecs() {
  const list  = document.getElementById('specList');
  const count = document.getElementById('specCount');
  if (!list) return;
  if (count) count.textContent = specialities.length;

  // Refresh the classroom filter dropdown
  const rmFilter = document.getElementById('roomSpecFilter');
  if (rmFilter) {
    const cur = rmFilter.value;
    rmFilter.innerHTML = '<option value="">All Specialities</option>' +
      specialities.map(s => `<option value="${esc(s.id)}"${s.id===cur?' selected':''}>${esc(s.name)}</option>`).join('');
  }

  if (!specialities.length) {
    list.innerHTML = `
      <div class="empty" style="padding:40px 0;text-align:center">
        <div class="empty-ico-box" style="margin:0 auto 12px"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#0ea5e9"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg></div>
        <div style="font-size:13px;font-weight:600;color:var(--text-2)">No specialities yet</div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="openSpecModal()">Add First Speciality</button>
      </div>`;
    return;
  }

  list.innerHTML = specialities.map(s => {
    const roomCount = rooms.filter(r => r.specialityId === s.id).length;
    return `
      <div style="background:var(--surface);padding:16px 20px;border-radius:14px;border:1px solid var(--border);box-shadow:var(--sh-xs);display:flex;align-items:center;justify-content:space-between;transition:border-color .15s,box-shadow .15s;cursor:pointer"
           onmouseover="this.style.borderColor='var(--blue)';this.style.boxShadow='var(--sh-sm)'"
           onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow='var(--sh-xs)'">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:44px;height:44px;background:var(--blue-lt);color:var(--blue);border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px">${esc((s.name[0]||'?').toUpperCase())}</div>
          <div>
            <div style="font-weight:700;color:var(--text);font-size:14px">${esc(s.name)}${s.code ? ` <span style="font-size:11px;font-weight:600;color:var(--text-3)">(${esc(s.code)})</span>` : ''}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px">${roomCount} classroom${roomCount!==1?'s':''}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <button onclick="openSpecModal('${esc(s.id)}')" style="padding:6px 10px;font-size:12px;font-weight:600;background:var(--bg);border:1px solid var(--border);border-radius:7px;cursor:pointer;color:var(--text-2);transition:all .12s"
            onmouseover="this.style.borderColor='var(--blue)';this.style.color='var(--blue)'"
            onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-2)'">Edit</button>
        </div>
      </div>`;
  }).join('');
}

/* ── Render classrooms grid ──────────────────────────────── */
function renderRooms() {
  const list  = document.getElementById('roomList');
  const count = document.getElementById('roomCount');
  if (!list) return;

  const filterSpec = document.getElementById('roomSpecFilter')?.value || '';
  const filtered   = filterSpec ? rooms.filter(r => r.specialityId === filterSpec) : rooms;
  if (count) count.textContent = rooms.length;

  if (!filtered.length) {
    list.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 0">
        <div class="empty-ico-box" style="margin:0 auto 12px"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>
        <div style="font-size:13px;font-weight:600;color:var(--text-2)">${filterSpec ? 'No classrooms for this speciality' : 'No classrooms yet'}</div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="openRoomModal()">Add First Classroom</button>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(r => {
    const spec = specialities.find(s => s.id === r.specialityId);
    return `
      <div style="background:var(--surface);padding:18px;border-radius:14px;border:1px solid var(--border);box-shadow:var(--sh-xs);transition:transform .15s,border-color .15s,box-shadow .15s;cursor:pointer"
           onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='#6ee7b7';this.style.boxShadow='var(--sh-sm)'"
           onmouseout="this.style.transform='';this.style.borderColor='var(--border)';this.style.boxShadow='var(--sh-xs)'">
        <div style="font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">${esc(spec?.name || 'No Speciality')}</div>
        <div style="font-weight:800;font-size:17px;color:var(--text);margin-bottom:12px">${esc(r.name)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;gap:6px">
            <span style="padding:2px 8px;background:#f0fdf4;color:#15803d;border-radius:6px;font-size:11px;font-weight:700">L${esc(String(r.level||'?'))}</span>
            ${r.capacity ? `<span style="padding:2px 8px;background:var(--bg);color:var(--text-2);border-radius:6px;font-size:11px;font-weight:600">${esc(String(r.capacity))} cap</span>` : ''}
          </div>
          <button onclick="openRoomModal('${esc(r.id)}')" style="padding:4px 8px;font-size:11px;font-weight:600;background:var(--bg);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text-2)"
            onmouseover="this.style.borderColor='#6ee7b7';this.style.color='#059669'"
            onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-2)'">Edit</button>
        </div>
      </div>`;
  }).join('');
}

/* ── Speciality modal ────────────────────────────────────── */
function openSpecModal(id = null) {
  editingSpecId = id;
  const s = id ? specialities.find(x => x.id === id) : null;
  document.getElementById('specModalTitle').textContent = s ? 'Edit Speciality' : 'New Speciality';
  document.getElementById('spfSaveLbl').textContent     = s ? 'Save Changes'    : 'Create Speciality';
  document.getElementById('spfName').value    = s?.name        || '';
  document.getElementById('spfCode').value    = s?.code        || '';
  document.getElementById('spfDesc').value    = s?.description || '';
  document.getElementById('spfDeleteBtn').style.display = s ? '' : 'none';
  document.getElementById('specOverlay').classList.add('open');
  document.getElementById('spfName').focus();
}
function closeSpecModal() {
  document.getElementById('specOverlay').classList.remove('open');
  editingSpecId = null;
}
async function saveSpec() {
  const name = document.getElementById('spfName').value.trim();
  if (!name) { toast('Speciality name is required', 'error'); return; }
  const btn    = document.getElementById('spfSaveBtn');
  const loader = document.getElementById('spfLoader');
  btn.disabled = true; loader.style.display = 'block';

  const payload = {
    name, code: document.getElementById('spfCode').value.trim(),
    description: document.getElementById('spfDesc').value.trim(),
  };
  const isEdit  = !!editingSpecId;
  const res     = await apiFetch(isEdit ? `${API_SPEC}/${editingSpecId}` : API_SPEC,
                    { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) });
  const saved   = { ...payload, id: editingSpecId || (res?.specialityId ? String(res.specialityId) : uid()), ...(res||{}) };

  if (isEdit) specialities = specialities.map(s => s.id === editingSpecId ? saved : s);
  else        specialities = [...specialities, saved];

  classes = rooms.map(r => ({
    id: r.id, name: r.name, level: r.level, specialityId: r.specialityId,
    speciality: specialities.find(s => s.id === r.specialityId)?.name || '',
  }));
  closeSpecModal();
  renderSpecs();
  renderRooms();
  toast(isEdit ? 'Speciality updated' : 'Speciality created', 'success');
  btn.disabled = false; loader.style.display = 'none';
}
async function deleteSpec() {
  if (!editingSpecId) return;
  const hasRooms = rooms.some(r => r.specialityId === editingSpecId);
  if (hasRooms && !confirm('This speciality has classrooms. Delete anyway?')) return;
  await apiFetch(`${API_SPEC}/${editingSpecId}`, { method: 'DELETE' });
  specialities = specialities.filter(s => s.id !== editingSpecId);
  closeSpecModal();
  renderSpecs();
  renderRooms();
  toast('Speciality deleted', 'info');
}

/* ── Classroom modal ─────────────────────────────────────── */
function openRoomModal(id = null) {
  editingRoomId = id;
  const r = id ? rooms.find(x => x.id === id) : null;
  document.getElementById('roomModalTitle').textContent = r ? 'Edit Classroom' : 'New Classroom';
  document.getElementById('rmfSaveLbl').textContent     = r ? 'Save Changes'   : 'Create Classroom';
  document.getElementById('rmfName').value     = r?.name     || '';
  document.getElementById('rmfLevel').value    = r?.level    || '';
  document.getElementById('rmfCapacity').value = r?.capacity || '';
  document.getElementById('rmfDeleteBtn').style.display = r ? '' : 'none';

  // Populate speciality dropdown from local state
  const sel = document.getElementById('rmfSpeciality');
  sel.innerHTML = '<option value="">Select Speciality</option>' +
    specialities.map(s => `<option value="${esc(s.id)}"${r?.specialityId===s.id?' selected':''}>${esc(s.name)}</option>`).join('');

  document.getElementById('roomOverlay').classList.add('open');
  document.getElementById('rmfName').focus();
}
function closeRoomModal() {
  document.getElementById('roomOverlay').classList.remove('open');
  editingRoomId = null;
}
async function saveRoom() {
  const name         = document.getElementById('rmfName').value.trim();
  const specialityId = document.getElementById('rmfSpeciality').value;
  const level        = document.getElementById('rmfLevel').value;
  if (!name)         { toast('Classroom name is required', 'error'); return; }
  if (!specialityId) { toast('Please select a speciality', 'error'); return; }
  if (!level)        { toast('Please select a level', 'error'); return; }

  const btn    = document.getElementById('rmfSaveBtn');
  const loader = document.getElementById('rmfLoader');
  btn.disabled = true; loader.style.display = 'block';

  const payload = {
    name, specialityId,
    level:    parseInt(level),
    capacity: parseInt(document.getElementById('rmfCapacity').value) || 0,
  };
  const isEdit = !!editingRoomId;
  const res    = await apiFetch(isEdit ? `${API_ROOMS}/${editingRoomId}` : API_ROOMS,
                   { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) });
  const saved  = { ...payload, id: editingRoomId || (res?.classId ? String(res.classId) : uid()), ...(res||{}) };

  if (isEdit) rooms = rooms.map(r => r.id === editingRoomId ? saved : r);
  else        rooms = [...rooms, saved];

  // Keep shared classes in sync
  classes = rooms.map(r => ({
    id: r.id, name: r.name, level: r.level, specialityId: r.specialityId,
    speciality: specialities.find(s => s.id === r.specialityId)?.name || '',
  }));
  closeRoomModal();
  renderRooms();
  renderSpecs(); // refresh classroom counts on speciality cards
  refreshStuClassFilter();
  refreshTTDropdowns();
  toast(isEdit ? 'Classroom updated' : 'Classroom created', 'success');
  btn.disabled = false; loader.style.display = 'none';
}
async function deleteRoom() {
  if (!editingRoomId) return;
  await apiFetch(`${API_ROOMS}/${editingRoomId}`, { method: 'DELETE' });
  rooms = rooms.filter(r => r.id !== editingRoomId);
  classes = rooms.map(r => ({
    id: r.id, name: r.name, level: r.level, specialityId: r.specialityId,
    speciality: specialities.find(s => s.id === r.specialityId)?.name || '',
  }));
  closeRoomModal();
  renderRooms();
  renderSpecs();
  refreshStuClassFilter();
  refreshTTDropdowns();
  toast('Classroom deleted', 'info');
}

/* Wire up close for courseOverlay on backdrop click */
(function() {
  const o = document.getElementById('courseOverlay');
  if (o) o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
})();