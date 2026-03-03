/**
 * attendee.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Spring Boot placement:
 *   src/main/resources/static/js/attendee.js
 *
 * This file contains JSX and is compiled at runtime by Babel Standalone
 * (loaded in attendee.html). No webpack / npm / build step needed.
 *
 * REST endpoints expected from your Spring Boot backend:
 *   GET  /api/admin/users               → List<UserDto>
 *   GET  /api/admin/classrooms          → List<ClassroomDto>
 *   GET  /api/admin/subjects            → List<SubjectDto>
 *   GET  /api/admin/students            → List<StudentDto>
 *   POST /api/admin/students            → StudentDto
 *   PUT  /api/admin/students/{id}       → StudentDto
 *   DELETE /api/admin/students/{id}     → 204
 *   POST /api/admin/students/bulk-import → BulkImportResultDto
 *   GET  /api/admin/timetable?semester= → { slots: [] }
 *   POST /api/admin/timetable           → saved
 *   GET  /api/dashboard/validation-queue → List<ValidationItemDto>
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { useState, useEffect, useCallback, useRef } = React;

// ─── Constants ────────────────────────────────────────────────────────────────
const API = {
  teachers:     "/api/admin/users",
  classrooms:   "/api/admin/classrooms",
  subjects:     "/api/admin/subjects",
  students:     "/api/admin/students",
  studentsBulk: "/api/admin/students/bulk-import",
  timetable:    "/api/admin/timetable",
};

const DAYS    = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const START_H = 7, END_H = 18, CELL_H = 80;

const PALETTES = [
  { bg:"#fce4ec", border:"#e91e63", text:"#c2185b" },
  { bg:"#e3f2fd", border:"#1976d2", text:"#1565c0" },
  { bg:"#e8f5e9", border:"#388e3c", text:"#2e7d32" },
  { bg:"#fff8e1", border:"#f9a825", text:"#e65100" },
  { bg:"#f3e5f5", border:"#7b1fa2", text:"#6a1b9a" },
  { bg:"#fbe9e7", border:"#d84315", text:"#bf360c" },
  { bg:"#e0f7fa", border:"#00838f", text:"#006064" },
  { bg:"#efebe9", border:"#5d4037", text:"#4e342e" },
  { bg:"#e8eaf6", border:"#3949ab", text:"#283593" },
  { bg:"#f9fbe7", border:"#9e9d24", text:"#827717" },
];

const NAV = [
  { id:"dashboard",      icon:"⊞", label:"Dashboard"          },
  { id:"attendance",     icon:"✅", label:"Take Attendance"    },
  { id:"records",        icon:"📋", label:"Attendance Records" },
  { id:"timetable",      icon:"📅", label:"Timetable Manager"  },
  { id:"students",       icon:"🎓", label:"Students"           },
  { id:"irregularities", icon:"⚠",  label:"Irregularities"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2, 9);
const pal  = (i) => PALETTES[i % PALETTES.length];
const ini  = (n = "") => n.split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase();

async function apiFetch(url, opts = {}) {
  try {
    const isForm = opts.body instanceof FormData;
    const headers = isForm ? {} : { "Content-Type": "application/json", ...(opts.headers || {}) };
    const r = await fetch(url, { ...opts, headers });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch (e) {
    console.warn("API:", url, e.message);
    return null;
  }
}

const normT = (t) => ({ ...t, id: String(t.userId || t.id), name: t.username || t.name || "", dept: t.dept || t.department || "" });
const normC = (c) => ({ ...c, id: String(c.classId || c.id) });
const normS = (s, i) => ({ ...s, id: String(s.subjectId || s.id || uid()), palette: pal(i) });

// ─── Shared styles ────────────────────────────────────────────────────────────
const sel = { width:"100%", padding:"9px 12px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:14, outline:"none", background:"#fff" };
const inp = { ...sel };
const btnPrimary = { padding:"9px 18px", borderRadius:6, border:"none", background:"#1976d2", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" };
const btnCancel  = { padding:"9px 18px", borderRadius:6, border:"1.5px solid #e0e0e0", background:"#fff", fontSize:13, cursor:"pointer" };

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const bg = type === "success" ? "#43a047" : type === "error" ? "#e53935" : type === "info" ? "#546e7a" : "#1976d2";
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999, background:bg, color:"#fff", padding:"12px 20px", borderRadius:8, fontSize:13, fontWeight:600, boxShadow:"0 4px 16px rgba(0,0,0,0.18)", maxWidth:340 }}>
      {msg}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, width = 480, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:12, padding:28, width, maxWidth:"95vw", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.22)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: subtitle ? 4 : 20 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>{title}</h2>
          <button onClick={onClose} style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#9e9e9e", lineHeight:1, marginLeft:12 }}>×</button>
        </div>
        {subtitle && <p style={{ margin:"0 0 18px", fontSize:13, color:"#757575" }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#616161", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign:"center", padding:"48px 0", color:"#9e9e9e", fontSize:14 }}>
      <div style={{ width:32, height:32, border:"3px solid #e0e0e0", borderTop:"3px solid #1976d2", borderRadius:"50%", margin:"0 auto 10px", animation:"spin 0.9s linear infinite" }}/>
      Loading…
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, message, action }) {
  return (
    <div style={{ textAlign:"center", padding:"64px 24px", color:"#9e9e9e" }}>
      <div style={{ fontSize:44, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:600, color:"#424242", marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13, color:"#757575", maxWidth:300, margin:"0 auto", lineHeight:1.7 }}>{message}</div>
      {action && <div style={{ marginTop:18 }}>{action}</div>}
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF(blocks, teachers, subjects, classObj, semester) {
  const load = () => new Promise((res, rej) => {
    if (window.jspdf) { res(window.jspdf.jsPDF); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => res(window.jspdf.jsPDF);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  load().then(jsPDF => {
    const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
    const W = 297, H = 210, PL = 12, PR = 12;
    const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
    const colW = (W - PL - PR - 20) / DAYS.length;
    const rowH = Math.min(14, (H - 40) / hours.length);
    const gTop = 22;

    doc.setFillColor(25, 118, 210); doc.rect(0, 0, W, 13, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont(undefined, "bold");
    doc.text("EduManage – Timetable", PL, 8.5);
    doc.setFontSize(7.5); doc.setFont(undefined, "normal");
    doc.text(`${classObj ? classObj.name : "All Classes"}  •  ${semester}  •  ${new Date().toLocaleDateString()}`, W - PR, 8.5, { align:"right" });

    doc.setFillColor(100, 181, 246); doc.rect(PL + 20, gTop, W - PL - PR - 20, 8, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont(undefined, "bold");
    DAYS.forEach((d, i) => doc.text(d, PL + 20 + i * colW + colW / 2, gTop + 5.5, { align:"center" }));

    hours.forEach((h, ri) => {
      const y = gTop + 8 + ri * rowH;
      if (ri % 2 === 0) { doc.setFillColor(250, 251, 252); doc.rect(PL, y, W - PL - PR, rowH, "F"); }
      doc.setTextColor(117, 117, 117); doc.setFontSize(6.5); doc.setFont(undefined, "bold");
      doc.text(`${h}:00`, PL + 10, y + rowH / 2 + 1, { align:"center" });
      DAYS.forEach((day, ci) => {
        const x = PL + 20 + ci * colW;
        doc.setDrawColor(240, 240, 240); doc.rect(x, y, colW, rowH);
        const blk = blocks.find(b => b.day === day && b.startHour === h);
        if (!blk) return;
        const subj = subjects.find(s => s.id === blk.subjectId);
        const tchr = teachers.find(t => t.id === blk.teacherId);
        if (!subj) return;
        const p = subj.palette || pal(0);
        const hex = p.border;
        const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
        const span = blk.span || 1;
        doc.setFillColor(Math.min(255, r+175), Math.min(255, g+175), Math.min(255, b+175));
        doc.rect(x + 0.3, y + 0.3, colW - 0.6, rowH * span - 0.6, "F");
        doc.setFillColor(r, g, b); doc.rect(x + 0.3, y + 0.3, 2.5, rowH * span - 0.6, "F");
        doc.setTextColor(r, g, b); doc.setFontSize(6.5); doc.setFont(undefined, "bold");
        doc.text(subj.code || subj.name || "", x + 4, y + 4, { maxWidth: colW - 5 });
        doc.setTextColor(50, 50, 50); doc.setFontSize(5.5); doc.setFont(undefined, "normal");
        doc.text((subj.name || "").split(" ").slice(0, 4).join(" "), x + 4, y + 8, { maxWidth: colW - 5 });
        if (tchr) { doc.setTextColor(100, 100, 100); doc.setFontSize(5); doc.text(`👤 ${(tchr.name || "").split(" ").pop()}`, x + 4, y + rowH * span - 2, { maxWidth: colW - 5 }); }
      });
    });

    doc.setDrawColor(180, 180, 180); doc.rect(PL, gTop + 8, W - PL - PR, hours.length * rowH);
    doc.setFillColor(245, 247, 250); doc.rect(0, H - 7, W, 7, "F");
    doc.setTextColor(180, 180, 180); doc.setFontSize(5.5); doc.setFont(undefined, "normal");
    doc.text("EduManage  •  Confidential", W / 2, H - 2.5, { align:"center" });
    doc.save(`Timetable_${(classObj?.name || "all").replace(/\s+/g, "_")}_${semester.replace(/\s+/g, "_")}.pdf`);
  }).catch(() => alert("Could not load PDF library."));
}

// ─── Scheduled Block ──────────────────────────────────────────────────────────
function ScheduledBlock({ block, subjects, teachers, onDelete, onEdit, onResizeStart, onDragStart }) {
  const subj = subjects.find(s => s.id === block.subjectId);
  const tchr = teachers.find(t => t.id === block.teacherId);
  const p    = subj?.palette || pal(0);
  const span = block.span || 1;
  return (
    <div
      draggable onDragStart={onDragStart}
      onClick={onEdit}
      style={{ position:"absolute", top:2, left:"2%", width:"96%", height:`${CELL_H * span - 4}px`, zIndex:10, borderRadius:6, padding:"10px 10px 16px", boxShadow:"0 2px 4px rgba(0,0,0,0.1)", borderLeft:`5px solid ${p.border}`, background:p.bg, cursor:"grab", boxSizing:"border-box", userSelect:"none", overflow:"hidden" }}>
      <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ position:"absolute", top:4, right:6, border:"none", background:"none", cursor:"pointer", fontSize:14, color:"rgba(0,0,0,0.3)", lineHeight:1, padding:0 }}>✕</button>
      <div style={{ fontWeight:700, fontSize:13, color:p.text, lineHeight:1.2, marginBottom:3, paddingRight:16 }}>{subj?.name || "Unknown"}</div>
      {subj?.code && <div style={{ fontSize:11, color:p.text, opacity:0.7, marginBottom:4 }}>{subj.code}</div>}
      <span style={{ fontSize:11, background:"rgba(255,255,255,0.75)", padding:"2px 7px", borderRadius:4, color:"#333", display:"inline-block" }}>
        {tchr ? `👤 ${tchr.name}` : "Drop teacher here"}
      </span>
      <div
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeStart(e); }}
        onClick={e => e.stopPropagation()}
        style={{ position:"absolute", bottom:0, left:0, width:"100%", height:10, cursor:"ns-resize", display:"flex", justifyContent:"center", alignItems:"center" }}>
        <span style={{ color:"rgba(0,0,0,0.22)", fontSize:10, letterSpacing:2 }}>• • •</span>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ block, subjects, teachers, classes, onSave, onClose }) {
  const [form, setForm] = useState({ ...block });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title={block.isNew ? "Assign Slot" : "Edit Slot"} subtitle={`${block.day} • ${block.startHour}:00`} onClose={onClose}>
      <Field label="Subject">
        {subjects.length === 0
          ? <div style={{ padding:"9px 12px", borderRadius:6, background:"#fff8e1", border:"1.5px solid #ffd54f", fontSize:13, color:"#e65100" }}>⚠ No subjects. Add them in the admin panel.</div>
          : <select style={sel} value={form.subjectId || ""} onChange={e => set("subjectId", e.target.value)}>
              <option value="">— Select subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
            </select>
        }
      </Field>
      <Field label="Teacher (optional)">
        {teachers.length === 0
          ? <div style={{ padding:"9px 12px", borderRadius:6, background:"#fff8e1", border:"1.5px solid #ffd54f", fontSize:13, color:"#e65100" }}>⚠ No teachers. Add staff in the admin panel.</div>
          : <select style={sel} value={form.teacherId || ""} onChange={e => set("teacherId", e.target.value)}>
              <option value="">— No teacher —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}{t.dept ? ` (${t.dept})` : ""}</option>)}
            </select>
        }
      </Field>
      <Field label="Class">
        {classes.length === 0
          ? <div style={{ padding:"9px 12px", borderRadius:6, background:"#fff8e1", border:"1.5px solid #ffd54f", fontSize:13, color:"#e65100" }}>⚠ No classes. Add classrooms in the admin panel.</div>
          : <select style={sel} value={form.classId || ""} onChange={e => set("classId", e.target.value)}>
              <option value="">— No class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.level ? ` (${c.level})` : ""}</option>)}
            </select>
        }
      </Field>
      <Field label="Duration">
        <select style={sel} value={form.span || 1} onChange={e => set("span", parseInt(e.target.value))}>
          {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} hour{n > 1 ? "s" : ""}</option>)}
        </select>
      </Field>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:6 }}>
        <button style={btnCancel} onClick={onClose}>Cancel</button>
        <button
          style={{ ...btnPrimary, opacity: form.subjectId ? 1 : 0.5, cursor: form.subjectId ? "pointer" : "not-allowed" }}
          onClick={() => form.subjectId && onSave(form)}
          disabled={!form.subjectId}>
          Save
        </button>
      </div>
    </Modal>
  );
}

// ─── Timetable ────────────────────────────────────────────────────────────────
function Timetable({ teachers, classes, subjects, showToast }) {
  const [semester,     setSemester]    = useState("Fall 2026");
  const [classFilter,  setClassFilter] = useState("all");
  const [blocks,       setBlocks]      = useState([]);
  const [editModal,    setEditModal]   = useState(null);
  const [sideTab,      setSideTab]     = useState("subjects");
  const [dropTarget,   setDropTarget]  = useState(null);
  const [saving,       setSaving]      = useState(false);
  const key = `tt_${semester.replace(/\s+/g, "_")}`;

  useEffect(() => {
    apiFetch(`${API.timetable}?semester=${encodeURIComponent(semester)}`).then(data => {
      if (data) setBlocks(Array.isArray(data) ? data : (data.slots || []));
      else { try { setBlocks(JSON.parse(localStorage.getItem(key) || "[]")); } catch { setBlocks([]); } }
    });
  }, [semester]);

  const persist = useCallback(async (nb) => {
    setBlocks(nb);
    localStorage.setItem(key, JSON.stringify(nb));
    setSaving(true);
    await apiFetch(API.timetable, { method:"POST", body: JSON.stringify({ semester, slots: nb }) });
    setSaving(false);
  }, [semester, key]);

  const handleDrop = (e, day, hour) => {
    e.preventDefault(); setDropTarget(null);
    const type = e.dataTransfer.getData("type");
    const id   = e.dataTransfer.getData("id");
    if (!type || !id) return;
    const vis = classFilter === "all" ? blocks : blocks.filter(b => b.classId === classFilter);

    if (type === "subject") {
      if (vis.find(b => b.day === day && b.startHour === hour)) { showToast("Slot already exists at this time", "error"); return; }
      setEditModal({ isNew:true, id:uid(), day, startHour:hour, span:1, subjectId:id, teacherId:"", classId: classFilter !== "all" ? classFilter : "" });
    } else if (type === "teacher") {
      const blk = vis.find(b => b.day === day && b.startHour === hour);
      if (blk) { persist(blocks.map(b => b.id === blk.id ? { ...b, teacherId: id } : b)); showToast("Teacher assigned", "success"); }
      else showToast("Drop teacher onto an existing subject block", "info");
    } else if (type === "block") {
      if (blocks.find(b => b.id !== id && b.day === day && b.startHour === hour && (classFilter === "all" || b.classId === classFilter))) { showToast("Slot occupied", "error"); return; }
      persist(blocks.map(b => b.id === id ? { ...b, day, startHour: hour } : b));
    }
  };

  const handleResizeStart = (e, blockId) => {
    const blk = blocks.find(b => b.id === blockId); if (!blk) return;
    const startY = e.clientY, startSpan = blk.span || 1;
    const doResize = ev => {
      const diff = ev.clientY - startY;
      const ns = Math.max(1, Math.min(END_H - blk.startHour, Math.round(startSpan + diff / CELL_H)));
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, span: ns } : b));
    };
    const stop = () => {
      window.removeEventListener("mousemove", doResize);
      window.removeEventListener("mouseup", stop);
      setBlocks(prev => { persist(prev); return prev; });
    };
    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stop);
  };

  const modalSave = (data) => {
    if (data.isNew) { const { isNew, ...rest } = data; persist([...blocks, rest]); showToast("Slot created", "success"); }
    else { persist(blocks.map(b => b.id === data.id ? data : b)); showToast("Slot updated", "success"); }
    setEditModal(null);
  };

  const deleteBlock = (id) => { persist(blocks.filter(b => b.id !== id)); setEditModal(null); showToast("Removed", "info"); };

  const vis = classFilter === "all" ? blocks : blocks.filter(b => b.classId === classFilter);
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const coveredCells = new Set();
  vis.forEach(b => { for (let s = 1; s < (b.span || 1); s++) coveredCells.add(`${b.day}-${b.startHour + s}`); });
  const currentClass = classes.find(c => c.id === classFilter);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ background:"#fff", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.1)", zIndex:100, flexShrink:0, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:35, height:35, background:"linear-gradient(135deg,#64b5f6,#fff59d)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:"bold", fontSize:16 }}>A</div>
          <span style={{ fontWeight:"bold", fontSize:"1.1rem" }}>Attendee Timetable</span>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            style={{ padding:"8px 12px", border:"2px solid #e0e0e0", borderRadius:6, outline:"none", fontSize:13, cursor:"pointer", fontWeight:600, color:"#1976d2", background:"#fff" }}>
            <option value="all">— All Classes —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.level ? ` (${c.level})` : ""}</option>)}
          </select>
          <select value={semester} onChange={e => setSemester(e.target.value)}
            style={{ padding:"8px 12px", border:"2px solid #e0e0e0", borderRadius:6, outline:"none", fontSize:13, cursor:"pointer", background:"#fff" }}>
            {["Fall 2026","Spring 2026","Summer 2026","Fall 2025","Spring 2025"].map(s => <option key={s}>{s}</option>)}
          </select>
          {saving && <span style={{ fontSize:12, color:"#f9a825", fontWeight:600 }}>Saving…</span>}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e0e0e0", padding:"10px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        {classFilter !== "all" && currentClass
          ? <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 14px", background:"#e3f2fd", borderRadius:20, fontSize:13, fontWeight:600, color:"#1976d2" }}>
              🏫 {currentClass.name}
              {currentClass.level && <span style={{ color:"#90caf9" }}> — {currentClass.level}</span>}
              <span style={{ fontSize:11, color:"#90caf9" }}> ({vis.length} slots)</span>
            </div>
          : <div style={{ fontSize:12, color:"#9e9e9e" }}>All classes • {blocks.length} total slots</div>
        }
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => exportPDF(vis, teachers, subjects, currentClass, semester)}
            style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#e3f2fd", color:"#1976d2", fontWeight:600, cursor:"pointer", fontSize:13 }}>
            📄 Export PDF
          </button>
          <button onClick={() => { localStorage.setItem(key, JSON.stringify(blocks)); showToast("Saved!", "success"); }}
            style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#1976d2", color:"#fff", fontWeight:600, cursor:"pointer", fontSize:13 }}>
            💾 Save All Changes
          </button>
        </div>
      </div>

      {/* Warning banner */}
      {(subjects.length === 0 || teachers.length === 0 || classes.length === 0) && (
        <div style={{ background:"#fff8e1", borderBottom:"1px solid #ffe082", padding:"8px 24px", fontSize:12, color:"#e65100", flexShrink:0 }}>
          ⚠ {subjects.length === 0 && <span>No <b>subjects</b> • </span>}
              {teachers.length === 0 && <span>No <b>teachers</b> • </span>}
              {classes.length === 0 && <span>No <b>classes</b> • </span>}
          Add them in the admin panel.
        </div>
      )}

      {/* Main layout */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Sidebar */}
        <div style={{ width:280, background:"#fff", borderRight:"1px solid #e0e0e0", display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ display:"flex", borderBottom:"1px solid #e0e0e0" }}>
            {[["subjects","📚 Subjects"],["teachers","👨‍🏫 Teachers"]].map(([k, l]) => (
              <div key={k} onClick={() => setSideTab(k)}
                style={{ flex:1, padding:"12px 0", textAlign:"center", cursor:"pointer", fontWeight:600, fontSize:13, color: sideTab === k ? "#1976d2" : "#757575", borderBottom: sideTab === k ? "3px solid #1976d2" : "3px solid transparent", transition:"0.2s" }}>
                {l}
              </div>
            ))}
          </div>
          <div style={{ padding:"8px 14px", fontSize:11, color:"#9e9e9e", background:"#fafafa", borderBottom:"1px solid #f0f0f0" }}>
            {sideTab === "subjects" ? "🟦 Drag a subject onto a grid cell to schedule it" : "👤 Drag a teacher onto an existing subject block to assign"}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:14 }}>
            {sideTab === "subjects"
              ? subjects.length === 0
                ? <div style={{ textAlign:"center", padding:"30px 10px", color:"#bdbdbd", fontSize:12 }}>No subjects found.<br/>Add subjects in the admin panel.</div>
                : subjects.map((s, i) => {
                    const p = s.palette || pal(i);
                    return (
                      <div key={s.id} draggable
                        onDragStart={e => { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("type","subject"); e.dataTransfer.setData("id", s.id); }}
                        style={{ padding:12, borderRadius:8, marginBottom:10, cursor:"grab", border:`2px solid ${p.border}22`, borderLeft:`5px solid ${p.border}`, background:p.bg, transition:"transform 0.15s,box-shadow 0.15s", userSelect:"none" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateX(3px)"; e.currentTarget.style.boxShadow = `0 2px 8px ${p.border}44`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                        <div style={{ fontWeight:700, fontSize:13, color:p.text }}>{s.name}</div>
                        {s.code && <div style={{ fontSize:11, color:p.text, opacity:0.7, marginTop:3 }}>{s.code}</div>}
                      </div>
                    );
                  })
              : teachers.length === 0
                ? <div style={{ textAlign:"center", padding:"30px 10px", color:"#bdbdbd", fontSize:12 }}>No teachers found.<br/>Add staff in the admin panel.</div>
                : teachers.map(t => (
                    <div key={t.id} draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("type","teacher"); e.dataTransfer.setData("id", t.id); }}
                      style={{ padding:12, borderRadius:8, marginBottom:10, cursor:"grab", border:"2px solid #a5d6a7", borderLeft:"5px solid #4caf50", background:"#f1f8e9", transition:"transform 0.15s", userSelect:"none" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "translateX(3px)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                      <div style={{ fontWeight:700, fontSize:13, color:"#2e7d32", display:"flex", alignItems:"center", gap:6 }}>👨‍🏫 {t.name}</div>
                      {t.dept && <div style={{ fontSize:11, color:"#388e3c", marginTop:3, paddingLeft:22 }}>{t.dept}</div>}
                    </div>
                  ))
            }
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex:1, overflow:"auto", padding:20, background:"#f5f7fa" }}>
          <div style={{ display:"grid", gridTemplateColumns:`80px repeat(${DAYS.length},1fr)`, background:"#fff", borderRadius:12, boxShadow:"0 4px 12px rgba(0,0,0,0.05)", minWidth:700 }}>
            {/* Header */}
            <div style={{ background:"#eee", border:"0.5px solid #f0f0f0", minHeight:56, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#757575", fontWeight:600, borderRadius:"12px 0 0 0" }}>Time</div>
            {DAYS.map((d, i) => (
              <div key={d} style={{ background:"#64b5f6", color:"#fff", fontWeight:"bold", border:"0.5px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, minHeight:56, borderRadius: i === DAYS.length - 1 ? "0 12px 0 0" : 0 }}>{d}</div>
            ))}

            {/* Body rows */}
            {hours.map(hour => (
              <React.Fragment key={hour}>
                <div style={{ background:"#fafafa", color:"#757575", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", border:"0.5px solid #f0f0f0", minHeight:CELL_H, borderRight:"2px solid #eee" }}>{hour}:00</div>
                {DAYS.map(day => {
                  const ck = `${day}-${hour}`;
                  if (coveredCells.has(ck)) return null;
                  const blk  = vis.find(b => b.day === day && b.startHour === hour);
                  const isOver = dropTarget?.day === day && dropTarget?.hour === hour;
                  const rspan  = blk ? (blk.span || 1) : 1;
                  return (
                    <div key={ck} className="tt-cell"
                      style={{ border:"0.5px solid #f0f0f0", minHeight: CELL_H * rspan, height: CELL_H * rspan, position:"relative", background: isOver ? "#e3f2fd" : "transparent", transition:"background 0.15s" }}
                      onDragOver={e => { e.preventDefault(); setDropTarget({ day, hour }); }}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={e => handleDrop(e, day, hour)}>
                      {blk
                        ? <ScheduledBlock block={blk} subjects={subjects} teachers={teachers}
                            onDelete={() => deleteBlock(blk.id)}
                            onEdit={() => setEditModal({ ...blk })}
                            onResizeStart={e => handleResizeStart(e, blk.id)}
                            onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("type","block"); e.dataTransfer.setData("id", blk.id); }}
                          />
                        : isOver && <div style={{ position:"absolute", inset:2, borderRadius:6, background:"#bbdefb", border:"2px dashed #1976d2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:"#1976d2" }}>+</div>
                      }
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {editModal && <EditModal block={editModal} subjects={subjects} teachers={teachers} classes={classes} onSave={modalSave} onClose={() => setEditModal(null)}/>}
    </div>
  );
}

// ─── Student Form ─────────────────────────────────────────────────────────────
function StudentForm({ initial, classes, onSave, onClose }) {
  const [form,   setForm]   = useState(initial || { name:"", matricule:"", classId:"", gender:"", dob:"", email:"" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.name || !form.classId) return;
    setSaving(true);
    const isEdit = !!form.id;
    const res = await apiFetch(isEdit ? `${API.students}/${form.id}` : API.students, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(form) });
    setSaving(false);
    onSave(res || { ...form, id: form.id || uid() });
  };
  return (
    <Modal title={initial ? "Edit Student" : "Add Student"} onClose={onClose}>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
        <Field label="Full Name"><input style={inp} value={form.name}      onChange={e => set("name", e.target.value)}      placeholder="Emma Wilson"/></Field>
        <Field label="Matricule"><input style={inp} value={form.matricule} onChange={e => set("matricule", e.target.value)} placeholder="24/CS/001"/></Field>
      </div>
      <Field label="Class">
        {classes.length === 0
          ? <div style={{ padding:"9px 12px", borderRadius:6, background:"#fff8e1", border:"1.5px solid #ffd54f", fontSize:13, color:"#e65100" }}>⚠ No classes yet.</div>
          : <select style={sel} value={form.classId} onChange={e => set("classId", e.target.value)}>
              <option value="">— Select class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
            </select>
        }
      </Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Gender">
          <select style={sel} value={form.gender} onChange={e => set("gender", e.target.value)}>
            <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
          </select>
        </Field>
        <Field label="Date of Birth"><input style={inp} type="date" value={form.dob} onChange={e => set("dob", e.target.value)}/></Field>
      </div>
      <Field label="Email (optional)"><input style={inp} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="student@school.cm"/></Field>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:6 }}>
        <button style={btnCancel} onClick={onClose}>Cancel</button>
        <button style={{ ...btnPrimary, opacity: (!form.name || !form.classId || saving) ? 0.5 : 1 }} onClick={submit} disabled={!form.name || !form.classId || saving}>
          {saving ? "Saving…" : "Save Student"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Bulk Import ──────────────────────────────────────────────────────────────
function BulkImport({ classes, onImported, onClose, showToast }) {
  const [step,    setStep]    = useState(1);
  const [file,    setFile]    = useState(null);
  const [res,     setRes]     = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    if (!["csv","xlsx","xls"].includes(f.name.split(".").pop().toLowerCase())) { showToast("Use .csv .xlsx or .xls", "error"); return; }
    setFile(f);
  };

  const start = async () => {
    if (!file) return; setLoading(true);
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(API.studentsBulk, { method:"POST", body: fd }).then(x => x.ok ? x.json() : null).catch(() => null);
    setLoading(false);
    if (r) { setRes(r); setStep(2); onImported(); }
    else showToast("Import failed. Check file format.", "error");
  };

  const template = () => {
    const rows = classes.map(c => `# "${c.id}" = ${c.name}`).join("\n");
    const csv  = `# Class IDs:\n${rows || "# (none)"}\n\nname,matricule,classId,gender,dob,email\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    a.download = "students_template.csv"; a.click();
  };

  return (
    <Modal title="Bulk Import Students" onClose={onClose} width={520}>
      {step === 1 ? (
        <>
          <div style={{ background:"#e3f2fd", borderRadius:8, padding:"11px 14px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:600, fontSize:13, color:"#1565c0", marginBottom:2 }}>Download CSV Template</div>
              <div style={{ fontSize:12 }}>name, matricule, classId, gender, dob, email</div>
            </div>
            <button onClick={template} style={{ padding:"6px 12px", borderRadius:6, background:"#1976d2", color:"#fff", border:"none", fontWeight:600, fontSize:12, cursor:"pointer" }}>⬇ Template</button>
          </div>
          {classes.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#9e9e9e", marginBottom:6, textTransform:"uppercase" }}>Your class IDs</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, maxHeight:70, overflowY:"auto" }}>
                {classes.map(c => <div key={c.id} style={{ padding:"2px 8px", borderRadius:4, background:"#f5f5f5", fontSize:11 }}><code style={{ fontWeight:700 }}>{c.id}</code> → {c.name}</div>)}
              </div>
            </div>
          )}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            style={{ border:"2px dashed #bbdefb", borderRadius:8, padding:"28px 16px", textAlign:"center", cursor:"pointer", background:"#fafafa" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#1976d2"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#bbdefb"}>
            <div style={{ fontSize:32, marginBottom:6 }}>📁</div>
            <div style={{ fontWeight:600, fontSize:13, color:"#424242" }}>{file ? `📄 ${file.name}` : "Drop file or click to browse"}</div>
            <div style={{ fontSize:11, color:"#9e9e9e", marginTop:2 }}>.csv, .xlsx, .xls</div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display:"none" }}/>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
            <button style={btnCancel} onClick={onClose}>Cancel</button>
            <button style={{ ...btnPrimary, opacity: (!file || loading) ? 0.5 : 1 }} onClick={start} disabled={!file || loading}>{loading ? "Importing…" : "Start Import"}</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
            {[{l:"Total",v:res?.totalRows,c:"#424242",bg:"#f5f5f5"},{l:"Succeeded",v:res?.successCount,c:"#2e7d32",bg:"#e8f5e9"},{l:"Failed",v:res?.failureCount,c:"#c62828",bg:"#ffebee"}].map(x => (
              <div key={x.l} style={{ textAlign:"center", padding:14, borderRadius:8, background:x.bg }}>
                <div style={{ fontSize:26, fontWeight:800, color:x.c }}>{x.v ?? 0}</div>
                <div style={{ fontSize:12, color:x.c }}>{x.l}</div>
              </div>
            ))}
          </div>
          {res?.failureCount > 0 && (
            <div style={{ maxHeight:150, overflowY:"auto", border:"1px solid #ffcdd2", borderRadius:6, marginBottom:14 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead><tr style={{ background:"#ffebee" }}>{["Row","ID","Error"].map(h => <th key={h} style={{ padding:"5px 8px", textAlign:"left", color:"#c62828" }}>{h}</th>)}</tr></thead>
                <tbody>{res.errors.map((e, i) => (
                  <tr key={i} style={{ borderTop:"1px solid #ffcdd2" }}>
                    <td style={{ padding:"5px 8px", fontWeight:700 }}>#{e.rowNumber}</td>
                    <td style={{ padding:"5px 8px" }}>{e.identifier}</td>
                    <td style={{ padding:"5px 8px", color:"#c62828" }}>{e.errorMessage}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button style={btnCancel} onClick={() => setStep(1)}>Import More</button>
            <button style={btnPrimary} onClick={onClose}>Done</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Students ─────────────────────────────────────────────────────────────────
function Students({ classes, showToast }) {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [cf,       setCf]       = useState("all");
  const [modal,    setModal]    = useState(null);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch(API.students);
    setStudents(d || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const save = (s) => {
    const isEdit = !!s.id && students.some(x => x.id === s.id);
    setStudents(p => isEdit ? p.map(x => x.id === s.id ? s : x) : [s, ...p]);
    setModal(null);
    showToast(isEdit ? "Updated" : "Added", "success");
  };

  const del = async (id) => {
    if (!confirm("Delete this student?")) return;
    await apiFetch(`${API.students}/${id}`, { method:"DELETE" });
    setStudents(p => p.filter(x => x.id !== id));
    showToast("Deleted", "info");
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return ((s.name || "").toLowerCase().includes(q) || (s.matricule || "").toLowerCase().includes(q))
        && (cf === "all" || s.classId === cf);
  });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>🎓 Students</h2>
          <p style={{ margin:"3px 0 0", color:"#757575", fontSize:13 }}>{loading ? "Loading…" : `${students.length} student${students.length !== 1 ? "s" : ""}`}</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setModal("import")} style={{ padding:"8px 14px", borderRadius:6, border:"1.5px solid #e0e0e0", background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>📥 Bulk Import</button>
          <button onClick={() => { setEditItem(null); setModal("add"); }} style={{ ...btnPrimary, padding:"8px 14px" }}>+ Add Student</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or matricule…" style={{ ...inp, width:240, padding:"8px 12px" }}/>
        <select value={cf} onChange={e => setCf(e.target.value)} style={{ ...sel, width:190, padding:"8px 12px" }}>
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e0e0e0", overflow:"hidden" }}>
        {loading ? <Spinner/> : filtered.length === 0 ? (
          <EmptyState icon="🎓" title={students.length === 0 ? "No students yet" : "No results"}
            message={students.length === 0 ? "Add students or import from CSV/Excel." : "Try a different search."}
            action={students.length === 0 ?
              <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                <button onClick={() => setModal("import")} style={{ padding:"8px 14px", borderRadius:6, border:"1.5px solid #e0e0e0", background:"#fff", fontSize:13, cursor:"pointer" }}>📥 Import</button>
                <button onClick={() => { setEditItem(null); setModal("add"); }} style={{ ...btnPrimary, fontSize:13 }}>+ Add</button>
              </div> : null}
          />
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"2px solid #f5f5f5", background:"#fafafa" }}>
                {["Student","Matricule","Class","Gender","DOB","Actions"].map(h => (
                  <th key={h} style={{ padding:"10px 14px", fontSize:11, fontWeight:700, color:"#9e9e9e", textAlign: h === "Actions" ? "right" : "left", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const cls = classes.find(c => c.id === s.classId);
                return (
                  <tr key={s.id} style={{ borderBottom:"1px solid #f5f7fa" }}>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", background:"#e3f2fd", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#1976d2", flexShrink:0 }}>{ini(s.name)}</div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13.5 }}>{s.name}</div>
                          <div style={{ fontSize:11, color:"#9e9e9e" }}>{s.email || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"11px 14px" }}><code style={{ background:"#f5f5f5", padding:"2px 6px", borderRadius:4, fontSize:11 }}>{s.matricule || "—"}</code></td>
                    <td style={{ padding:"11px 14px", fontSize:13 }}>{cls ? cls.name : "—"}</td>
                    <td style={{ padding:"11px 14px", fontSize:13 }}>{s.gender || "—"}</td>
                    <td style={{ padding:"11px 14px", fontSize:13 }}>{s.dob || "—"}</td>
                    <td style={{ padding:"11px 14px", textAlign:"right" }}>
                      <button onClick={() => { setEditItem(s); setModal("edit"); }} style={{ padding:"4px 10px", borderRadius:5, border:"1.5px solid #e0e0e0", background:"#fff", fontSize:12, cursor:"pointer", marginRight:5 }}>Edit</button>
                      <button onClick={() => del(s.id)} style={{ padding:"4px 10px", borderRadius:5, border:"1.5px solid #ffcdd2", background:"#ffebee", color:"#c62828", fontSize:12, cursor:"pointer" }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(modal === "add" || modal === "edit") && <StudentForm initial={editItem} classes={classes} onSave={save} onClose={() => setModal(null)}/>}
      {modal === "import" && <BulkImport classes={classes} onImported={load} onClose={() => setModal(null)} showToast={showToast}/>}
    </div>
  );
}

// ─── Dashboard Home ───────────────────────────────────────────────────────────
function DashboardHome({ onNav, teachers, classes, subjects }) {
  const [queue,    setQueue]    = useState([]);
  const [tab,      setTab]      = useState("attendance");
  const [loadingQ, setLoadingQ] = useState(true);

  useEffect(() => {
    apiFetch("/api/dashboard/validation-queue").then(d => { setQueue(d || []); setLoadingQ(false); });
  }, []);

  const stats = [
    { label:"Validations Pending", value: loadingQ ? "…" : queue.length, sub:"Awaiting review", color:"#f9a825", icon:"⏱" },
    { label:"Teachers",  value: teachers.length, sub:"In system",    color:"#1976d2", icon:"👨‍🏫" },
    { label:"Classes",   value: classes.length,  sub:"Registered",   color:"#388e3c", icon:"🏫" },
    { label:"Subjects",  value: subjects.length, sub:"Configured",   color:"#7b1fa2", icon:"📚" },
  ];

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:24, fontWeight:700, margin:"0 0 4px", letterSpacing:"-0.3px" }}>Pedagogic Assistant Dashboard</h1>
        <p style={{ margin:0, color:"#757575", fontSize:14 }}>Sarah Martinez • Computer Science Department</p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {stats.map(({ label, value, sub, color, icon }) => (
          <div key={label} style={{ background:"#fff", borderRadius:10, padding:18, border:"1px solid #e0e0e0", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, color:"#757575", marginBottom:5 }}>{label}</div>
              <div style={{ fontSize:24, fontWeight:700, marginBottom:3 }}>{value}</div>
              <div style={{ fontSize:11, color:"#9e9e9e" }}>{sub}</div>
            </div>
            <div style={{ width:38, height:38, borderRadius:9, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#fff", flexShrink:0 }}>{icon}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:14 }}>
        {/* Validation queue */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e0e0e0", padding:20 }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>✅ Validation Queue</div>
          {loadingQ ? <Spinner/> : queue.length === 0 ? <EmptyState icon="✅" title="All caught up!" message="No pending validations."/> : (
            <>
              <div style={{ display:"flex", background:"#f5f5f5", borderRadius:7, padding:3, marginBottom:12 }}>
                {[["attendance","Attendance"],["justifications","Justifications"]].map(([k, l]) => (
                  <button key={k} onClick={() => setTab(k)} style={{ flex:1, padding:"7px 0", borderRadius:5, border:"none", cursor:"pointer", fontSize:12.5, fontWeight:600, background: tab === k ? "#fff" : "transparent", color: tab === k ? "#1976d2" : "#757575", boxShadow: tab === k ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>{l}</button>
                ))}
              </div>
              {queue.filter(i => tab === "attendance" ? !i.isJustification : i.isJustification).map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px", borderRadius:8, border:"1px solid #f0f0f0", background:"#fafafa", marginBottom:8 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"#e3f2fd", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#1976d2", flexShrink:0 }}>{ini(item.studentName || "?")}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{item.studentName}</div>
                    <div style={{ fontSize:11, color:"#757575" }}>{item.course} • {item.date}</div>
                  </div>
                  <button style={{ padding:"4px 10px", borderRadius:5, border:"1.5px solid #a5d6a7", background:"transparent", color:"#388e3c", fontWeight:600, fontSize:11, cursor:"pointer" }}>Validate</button>
                  <button style={{ padding:"4px 10px", borderRadius:5, border:"1.5px solid #ef9a9a", background:"transparent", color:"#c62828", fontWeight:600, fontSize:11, cursor:"pointer" }}>Reject</button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e0e0e0", padding:18 }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>Quick Actions</div>
          {[
            { label:"Manage Timetable",       icon:"📅", color:"#1976d2", nav:"timetable"      },
            { label:"Add Student",            icon:"🎓", color:"#388e3c", nav:"students"        },
            { label:"Bulk Import Students",   icon:"📥", color:"#f9a825", nav:"students"        },
            { label:"Attendance Records",     icon:"📋", color:"#7b1fa2", nav:"records"         },
            { label:"Irregularities",         icon:"⚠",  color:"#d84315", nav:"irregularities"  },
          ].map(a => (
            <button key={a.label} className="qa-btn" onClick={() => onNav(a.nav)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 11px", marginBottom:6, borderRadius:7, border:"1px solid #f0f0f0", background:"#fafafa", cursor:"pointer", textAlign:"left" }}>
              <div style={{ width:30, height:30, borderRadius:7, background:`${a.color}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{a.icon}</div>
              <span style={{ fontSize:13, fontWeight:500, color:"#424242" }}>{a.label}</span>
              <span style={{ marginLeft:"auto", color:"#bbb" }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [teachers,  setTeachers]  = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);
  const showToast = (msg, type = "info") => setToast({ msg, type, id: uid() });

  useEffect(() => {
    Promise.all([apiFetch(API.teachers), apiFetch(API.classrooms), apiFetch(API.subjects)])
      .then(([t, c, s]) => {
        setTeachers((t || []).map(normT));
        setClasses((c || []).map(normC));
        setSubjects((s || []).map(normS));
        setLoading(false);
      });
  }, []);

  const handleNav = async (id) => {
    setActiveNav(id);
    if (id === "timetable") {
      const [t, c, s] = await Promise.all([apiFetch(API.teachers), apiFetch(API.classrooms), apiFetch(API.subjects)]);
      if (t) setTeachers(t.map(normT));
      if (c) setClasses(c.map(normC));
      if (s) setSubjects(s.map(normS));
    }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:12, color:"#757575" }}>
      <div style={{ width:38, height:38, border:"4px solid #e0e0e0", borderTop:"4px solid #1976d2", borderRadius:"50%", animation:"spin 0.9s linear infinite" }}/>
      <span style={{ fontSize:14 }}>Connecting to API…</span>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", background:"#f5f7fa", color:"#212121" }}>
      {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}

      {/* Sidebar */}
      <aside style={{ width:240, background:"#fff", borderRight:"1px solid #e0e0e0", display:"flex", flexDirection:"column", padding:"0 0 14px", flexShrink:0, boxShadow:"2px 0 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #e0e0e0", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:"linear-gradient(135deg,#64b5f6,#fff59d)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:16, fontWeight:700 }}>A</span>
          </div>
          <span style={{ fontWeight:700, fontSize:17, letterSpacing:"-0.2px" }}>Attendee</span>
        </div>
        <nav style={{ flex:1, padding:"10px 8px 0" }}>
          {NAV.map(({ id, icon, label }) => (
            <div key={id} className="nav-item" onClick={() => handleNav(id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:7, marginBottom:2, cursor:"pointer", fontSize:14, fontWeight: activeNav === id ? 600 : 400, background: activeNav === id ? "#e3f2fd" : "transparent", color: activeNav === id ? "#1976d2" : "#546e7a", transition:"background 0.15s" }}>
              <span style={{ fontSize:14 }}>{icon}</span>{label}
            </div>
          ))}
        </nav>
        <div style={{ padding:"0 8px", borderTop:"1px solid #f0f0f0", paddingTop:8, marginTop:6 }}>
          <div style={{ padding:"9px 12px", fontSize:13, color:"#757575", cursor:"pointer", borderRadius:7 }}>⚙ Settings</div>
          <div style={{ padding:"9px 12px", fontSize:13, color:"#e53935", cursor:"pointer", borderRadius:7 }}>→ Logout</div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <header style={{ background:"#fff", borderBottom:"1px solid #e0e0e0", padding:"0 24px", height:58, display:"flex", alignItems:"center", gap:14, flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          <input placeholder="Search students, classes, teachers…" style={{ flex:1, maxWidth:400, padding:"8px 14px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:13, background:"#f5f7fa", outline:"none" }}/>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ position:"relative", cursor:"pointer" }}>
              <span style={{ fontSize:19 }}>🔔</span>
              <span style={{ position:"absolute", top:-2, right:-2, width:7, height:7, background:"#e53935", borderRadius:"50%", border:"1.5px solid #fff" }}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:"#e3f2fd", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#1976d2" }}>SM</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, lineHeight:1.2 }}>Sarah Martinez</div>
                <div style={{ fontSize:11, color:"#757575" }}>Pedagogic Assistant</div>
              </div>
            </div>
          </div>
        </header>

        <main style={{ flex:1, overflow: activeNav === "timetable" ? "hidden" : "auto", padding: activeNav === "timetable" ? 0 : "24px 24px 40px" }}>
          {activeNav === "dashboard"      && <DashboardHome onNav={handleNav} teachers={teachers} classes={classes} subjects={subjects}/>}
          {activeNav === "timetable"      && <Timetable teachers={teachers} classes={classes} subjects={subjects} showToast={showToast}/>}
          {activeNav === "students"       && <Students classes={classes} showToast={showToast}/>}
          {activeNav === "attendance"     && <div style={{ padding:40 }}><EmptyState icon="✅" title="Take Attendance" message="Select a class to mark today's attendance."/></div>}
          {activeNav === "records"        && <div style={{ padding:40 }}><EmptyState icon="📋" title="Attendance Records" message="Browse historical attendance records here."/></div>}
          {activeNav === "irregularities" && <div style={{ padding:40 }}><EmptyState icon="⚠"  title="Irregularities"    message="Students with attendance issues will appear here."/></div>}
        </main>
      </div>
    </div>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);