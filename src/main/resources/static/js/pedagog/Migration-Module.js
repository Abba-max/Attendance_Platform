
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
            <div class="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-700 flex gap-2">
                <span class="text-lg">🚫</span>
                <div>
                    <p class="font-semibold">Migrations de passage bloquées</p>
                    <p>L'année <strong>${state.nextYearName}</strong> est déjà <strong>ACTIVE</strong>.
                    Les migrations de Passage de Niveau et Tronc Commun ne peuvent cibler qu'une année
                    <strong>PLANIFIÉE (N+1)</strong>. Contactez l'administrateur.</p>
                </div>
            </div>`;
        } else if (!state.nextYearExists) {
            yearAlert = `
            <div class="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-700 flex gap-2">
                <span class="text-lg">ℹ️</span>
                <div>
                    <p class="font-semibold">Année N+1 non encore créée</p>
                    <p>L'année <strong>${state.nextYearName}</strong> sera automatiquement créée
                    avec le statut <strong>PLANIFIÉE</strong> lors de la première migration de passage.</p>
                </div>
            </div>`;
        }

        el.innerHTML = `
        <div class="bg-white rounded-2xl shadow-md p-6 space-y-6">

            <!-- En-tête -->
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                    🏫 Migration des Étudiants
                </h2>
                <!-- Badges années N et N+1 -->
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                        📅 Année en cours : <strong>${state.activeYearName}</strong>
                    </span>
                    <span class="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">
                        📅 Année N+1 : <strong>${state.nextYearName}</strong>
                        ${!state.nextYearExists ? ' ✨ auto' : state.nextYearReadyForMigration ? ' ✅' : ' 🚫 ACTIVE'}
                    </span>
                    ${state.hasTroncCommun
                        ? '<span class="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">🎓 Tronc Commun</span>'
                        : ''}
                </div>
            </div>

            ${yearAlert}

            <!-- Étape 1 : Type de migration -->
            <div>
                <p class="text-sm font-semibold text-gray-600 mb-3">
                    Étape 1 — Type de migration
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-${state.hasTroncCommun ? 3 : 2} gap-3">
                    ${renderTypeButton('LEVEL_PROMOTION')}
                    ${renderTypeButton('SPECIALITY_CHANGE')}
                    ${state.hasTroncCommun ? renderTypeButton('TRONC_COMMUN') : ''}
                </div>
                <!-- Indicateur d'année cible pour le type actif -->
                <div class="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <span>Année académique ciblée :</span>
                    <span id="active-type-year-badge" class="font-semibold px-2 py-0.5 rounded-full
                        ${getYearBadgeClass(state.migrationType)}">
                        ${getTargetYearLabel(state.migrationType)}
                    </span>
                </div>
            </div>

            <!-- Étape 2 : Classe source -->
            <div>
                <p class="text-sm font-semibold text-gray-600 mb-2">Étape 2 — Classe source</p>
                <select id="migration-source-select"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">— Choisir une classe source —</option>
                </select>
            </div>

            <!-- Étape 3 : Étudiants -->
            <div id="migration-students-section" class="hidden">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-semibold text-gray-600">Étape 3 — Sélectionner les étudiants</p>
                    <div class="flex items-center gap-2">
                        <label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                            <input type="checkbox" id="select-all-students" class="rounded">
                            Tout sélectionner
                        </label>
                        <span id="selected-count"
                            class="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            0 sélectionné(s)
                        </span>
                    </div>
                </div>
                <div id="students-list"
                    class="border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
                </div>
            </div>

            <!-- Étape 4 : Classe cible -->
            <div id="migration-target-section" class="hidden">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-semibold text-gray-600">Étape 4 — Classe cible</p>
                    <span class="text-xs text-gray-400 italic">
                        Vers l'année : <strong>${getTargetYearLabel(state.migrationType)}</strong>
                    </span>
                </div>
                <div id="target-classrooms-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"></div>
            </div>

            <!-- Étape 5 : Confirmation -->
            <div id="migration-confirm-section" class="hidden space-y-3">
                <div>
                    <label class="text-sm font-semibold text-gray-600 block mb-1">Motif (optionnel)</label>
                    <textarea id="migration-reason" rows="2"
                        placeholder="Ex. : Résultats du concours de passage, orientation académique..."
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                               focus:outline-none focus:ring-2 focus:ring-blue-400"></textarea>
                </div>
                <div id="migration-summary" class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800"></div>
                <button id="btn-confirm-migration"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl
                           transition flex items-center justify-center gap-2 disabled:opacity-50">
                    <span id="btn-migrate-icon">🚀</span>
                    <span id="btn-migrate-label">Lancer la migration</span>
                </button>
            </div>

            <!-- Résultats -->
            <div id="migration-results" class="hidden"></div>
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
            blue:    { active: 'bg-blue-600 text-white border-blue-600',
                       base:   'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50' },
            orange:  { active: 'bg-orange-500 text-white border-orange-500',
                       base:   'bg-white text-gray-700 border-gray-200 hover:border-orange-400 hover:bg-orange-50' },
            emerald: { active: 'bg-emerald-600 text-white border-emerald-600',
                       base:   'bg-white text-gray-700 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50' },
        };
        const cls = active ? colorMap[cfg.color].active : colorMap[cfg.color].base;

        return `
        <button data-migration-type="${type}"
            class="migration-type-btn border-2 rounded-xl px-3 py-3 text-sm font-semibold
                   transition-all flex flex-col items-center gap-1 ${cls}
                   ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}"
            ${disabled ? 'disabled title="N+1 déjà active — migration impossible"' : ''}>
            <span class="text-2xl">${cfg.icon}</span>
            <span>${cfg.label}</span>
            <!-- Badge année cible -->
            <span class="text-xs mt-1 font-normal opacity-80">→ ${yearLabel}</span>
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
                else { hide('migration-students-section'); hide('migration-target-section'); hide('migration-confirm-section'); }
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
        show('migration-students-section');
        show('migration-target-section');
        hide('migration-confirm-section');

        const [students, targets] = await Promise.all([
            apiFetch(`/api/migration/classroom/${state.sourceClassroomId}/students`),
            apiFetch(`/api/migration/available-targets?type=${state.migrationType}&sourceClassroomId=${state.sourceClassroomId}`),
        ]);

        renderStudentsList(students);
        renderTargetClassrooms(targets.targetClassrooms || []);
    }

    function renderStudentsList(students) {
        const list = document.getElementById('students-list');
        if (!list) return;
        if (!students?.length) {
            list.innerHTML = '<p class="text-center text-gray-400 py-6 text-sm">Aucun étudiant dans cette classe.</p>';
            return;
        }
        list.innerHTML = students.map(s => `
        <label class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition">
            <input type="checkbox" class="student-checkbox rounded border-gray-300 text-blue-600"
                data-student-id="${s.studentId}">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 truncate">${s.fullName}</p>
                <p class="text-xs text-gray-500">${s.matricule || ''} ${s.email ? '· ' + s.email : ''}</p>
            </div>
        </label>`).join('');
    }

    function renderTargetClassrooms(targets) {
        const grid = document.getElementById('target-classrooms-grid');
        if (!grid) return;
        if (!targets?.length) {
            grid.innerHTML = '<p class="col-span-full text-center text-gray-400 py-4 text-sm">Aucune classe cible disponible.</p>';
            return;
        }
        grid.innerHTML = targets.map(c => {
            const isFull = c.availableSlots === 0;
            const isSelected = state.targetClassroomId === c.classId;
            return `
            <button data-target-classroom="${c.classId}" data-target-name="${c.name}"
                class="target-classroom-card border-2 rounded-xl p-3 text-left transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                    ${isFull ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
                ${isFull ? 'disabled' : ''}>
                <p class="font-semibold text-sm text-gray-800">${c.name}</p>
                <p class="text-xs text-gray-500 mt-0.5">Niv. ${c.level} — ${c.specialityName}</p>
                <p class="text-xs mt-1 font-medium ${isFull ? 'text-red-500' : 'text-emerald-600'}">
                    ${isFull ? '🔴 Complet' : `🟢 ${c.availableSlots} place(s)`}
                </p>
            </button>`;
        }).join('');
    }

    function selectTargetClassroom(id, name) {
        state.targetClassroomId = id;
        document.querySelectorAll('.target-classroom-card').forEach(c => {
            const me = parseInt(c.dataset.targetClassroom) === id;
            c.classList.toggle('border-blue-500', me);
            c.classList.toggle('bg-blue-50', me);
            c.classList.toggle('border-gray-200', !me);
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
            <p><span class="font-semibold">Type :</span> ${cfg.icon} ${cfg.label}</p>
            <p><span class="font-semibold">Année cible :</span>
                <span class="bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full text-xs">
                    📅 ${yearLabel}
                </span>
            </p>
            <p><span class="font-semibold">De :</span> ${sourceName}</p>
            <p><span class="font-semibold">Vers :</span> ${targetName}</p>
            <p><span class="font-semibold">Étudiants :</span>
                <span class="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">
                    ${state.selectedStudents.size}
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
        <div class="border border-gray-200 rounded-xl overflow-hidden">
            <div class="flex items-center justify-between bg-gray-50 px-4 py-3 border-b">
                <h3 class="font-semibold text-gray-700 text-sm">Résultats</h3>
                <div class="flex gap-2">
                    <span class="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">✅ ${ok.length}</span>
                    ${err.length ? `<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">❌ ${err.length}</span>` : ''}
                </div>
            </div>
            <div class="divide-y max-h-60 overflow-y-auto">
                ${results.map(r => `
                <div class="flex items-start gap-3 px-4 py-2.5 ${r.success ? 'bg-white' : 'bg-red-50'}">
                    <span>${r.success ? '✅' : '❌'}</span>
                    <div>
                        <p class="text-sm font-medium text-gray-800">${r.studentName || 'ID: ' + r.studentId}</p>
                        ${r.success
                            ? `<p class="text-xs text-gray-500">${r.fromClassroom} → ${r.toClassroom} · ${r.message}</p>`
                            : `<p class="text-xs text-red-500">${r.message}</p>`}
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