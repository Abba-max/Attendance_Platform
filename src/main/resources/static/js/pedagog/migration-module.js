
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
            label: 'Passage de Niveau',
            icon: '⬆️',
            color: 'blue',
            targetYearKey: 'migrationTargetYearForPromotion',   // → N+1
            yearBadgeColor: 'purple',
        },
        SPECIALITY_CHANGE: {
            label: 'Changement de Spécialité',
            icon: '🔀',
            color: 'orange',
            targetYearKey: 'migrationTargetYearForSpeciality',  // → N
            yearBadgeColor: 'green',
        },
        TRONC_COMMUN: {
            label: 'Tronc Commun → Spécialité',
            icon: '🎓',
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
                <span class="text-xl">🚫</span>
                <div>
                    <p class="font-bold">Migrations de passage bloquées</p>
                    <p class="mt-1">L'année <strong>${state.nextYearName}</strong> est déjà <strong>ACTIVE</strong>.
                    Les migrations de Passage de Niveau et Tronc Commun ne peuvent cibler qu'une année
                    <strong>PLANIFIÉE (N+1)</strong>. Contactez l'administrateur.</p>
                </div>
            </div>`;
        } else if (!state.nextYearExists) {
            yearAlert = `
            <div class="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-sm text-amber-700 flex gap-3">
                <span class="text-xl">ℹ️</span>
                <div>
                    <p class="font-bold">Nouvelle année académique requise</p>
                    <p class="mt-1">L'année cible <strong>${state.nextYearName}</strong> sera automatiquement initialisée
                    avec le statut <strong>PLANIFIÉE</strong> lors de la validation finale de votre première migration.</p>
                </div>
            </div>`;
        }

        el.innerHTML = `
        <!-- Main Two-Column Layout Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <!-- Left Column: Parameters Selection (lg:col-span-7) -->
            <div class="lg:col-span-7 space-y-6">
                <!-- En-tête & General Settings Card -->
                <div class="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-6">
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 pb-4">
                        <h2 class="text-lg font-black text-slate-800 flex items-center gap-2">
                            <span class="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl text-xl">🏫</span>
                            Migration des Étudiants
                        </h2>
                        <!-- Badges -->
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-emerald-100/50">
                                Active : <strong>${state.activeYearName}</strong>
                            </span>
                            <span class="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-indigo-100/50">
                                Cible N+1 : <strong>${state.nextYearName}</strong>
                                ${!state.nextYearExists ? ' (auto)' : state.nextYearReadyForMigration ? ' ✅' : ' 🚫 active'}
                            </span>
                        </div>
                    </div>

                    ${yearAlert}

                    <!-- Étape 1 : Type de migration -->
                    <div class="space-y-3">
                        <label class="text-xs font-black text-slate-400 uppercase tracking-wider block">
                            Étape 1 — Type de migration
                        </label>
                        <div class="grid grid-cols-1 sm:grid-cols-${state.hasTroncCommun ? 3 : 2} gap-3">
                            ${renderTypeButton('LEVEL_PROMOTION')}
                            ${renderTypeButton('SPECIALITY_CHANGE')}
                            ${state.hasTroncCommun ? renderTypeButton('TRONC_COMMUN') : ''}
                        </div>
                        <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                            <span>Année cible pour ce type :</span>
                            <span id="active-type-year-badge" class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase
                                ${getYearBadgeClass(state.migrationType)}">
                                ${getTargetYearLabel(state.migrationType)}
                            </span>
                        </div>
                    </div>

                    <!-- Étape 2 : Classe source -->
                    <div class="space-y-2">
                        <label class="text-xs font-black text-slate-400 uppercase tracking-wider block">
                            Étape 2 — Classe source
                        </label>
                        <div class="relative">
                            <select id="migration-source-select"
                                class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700
                                       focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all appearance-none cursor-pointer">
                                <option value="">— Choisir une classe source —</option>
                            </select>
                            <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                🔍
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Étape 4 : Classe cible -->
                <div id="migration-target-section" class="hidden bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-50 pb-3">
                        <label class="text-xs font-black text-slate-400 uppercase tracking-wider">
                            Étape 4 — Classe cible
                        </label>
                        <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                            Cible : ${getTargetYearLabel(state.migrationType)}
                        </span>
                    </div>
                    <div id="target-classrooms-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
                </div>

                <!-- Étape 5 : Confirmation -->
                <div id="migration-confirm-section" class="hidden bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
                    <div class="space-y-2">
                        <label class="text-xs font-black text-slate-400 uppercase tracking-wider block">
                            Étape 5 — Motif & Confirmation
                        </label>
                        <textarea id="migration-reason" rows="2"
                            placeholder="Ex. : Résultats du concours de passage, orientation académique..."
                            class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 resize-none
                                   focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"></textarea>
                    </div>
                    <div id="migration-summary" class="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-4 text-xs font-medium text-indigo-900 space-y-1"></div>
                    <button id="btn-confirm-migration"
                        class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold py-4 rounded-2xl
                               shadow-md shadow-indigo-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-0">
                        <span id="btn-migrate-icon" class="text-lg">🚀</span>
                        <span id="btn-migrate-label">Lancer la migration</span>
                    </button>
                </div>

                <!-- Résultats -->
                <div id="migration-results" class="hidden bg-white border border-slate-100 rounded-3xl shadow-sm p-6"></div>
            </div>

            <!-- Right Column: Student Listing (lg:col-span-5) -->
            <div class="lg:col-span-5">
                <!-- Card Container for Student List -->
                <div id="migration-students-section" class="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4 min-h-[400px] flex flex-col">
                    
                    <!-- Header with Checkbox & Count -->
                    <div class="flex items-center justify-between border-b border-slate-50 pb-4">
                        <div>
                            <label class="text-xs font-black text-slate-400 uppercase tracking-wider block">
                                Étape 3 — Sélectionner les étudiants
                            </label>
                            <span id="selected-count"
                                class="inline-block mt-1 bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                0 sélectionné(s)
                            </span>
                        </div>
                        <label id="select-all-wrapper" class="hidden flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 transition-all select-none">
                            <input type="checkbox" id="select-all-students" class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer">
                            <span>Tout</span>
                        </label>
                    </div>

                    <!-- Scrollable List -->
                    <div id="students-list" class="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[550px] pr-1">
                        <!-- Placeholder State when no classroom is selected -->
                        <div id="students-placeholder" class="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 mt-12 text-slate-400">
                            <div class="text-4xl">👥</div>
                            <div>
                                <p class="font-bold text-slate-700 text-sm">Aucune classe sélectionnée</p>
                                <p class="text-slate-400 text-xs mt-1">Choisissez une classe source dans l'Étape 2 pour charger sa liste d'étudiants.</p>
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
                                <p class="font-bold text-slate-700 text-sm">Aucune classe sélectionnée</p>
                                <p class="text-slate-400 text-xs mt-1">Choisissez une classe source dans l'Étape 2 pour charger sa liste d'étudiants.</p>
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
        select.innerHTML = '<option value="">— Choisir une classe source —</option>';
        (data.sourceClassrooms || []).forEach(c => {
            select.innerHTML += `<option value="${c.classId}">
                ${c.name} — Niv. ${c.level} (${c.specialityName}${c.troncCommun ? ' [TC]' : ''})
                — ${c.availableSlots} place(s) libre(s)
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
                <span class="text-3xl">⚠️</span>
                <p class="text-sm font-bold">Aucun étudiant</p>
                <p class="text-xs">Cette classe ne contient aucun étudiant actif.</p>
            </div>`;
            return;
        }
        list.innerHTML = students.map(s => `
        <label class="flex items-center gap-3 px-4 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl cursor-pointer transition-all select-none">
            <input type="checkbox" class="student-checkbox w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                data-student-id="${s.studentId}">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-800 truncate">${s.fullName}</p>
                <p class="text-xs font-semibold text-slate-400 truncate">${s.matricule || 'Sans matricule'} ${s.email ? '· ' + s.email : ''}</p>
            </div>
        </label>`).join('');
    }

    function renderTargetClassrooms(targets) {
        const grid = document.getElementById('target-classrooms-grid');
        if (!grid) return;
        if (!targets?.length) {
            grid.innerHTML = '<p class="col-span-full text-center text-slate-400 py-6 text-sm font-semibold">Aucune classe cible disponible.</p>';
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
                    <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase">Niv. ${c.level}</span>
                </div>
                <p class="text-xs font-semibold text-slate-400 mt-1 truncate">${c.specialityName}</p>
                <div class="mt-2.5 flex items-center justify-between border-t border-slate-100/50 pt-2">
                    <span class="text-[10px] font-bold text-slate-400">Places :</span>
                    <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-md
                        ${isFull ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}">
                        ${isFull ? '🔴 Complet' : `🟢 ${c.availableSlots} libre(s)`}
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
            <p><span class="font-bold">Type :</span> ${cfg.icon} ${cfg.label}</p>
            <p><span class="font-bold">Année cible :</span>
                <span class="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full text-xs">
                    📅 ${yearLabel}
                </span>
            </p>
            <p><span class="font-bold">De :</span> ${sourceName}</p>
            <p><span class="font-bold">Vers :</span> ${targetName}</p>
            <p><span class="font-bold">Étudiants :</span>
                <span class="bg-indigo-200 text-indigo-800 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    ${state.selectedStudents.size} sélectionné(s)
                </span>
            </p>
        </div>`;
    }

    function updateSelectedCount() {
        const el = document.getElementById('selected-count');
        if (el) el.textContent = `${state.selectedStudents.size} sélectionné(s)`;
    }

    async function executeMigration() {
        const btn   = document.getElementById('btn-confirm-migration');
        const label = document.getElementById('btn-migrate-label');
        const icon  = document.getElementById('btn-migrate-icon');

        if (!state.targetClassroomId || state.selectedStudents.size === 0) {
            showToast('Sélectionnez des étudiants et une classe cible.', 'warning'); return;
        }

        btn.disabled = true; icon.textContent = '⏳'; label.textContent = 'Migration en cours...';

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
            showToast('Erreur migration : ' + (err.message || 'Inconnue'), 'error');
        } finally {
            btn.disabled = false; icon.textContent = '🚀'; label.textContent = 'Lancer la migration';
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
                <h3 class="font-bold text-slate-700 text-sm">Résultats de la Migration</h3>
                <div class="flex gap-1.5">
                    <span class="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg">✅ Réussis : ${ok.length}</span>
                    ${err.length ? `<span class="bg-red-50 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-lg">❌ Échecs : ${err.length}</span>` : ''}
                </div>
            </div>
            <div class="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
                ${results.map(r => `
                <div class="flex items-start gap-3 px-4 py-3 ${r.success ? 'bg-white' : 'bg-red-50/30'}">
                    <span class="text-base">${r.success ? '✅' : '❌'}</span>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-800 truncate">${r.studentName || 'Étudiant ID: ' + r.studentId}</p>
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