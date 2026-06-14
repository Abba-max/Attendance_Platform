
const MigrationModule = (() => {

    let state = {
        migrationType: 'LEVEL_PROMOTION',
        sourceClassroomId: null,
        targetClassroomId: null,
        selectedStudents: new Set(),
        hasTroncCommun: false,
        // Contexte années académiques
        activeYearName: '—',
        nextYearName: '—',
        nextYearExists: false,
        nextYearReadyForMigration: true,
        migrationTargetYearForPromotion: '—',
        migrationTargetYearForSpeciality: '—',
    };

    const TYPE_CONFIG = {
        LEVEL_PROMOTION: {
            label: 'Level Promotion',
            icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>',
            color: 'blue',
            targetYearKey: 'migrationTargetYearForPromotion',   // → N+1
            yearBadgeColor: 'purple',
        },
        SPECIALITY_CHANGE: {
            label: 'Speciality Change',
            icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>',
            color: 'orange',
            targetYearKey: 'migrationTargetYearForSpeciality',  // → N
            yearBadgeColor: 'green',
        },
        TRONC_COMMUN: {
            label: 'Common Core → Speciality',
            icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14v4"/></svg>',
            color: 'emerald',
            targetYearKey: 'migrationTargetYearForPromotion',   // → N+1
            yearBadgeColor: 'purple',
        },
    };

    async function init() {
        try {
            // Charger en parallèle : contexte pédagogue + contexte années
            const [pedagCtx, yearCtx] = await Promise.all([
                apiFetch('/api/migration/pedagog-context'),
                apiFetch('/api/migration/academic-year-context'),
            ]);

            state.hasTroncCommun = pedagCtx.hasTroncCommun;
            Object.assign(state, {
                activeYearName:                   yearCtx.activeYearName,
                nextYearName:                     yearCtx.nextYearName,
                nextYearExists:                   yearCtx.nextYearExists,
                nextYearReadyForMigration:        yearCtx.nextYearReadyForMigration,
                migrationTargetYearForPromotion:  yearCtx.migrationTargetYearForPromotion,
                migrationTargetYearForSpeciality: yearCtx.migrationTargetYearForSpeciality,
            });

            renderMigrationSection();
            bindEvents();
            await loadSourceClassrooms();

        } catch (err) {
            console.error('[Migration] Erreur init :', err);
            const el = document.getElementById('migration-section');
            if (el) el.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
                    ⚠️ Erreur de chargement du module migration : ${err.message}
                </div>`;
        }
    }

    function renderMigrationSection() {
        const el = document.getElementById('migration-section');
        if (!el) return;

        // Alerte si N+1 n'est pas prête
        let yearAlert = '';
        if (!state.nextYearReadyForMigration) {
            yearAlert = `
            <div class="bg-red-50 border border-red-300 rounded-2xl p-4 text-sm text-red-700 flex gap-3">
                <div class="w-6 h-6 flex-shrink-0 text-red-500"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg></div>
                <div>
                    <p class="font-bold">Level Promotion Blocked</p>
                    <p class="mt-1">The academic year <strong>${state.nextYearName}</strong> is already <strong>ACTIVE</strong>.
                    Level promotions and Common Core migrations can only target a
                    <strong>PLANNED (N+1)</strong> year. Contact the administrator.</p>
                </div>
            </div>`;
        } else if (!state.nextYearExists) {
            yearAlert = `
            <div class="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-sm text-amber-700 flex gap-3">
                <div class="w-6 h-6 flex-shrink-0 text-amber-500"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                <div>
                    <p class="font-bold">New Academic Year Required</p>
                    <p class="mt-1">The target year <strong>${state.nextYearName}</strong> will be automatically initialized
                    with status <strong>PLANNED</strong> upon final confirmation of your first migration.</p>
                </div>
            </div>`;
        }

        el.innerHTML = `
        <!-- Main Two-Column Layout Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <!-- Left Column: Parameters Selection (lg:col-span-7) -->
            <div class="lg:col-span-7 space-y-6">
                <!-- En-tête & General Settings Card -->
                <div class="bento-card p-6 space-y-6">
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 pb-4">
                        <h2 class="text-lg font-black text-slate-800 flex items-center gap-2">
                            <span class="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></span>
                            Student Migration
                        </h2>
                        <!-- Badges -->
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-emerald-100/50">
                                Active: <strong>${state.activeYearName}</strong>
                            </span>
                            <span class="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-indigo-100/50">
                                Target N+1: <strong>${state.nextYearName}</strong>
                                ${!state.nextYearExists ? ' (auto)' : state.nextYearReadyForMigration ? ' ✅' : ' 🚫 active'}
                            </span>
                        </div>
                    </div>

                    ${yearAlert}

                    <!-- Étape 1 : Type de migration -->
                    <div class="space-y-3">
                        <label class="text-xs font-black text-slate-400 uppercase tracking-wider block">
                            Step 1 — Migration Type
                        </label>
                        <div class="grid grid-cols-1 sm:grid-cols-${state.hasTroncCommun ? 3 : 2} gap-3">
                            ${renderTypeButton('LEVEL_PROMOTION')}
                            ${renderTypeButton('SPECIALITY_CHANGE')}
                            ${state.hasTroncCommun ? renderTypeButton('TRONC_COMMUN') : ''}
                        </div>
                        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                            <span>Target year for this type:</span>
                            <span id="active-type-year-badge" class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase
                                ${getYearBadgeClass(state.migrationType)}">
                                ${getTargetYearLabel(state.migrationType)}
                            </span>
                        </div>
                    </div>

                    <!-- Étape 2 : Classe source -->
                    <div class="space-y-2">
                        <label class="text-xs font-black text-slate-400 uppercase tracking-wider block">
                            Step 2 — Source Classroom
                        </label>
                        <div class="relative">
                            <select id="migration-source-select"
                                class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700
                                       focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all appearance-none cursor-pointer">
                                <option value="">— Choose a source classroom —</option>
                            </select>
                            <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Étape 4 : Classe cible -->
                <div id="migration-target-section" class="hidden bento-card p-6 space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-50 pb-3">
                        <label class="text-xs font-black text-slate-400 uppercase tracking-wider">
                            Step 4 — Target Classroom
                        </label>
                        <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                            Target: ${getTargetYearLabel(state.migrationType)}
                        </span>
                    </div>
                    <div id="target-classrooms-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
                </div>

                <!-- Étape 5 : Confirmation -->
                <div id="migration-confirm-section" class="hidden bento-card p-6 space-y-4">
                    <div class="space-y-2">
                        <label class="text-xs font-black text-slate-400 uppercase tracking-wider block">
                            Step 5 — Reason & Confirmation
                        </label>
                        <textarea id="migration-reason" rows="2"
                            placeholder="e.g., Exam results, academic orientation..."
                            class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 resize-none
                                   focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"></textarea>
                    </div>
                    <div id="migration-summary" class="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-4 text-xs font-medium text-indigo-900 space-y-1"></div>
                    <button id="btn-confirm-migration"
                        class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold py-4 rounded-2xl
                               shadow-md shadow-indigo-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-0">
                        <span id="btn-migrate-icon" class="flex items-center justify-center"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></span>
                        <span id="btn-migrate-label">Launch Migration</span>
                    </button>
                </div>

                <!-- Résultats -->
                <div id="migration-results" class="hidden bento-card p-6"></div>
            </div>

            <!-- Right Column: Student Listing (lg:col-span-5) -->
            <div class="lg:col-span-5">
                <!-- Card Container for Student List -->
                <div id="migration-students-section" class="bento-card p-6 space-y-4 min-h-[400px] flex flex-col">
                    
                    <!-- Header with Checkbox & Count -->
                    <div class="flex items-center justify-between border-b border-slate-50 pb-4">
                        <div>
                            <label class="text-xs font-black text-slate-400 uppercase tracking-wider block">
                                Step 3 — Select Students
                            </label>
                            <span id="selected-count"
                                class="inline-block mt-1 bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                0 selected
                            </span>
                        </div>
                        <label id="select-all-wrapper" class="hidden flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 transition-all select-none">
                            <input type="checkbox" id="select-all-students" class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer">
                            <span>All</span>
                        </label>
                    </div>

                    <!-- Scrollable List -->
                    <div id="students-list" class="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[550px] pr-1">
                        <div id="students-placeholder" class="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 mt-12 text-slate-400">
                            <div class="text-slate-300 mb-2"><svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></div>
                            <div>
                                <p class="font-bold text-slate-700 text-sm">No classroom selected</p>
                                <p class="text-slate-400 text-xs mt-1">Choose a source classroom in Step 2 to load the student list.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // ── Helpers visuels ───────────────────────────────────────────────────

    function getTargetYearLabel(type) {
        const key = TYPE_CONFIG[type]?.targetYearKey;
        return state[key] || '—';
    }

    function getYearBadgeClass(type) {
        const color = TYPE_CONFIG[type]?.yearBadgeColor || 'gray';
        return {
            purple: 'bg-purple-100 text-purple-700',
            green:  'bg-green-100 text-green-700',
        }[color] || 'bg-gray-100 text-gray-700';
    }

    function renderTypeButton(type) {
        const cfg = TYPE_CONFIG[type];
        const active = state.migrationType === type;
        const yearLabel = getTargetYearLabel(type);

        // Désactiver LEVEL_PROMOTION et TRONC_COMMUN si N+1 n'est pas prête
        const needsNextYear = (type === 'LEVEL_PROMOTION' || type === 'TRONC_COMMUN');
        const disabled = needsNextYear && !state.nextYearReadyForMigration && state.nextYearExists;

        const colorMap = {
            blue:    { active: 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-sm shadow-indigo-100/50',
                       base:   'border-slate-100 bg-slate-50/30 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/20' },
            orange:  { active: 'border-orange-500 bg-orange-50/70 text-orange-700 shadow-sm shadow-orange-100/50',
                       base:   'border-slate-100 bg-slate-50/30 text-slate-600 hover:border-orange-200 hover:bg-orange-50/20' },
            emerald: { active: 'border-emerald-600 bg-emerald-50/70 text-emerald-700 shadow-sm shadow-emerald-100/50',
                       base:   'border-slate-100 bg-slate-50/30 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/20' },
        };
        const cls = active ? colorMap[cfg.color].active : colorMap[cfg.color].base;

        return `
        <button data-migration-type="${type}"
            class="migration-type-btn border rounded-2xl px-4 py-4 text-sm font-bold
                   transition-all flex flex-col items-center gap-1.5 ${cls}
                   ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}"
            ${disabled ? 'disabled title="N+1 déjà active — migration impossible"' : ''}>
            <span class="text-2xl">${cfg.icon}</span>
            <span class="tracking-tight text-center leading-tight">${cfg.label}</span>
            <span class="text-[10px] font-black uppercase px-2 py-0.5 bg-white/80 rounded-md border border-slate-100 mt-1">Cible : ${yearLabel}</span>
        </button>`;
    }

    function bindEvents() {
        const section = document.getElementById('migration-section');
        if (!section) return;

        section.addEventListener('click', async (e) => {
            const typeBtn = e.target.closest('[data-migration-type]');
            if (typeBtn && !typeBtn.disabled) {
                const t = typeBtn.dataset.migrationType;
                if (t !== state.migrationType) {
                    state.migrationType = t;
                    state.sourceClassroomId = null;
                    state.targetClassroomId = null;
                    state.selectedStudents.clear();
                    renderMigrationSection();
                    bindEvents();
                    await loadSourceClassrooms();
                }
                return;
            }

            const targetCard = e.target.closest('[data-target-classroom]');
            if (targetCard && !targetCard.disabled) {
                selectTargetClassroom(parseInt(targetCard.dataset.targetClassroom), targetCard.dataset.targetName);
                return;
            }

            if (e.target.closest('#btn-confirm-migration')) {
                await executeMigration();
            }
        });

        section.addEventListener('change', async (e) => {
            if (e.target.id === 'migration-source-select') {
                state.sourceClassroomId = e.target.value ? parseInt(e.target.value) : null;
                state.targetClassroomId = null;
                state.selectedStudents.clear();
                if (state.sourceClassroomId) await loadStudentsAndTargets();
                else {
                    const list = document.getElementById('students-list');
                    if (list) {
                        list.innerHTML = `
                        <div id="students-placeholder" class="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 mt-12 text-slate-400">
                            <div class="text-4xl">👥</div>
                            <div>
                                <p class="font-bold text-slate-700 text-sm">No classroom selected</p>
                                <p class="text-slate-400 text-xs mt-1">Choose a source classroom in Step 2 to load the student list.</p>
                            </div>
                        </div>`;
                    }
                    hide('select-all-wrapper');
                    hide('migration-target-section');
                    hide('migration-confirm-section');
                    updateSelectedCount();
                }
            }
            if (e.target.matches('.student-checkbox')) {
                const id = parseInt(e.target.dataset.studentId);
                e.target.checked ? state.selectedStudents.add(id) : state.selectedStudents.delete(id);
                updateSelectedCount(); updateConfirmSection();
            }
            if (e.target.id === 'select-all-students') {
                document.querySelectorAll('.student-checkbox').forEach(cb => {
                    cb.checked = e.target.checked;
                    const id = parseInt(cb.dataset.studentId);
                    e.target.checked ? state.selectedStudents.add(id) : state.selectedStudents.delete(id);
                });
                updateSelectedCount(); updateConfirmSection();
            }
        });
    }

    async function loadSourceClassrooms() {
        const data = await apiFetch(`/api/migration/available-targets?type=${state.migrationType}`);
        const select = document.getElementById('migration-source-select');
        if (!select) return;
        select.innerHTML = '<option value="">— Choose a source classroom —</option>';
        (data.sourceClassrooms || []).forEach(c => {
            select.innerHTML += `<option value="${c.classId}">
                ${c.name} — Lvl. ${c.level} (${c.specialityName}${c.troncCommun ? ' [CC]' : ''})
                — ${c.availableSlots} free slot(s)
            </option>`;
        });
    }

    async function loadStudentsAndTargets() {
        show('migration-target-section');
        hide('migration-confirm-section');

        const [students, targets] = await Promise.all([
            apiFetch(`/api/migration/classroom/${state.sourceClassroomId}/students`),
            apiFetch(`/api/migration/available-targets?type=${state.migrationType}&sourceClassroomId=${state.sourceClassroomId}`),
        ]);

        if (students && students.length > 0) {
            show('select-all-wrapper');
        } else {
            hide('select-all-wrapper');
        }

        renderStudentsList(students);
        renderTargetClassrooms(targets.targetClassrooms || []);
    }

    function renderStudentsList(students) {
        const list = document.getElementById('students-list');
        if (!list) return;
        if (!students?.length) {
            list.innerHTML = `
            <div class="flex flex-col items-center justify-center text-center p-6 space-y-2 mt-12 text-slate-400">
                <div class="text-slate-300 mb-2"><svg class="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>
                <p class="text-sm font-bold">No students</p>
                <p class="text-xs">This classroom does not contain any active students.</p>
            </div>`;
            return;
        }
        list.innerHTML = students.map(s => `
        <label class="flex items-center gap-3 px-4 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl cursor-pointer transition-all select-none">
            <input type="checkbox" class="student-checkbox w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                data-student-id="${s.studentId}">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-800 truncate">${s.fullName}</p>
                <p class="text-xs font-semibold text-slate-400 truncate">${s.matricule || 'No matricule'} ${s.email ? '· ' + s.email : ''}</p>
            </div>
        </label>`).join('');
    }

    function renderTargetClassrooms(targets) {
        const grid = document.getElementById('target-classrooms-grid');
        if (!grid) return;
        if (!targets?.length) {
            grid.innerHTML = '<p class="col-span-full text-center text-slate-400 py-6 text-sm font-semibold">No target classrooms available.</p>';
            return;
        }
        grid.innerHTML = targets.map(c => {
            const isFull = c.availableSlots === 0;
            const isSelected = state.targetClassroomId === c.classId;
            return `
            <button data-target-classroom="${c.classId}" data-target-name="${c.name}"
                class="target-classroom-card border p-4 rounded-2xl text-left transition-all select-none
                    ${isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-slate-100 bg-slate-50/30 hover:border-indigo-300 hover:bg-indigo-50/10'}
                    ${isFull ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}"
                ${isFull ? 'disabled' : ''}>
                <div class="flex items-center justify-between">
                    <p class="font-bold text-sm text-slate-800 truncate">${c.name}</p>
                    <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase">Lvl. ${c.level}</span>
                </div>
                <p class="text-xs font-semibold text-slate-400 mt-1 truncate">${c.specialityName}</p>
                <div class="mt-2.5 flex items-center justify-between border-t border-slate-100/50 pt-2">
                    <span class="text-[10px] font-bold text-slate-400">Slots:</span>
                    <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-md
                        ${isFull ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}">
                        ${isFull ? '🔴 Full' : `🟢 ${c.availableSlots} free`}
                    </span>
                </div>
            </button>`;
        }).join('');
    }

    function selectTargetClassroom(id, name) {
        state.targetClassroomId = id;
        document.querySelectorAll('.target-classroom-card').forEach(c => {
            const me = parseInt(c.dataset.targetClassroom) === id;
            c.classList.toggle('border-indigo-600', me);
            c.classList.toggle('bg-indigo-50/50', me);
            c.classList.toggle('shadow-sm', me);
            c.classList.toggle('border-slate-100', !me);
            c.classList.toggle('bg-slate-50/30', !me);
        });
        updateConfirmSection();
    }

    function updateConfirmSection() {
        const section = document.getElementById('migration-confirm-section');
        const summary = document.getElementById('migration-summary');
        if (!section || !summary) return;
        if (state.selectedStudents.size === 0 || !state.targetClassroomId) {
            section.classList.add('hidden'); return;
        }
        section.classList.remove('hidden');

        const sourceEl = document.getElementById('migration-source-select');
        const sourceName = sourceEl?.options[sourceEl.selectedIndex]?.text || '—';
        const targetCard = document.querySelector(`[data-target-classroom="${state.targetClassroomId}"]`);
        const targetName = targetCard?.dataset.targetName || '—';
        const cfg = TYPE_CONFIG[state.migrationType];
        const yearLabel = getTargetYearLabel(state.migrationType);

        summary.innerHTML = `
        <div class="space-y-1.5">
            <p><span class="font-bold">Type:</span> ${cfg.icon} ${cfg.label}</p>
            <p><span class="font-bold">Target Year:</span>
                <span class="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full text-xs">
                    📅 ${yearLabel}
                </span>
            </p>
            <p><span class="font-bold">From:</span> ${sourceName}</p>
            <p><span class="font-bold">To:</span> ${targetName}</p>
            <p><span class="font-bold">Students:</span>
                <span class="bg-indigo-200 text-indigo-800 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    ${state.selectedStudents.size} selected
                </span>
            </p>
        </div>`;
    }

    function updateSelectedCount() {
        const el = document.getElementById('selected-count');
        if (el) el.textContent = `${state.selectedStudents.size} selected`;
    }

    async function executeMigration() {
        const btn   = document.getElementById('btn-confirm-migration');
        const label = document.getElementById('btn-migrate-label');
        const icon  = document.getElementById('btn-migrate-icon');

        if (!state.targetClassroomId || state.selectedStudents.size === 0) {
            showToast('Select students and a target classroom.', 'warning'); return;
        }

        btn.disabled = true; icon.textContent = '⏳'; label.textContent = 'Migration in progress...';

        try {
            const results = await apiFetch('/api/migration/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentIds: [...state.selectedStudents],
                    fromClassroomId: state.sourceClassroomId,
                    toClassroomId: state.targetClassroomId,
                    migrationType: state.migrationType,
                    autoNextLevel: false,
                    reason: document.getElementById('migration-reason')?.value?.trim() || '',
                }),
            });

            renderResults(results);
            state.selectedStudents.clear(); state.targetClassroomId = null;
            updateSelectedCount(); hide('migration-confirm-section');
            if (state.sourceClassroomId) await loadStudentsAndTargets();

        } catch (err) {
            showToast('Migration error: ' + (err.message || 'Unknown'), 'error');
        } finally {
            btn.disabled = false; icon.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>'; label.textContent = 'Launch Migration';
        }
    }

    function renderResults(results) {
        const el = document.getElementById('migration-results');
        if (!el) return;
        el.classList.remove('hidden');
        const ok  = results.filter(r => r.success);
        const err = results.filter(r => !r.success);
        el.innerHTML = `
        <div class="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div class="flex items-center justify-between bg-slate-50 px-4 py-3.5 border-b border-slate-100">
                <h3 class="font-bold text-slate-700 text-sm">Migration Results</h3>
                <div class="flex gap-1.5">
                    <span class="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg">✅ Succeeded: ${ok.length}</span>
                    ${err.length ? `<span class="bg-red-50 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-lg">❌ Failed: ${err.length}</span>` : ''}
                </div>
            </div>
            <div class="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
                ${results.map(r => `
                <div class="flex items-start gap-3 px-4 py-3 ${r.success ? 'bg-white' : 'bg-red-50/30'}">
                    <span class="text-base">${r.success ? '✅' : '❌'}</span>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-800 truncate">${r.studentName || 'Student ID: ' + r.studentId}</p>
                        ${r.success
                            ? `<p class="text-xs font-semibold text-slate-500 mt-0.5">${r.fromClassroom} ➔ ${r.toClassroom} · ${r.message}</p>`
                            : `<p class="text-xs font-bold text-red-500 mt-0.5">${r.message}</p>`}
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ── Utilitaires ───────────────────────────────────────────────────────
    async function apiFetch(url, opts = {}) {
        const res = await fetch(url, { ...opts, credentials: 'include' });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        return res.json();
    }
    const show = id => document.getElementById(id)?.classList.remove('hidden');
    const hide = id => document.getElementById(id)?.classList.add('hidden');
    function showToast(msg, type = 'info') {
        if (typeof window.showToast === 'function') window.showToast(msg, type);
        else console.warn('[Toast]', type, msg);
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('migration-section')) MigrationModule.init();
});