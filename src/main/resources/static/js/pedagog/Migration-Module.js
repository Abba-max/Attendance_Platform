/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE MIGRATION ÉTUDIANTS — Dashboard Pédagogue
 *  À insérer dans pedagog-dashboard.js (ou inclure comme module séparé)
 *
 *  Fonctionnalités :
 *  - 3 boutons de type de migration avec logique adaptée
 *  - Vérification si le pédagogue gère un Tronc Commun (bouton visible/masqué)
 *  - Chargement dynamique des classes source/cible selon le type
 *  - Sélection des étudiants avec cases à cocher (tout sélectionner)
 *  - Migration unitaire et en masse
 *  - Affichage des résultats
 * ═══════════════════════════════════════════════════════════════════════════
 */

const MigrationModule = (() => {

    // ── État local ────────────────────────────────────────────────────────
    let state = {
        migrationType: 'LEVEL_PROMOTION',   // Type actif
        sourceClassroomId: null,
        targetClassroomId: null,
        selectedStudents: new Set(),         // Set d'IDs sélectionnés
        hasTroncCommun: false,              // Pédagogue gère-t-il un TC ?
        managedClassrooms: [],              // Classes gérées par le pédagogue
    };

    // ── Labels & icônes pour les types ───────────────────────────────────
    const TYPE_CONFIG = {
        LEVEL_PROMOTION: {
            label: 'Passage de Niveau',
            icon: '⬆️',
            description: 'Promouvoir des étudiants vers le niveau supérieur (même spécialité)',
            color: 'blue',
        },
        SPECIALITY_CHANGE: {
            label: 'Changement de Spécialité',
            icon: '🔀',
            description: 'Transférer des étudiants vers une autre spécialité (même niveau, même année)',
            color: 'purple',
        },
        TRONC_COMMUN: {
            label: 'Tronc Commun → Spécialité',
            icon: '🎓',
            description: 'Orienter les étudiants du Tronc Commun vers une spécialité (ISI, SRT, GE, GC)',
            color: 'emerald',
        },
    };

    // ─────────────────────────────────────────────────────────────────────
    // INITIALISATION — appelée au chargement du dashboard pédagogue
    // ─────────────────────────────────────────────────────────────────────
    async function init() {
        try {
            // Récupérer le contexte du pédagogue (gère-t-il un TC ?)
            const ctx = await apiFetch('/api/migration/pedagog-context');
            state.hasTroncCommun = ctx.hasTroncCommun;
            state.managedClassrooms = ctx.managedClassrooms;

            renderMigrationSection();
            bindEvents();

            // Charger les classes source par défaut
            await loadSourceClassrooms();
        } catch (err) {
            console.error('[Migration] Erreur initialisation :', err);
            showToast('Erreur lors du chargement du module migration.', 'error');
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // RENDU DU PANNEAU PRINCIPAL
    // ─────────────────────────────────────────────────────────────────────
    function renderMigrationSection() {
        const container = document.getElementById('migration-section');
        if (!container) return;

        container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-md p-6 space-y-6">

            <!-- En-tête -->
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span>🏫</span> Migration des Étudiants
                </h2>
                <span class="text-sm text-gray-500">
                    Assistant pédagogique
                    ${state.hasTroncCommun
                        ? '<span class="ml-2 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold">Gère un Tronc Commun</span>'
                        : ''}
                </span>
            </div>

            <!-- ── Étape 1 : Choisir le type de migration ─────────────── -->
            <div>
                <p class="text-sm font-semibold text-gray-600 mb-3">
                    Étape 1 — Choisissez le type de migration
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-${state.hasTroncCommun ? 3 : 2} gap-3" id="migration-type-buttons">
                    ${renderTypeButton('LEVEL_PROMOTION')}
                    ${renderTypeButton('SPECIALITY_CHANGE')}
                    ${state.hasTroncCommun ? renderTypeButton('TRONC_COMMUN') : ''}
                </div>
                <!-- Description du type actif -->
                <p class="mt-2 text-xs text-gray-500 italic" id="migration-type-desc">
                    ${TYPE_CONFIG[state.migrationType].description}
                </p>
            </div>

            <!-- ── Étape 2 : Classe source ────────────────────────────── -->
            <div>
                <p class="text-sm font-semibold text-gray-600 mb-2">
                    Étape 2 — Sélectionner la classe source
                </p>
                <select id="migration-source-select"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">— Choisir une classe source —</option>
                </select>
            </div>

            <!-- ── Étape 3 : Sélection des étudiants ─────────────────── -->
            <div id="migration-students-section" class="hidden">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-semibold text-gray-600">
                        Étape 3 — Sélectionner les étudiants
                    </p>
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
                    <p class="text-center text-gray-400 py-6 text-sm">Chargement...</p>
                </div>
            </div>

            <!-- ── Étape 4 : Classe cible ─────────────────────────────── -->
            <div id="migration-target-section" class="hidden">
                <p class="text-sm font-semibold text-gray-600 mb-2">
                    Étape 4 — Choisir la classe cible
                </p>
                <div id="target-classrooms-grid"
                    class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <!-- Rempli dynamiquement -->
                </div>
            </div>

            <!-- ── Étape 5 : Motif et confirmation ───────────────────── -->
            <div id="migration-confirm-section" class="hidden space-y-3">
                <div>
                    <label class="text-sm font-semibold text-gray-600 block mb-1">
                        Motif de migration (optionnel)
                    </label>
                    <textarea id="migration-reason" rows="2"
                        placeholder="Ex. : Résultats du concours de passage, orientation..."
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400">
                    </textarea>
                </div>

                <!-- Résumé de la migration -->
                <div id="migration-summary"
                    class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                </div>

                <!-- Bouton Migrer -->
                <button id="btn-confirm-migration"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
                    <span id="btn-migrate-icon">🚀</span>
                    <span id="btn-migrate-label">Lancer la migration</span>
                </button>
            </div>

            <!-- ── Résultats ──────────────────────────────────────────── -->
            <div id="migration-results" class="hidden"></div>

        </div>`;
    }

    function renderTypeButton(type) {
        const cfg = TYPE_CONFIG[type];
        const isActive = state.migrationType === type;
        const colors = {
            blue:    { active: 'bg-blue-600 text-white border-blue-600', base: 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50' },
            purple:  { active: 'bg-purple-600 text-white border-purple-600', base: 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50' },
            emerald: { active: 'bg-emerald-600 text-white border-emerald-600', base: 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50' },
        };
        const cls = isActive ? colors[cfg.color].active : colors[cfg.color].base;
        return `
        <button data-migration-type="${type}"
            class="migration-type-btn border-2 rounded-xl px-4 py-3 text-sm font-semibold
                   transition-all flex flex-col items-center gap-1 ${cls}">
            <span class="text-2xl">${cfg.icon}</span>
            <span>${cfg.label}</span>
        </button>`;
    }

    // ─────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────
    function bindEvents() {
        const section = document.getElementById('migration-section');
        if (!section) return;

        // Clic sur un bouton de type
        section.addEventListener('click', async (e) => {
            const typeBtn = e.target.closest('[data-migration-type]');
            if (typeBtn) {
                const newType = typeBtn.dataset.migrationType;
                if (newType !== state.migrationType) {
                    state.migrationType = newType;
                    state.sourceClassroomId = null;
                    state.targetClassroomId = null;
                    state.selectedStudents.clear();
                    renderMigrationSection();
                    bindEvents();
                    await loadSourceClassrooms();
                }
                return;
            }

            // Clic sur une carte de classe cible
            const targetCard = e.target.closest('[data-target-classroom]');
            if (targetCard) {
                selectTargetClassroom(
                    parseInt(targetCard.dataset.targetClassroom),
                    targetCard.dataset.targetName
                );
                return;
            }

            // Bouton confirmer migration
            if (e.target.closest('#btn-confirm-migration')) {
                await executeMigration();
            }
        });

        // Changement de classe source
        section.addEventListener('change', async (e) => {
            if (e.target.id === 'migration-source-select') {
                state.sourceClassroomId = e.target.value ? parseInt(e.target.value) : null;
                state.targetClassroomId = null;
                state.selectedStudents.clear();
                if (state.sourceClassroomId) {
                    await loadStudentsAndTargets();
                } else {
                    hide('migration-students-section');
                    hide('migration-target-section');
                    hide('migration-confirm-section');
                }
            }
            // Checkbox individuelle
            if (e.target.matches('.student-checkbox')) {
                const id = parseInt(e.target.dataset.studentId);
                e.target.checked ? state.selectedStudents.add(id) : state.selectedStudents.delete(id);
                updateSelectedCount();
                updateConfirmSection();
            }
            // Tout sélectionner
            if (e.target.id === 'select-all-students') {
                document.querySelectorAll('.student-checkbox').forEach(cb => {
                    cb.checked = e.target.checked;
                    const id = parseInt(cb.dataset.studentId);
                    e.target.checked ? state.selectedStudents.add(id) : state.selectedStudents.delete(id);
                });
                updateSelectedCount();
                updateConfirmSection();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // CHARGEMENT CLASSES SOURCE
    // ─────────────────────────────────────────────────────────────────────
    async function loadSourceClassrooms() {
        try {
            const data = await apiFetch(
                `/api/migration/available-targets?type=${state.migrationType}`
            );
            const select = document.getElementById('migration-source-select');
            if (!select) return;

            select.innerHTML = '<option value="">— Choisir une classe source —</option>';
            (data.sourceClassrooms || []).forEach(c => {
                const tc = c.troncCommun ? ' [TC]' : '';
                select.innerHTML += `
                    <option value="${c.classId}">
                        ${c.name} — Niv. ${c.level} (${c.specialityName}${tc})
                        — ${c.availableSlots} place(s) libre(s)
                    </option>`;
            });
        } catch (err) {
            console.error('[Migration] Erreur chargement sources :', err);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // CHARGEMENT ÉTUDIANTS + CLASSES CIBLES (quand source choisie)
    // ─────────────────────────────────────────────────────────────────────
    async function loadStudentsAndTargets() {
        show('migration-students-section');
        show('migration-target-section');
        hide('migration-confirm-section');

        const [studentsData, targetsData] = await Promise.all([
            apiFetch(`/api/migration/classroom/${state.sourceClassroomId}/students`),
            apiFetch(`/api/migration/available-targets?type=${state.migrationType}&sourceClassroomId=${state.sourceClassroomId}`)
        ]);

        renderStudentsList(studentsData);
        renderTargetClassrooms(targetsData.targetClassrooms || []);
    }

    function renderStudentsList(students) {
        const list = document.getElementById('students-list');
        if (!list) return;

        if (!students || students.length === 0) {
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

        if (!targets || targets.length === 0) {
            grid.innerHTML = '<p class="col-span-full text-center text-gray-400 py-4 text-sm">Aucune classe cible disponible.</p>';
            return;
        }

        grid.innerHTML = targets.map(c => {
            const isFull = c.availableSlots === 0;
            const isSelected = state.targetClassroomId === c.classId;
            return `
            <button data-target-classroom="${c.classId}" data-target-name="${c.name}"
                class="target-classroom-card border-2 rounded-xl p-3 text-left transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
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

    function selectTargetClassroom(classId, name) {
        state.targetClassroomId = classId;

        // Mettre à jour les cartes visuellement
        document.querySelectorAll('.target-classroom-card').forEach(card => {
            const isThis = parseInt(card.dataset.targetClassroom) === classId;
            card.classList.toggle('border-blue-500', isThis);
            card.classList.toggle('bg-blue-50', isThis);
            card.classList.toggle('border-gray-200', !isThis);
        });

        updateConfirmSection();
    }

    // ─────────────────────────────────────────────────────────────────────
    // SECTION CONFIRMATION
    // ─────────────────────────────────────────────────────────────────────
    function updateConfirmSection() {
        const section = document.getElementById('migration-confirm-section');
        const summary = document.getElementById('migration-summary');
        if (!section || !summary) return;

        const hasStudents = state.selectedStudents.size > 0;
        const hasTarget   = state.targetClassroomId !== null;

        if (!hasStudents || !hasTarget) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');

        const sourceEl = document.getElementById('migration-source-select');
        const sourceName = sourceEl ? sourceEl.options[sourceEl.selectedIndex]?.text : '—';
        const targetCard = document.querySelector(`[data-target-classroom="${state.targetClassroomId}"]`);
        const targetName = targetCard ? targetCard.dataset.targetName : '—';
        const cfg = TYPE_CONFIG[state.migrationType];

        summary.innerHTML = `
        <div class="space-y-1">
            <p><span class="font-semibold">Type :</span> ${cfg.icon} ${cfg.label}</p>
            <p><span class="font-semibold">Source :</span> ${sourceName}</p>
            <p><span class="font-semibold">Destination :</span> ${targetName}</p>
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

    // ─────────────────────────────────────────────────────────────────────
    // EXÉCUTION DE LA MIGRATION
    // ─────────────────────────────────────────────────────────────────────
    async function executeMigration() {
        const btn = document.getElementById('btn-confirm-migration');
        const label = document.getElementById('btn-migrate-label');
        const icon = document.getElementById('btn-migrate-icon');
        const reason = document.getElementById('migration-reason')?.value?.trim() || '';

        if (!state.targetClassroomId || state.selectedStudents.size === 0) {
            showToast('Veuillez sélectionner des étudiants et une classe cible.', 'warning');
            return;
        }

        // État chargement
        btn.disabled = true;
        icon.textContent = '⏳';
        label.textContent = 'Migration en cours...';

        try {
            const payload = {
                studentIds: [...state.selectedStudents],
                fromClassroomId: state.sourceClassroomId,
                toClassroomId: state.targetClassroomId,
                migrationType: state.migrationType,
                autoNextLevel: false,
                reason: reason,
            };

            const results = await apiFetch('/api/migration/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            renderResults(results);

            // Réinitialiser la sélection
            state.selectedStudents.clear();
            state.targetClassroomId = null;
            updateSelectedCount();
            hide('migration-confirm-section');

            // Recharger la liste des étudiants
            if (state.sourceClassroomId) await loadStudentsAndTargets();

        } catch (err) {
            console.error('[Migration] Erreur :', err);
            showToast('Erreur lors de la migration : ' + (err.message || 'Inconnue'), 'error');
        } finally {
            btn.disabled = false;
            icon.textContent = '🚀';
            label.textContent = 'Lancer la migration';
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // RENDU DES RÉSULTATS
    // ─────────────────────────────────────────────────────────────────────
    function renderResults(results) {
        const container = document.getElementById('migration-results');
        if (!container) return;

        container.classList.remove('hidden');

        const success = results.filter(r => r.success);
        const failures = results.filter(r => !r.success);

        container.innerHTML = `
        <div class="border border-gray-200 rounded-xl overflow-hidden">
            <div class="flex items-center justify-between bg-gray-50 px-4 py-3 border-b">
                <h3 class="font-semibold text-gray-700 text-sm">Résultats de la migration</h3>
                <div class="flex gap-2">
                    <span class="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        ✅ ${success.length} réussis
                    </span>
                    ${failures.length ? `
                    <span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        ❌ ${failures.length} échoués
                    </span>` : ''}
                </div>
            </div>
            <div class="divide-y max-h-60 overflow-y-auto">
                ${results.map(r => `
                <div class="flex items-center gap-3 px-4 py-2.5 ${r.success ? 'bg-white' : 'bg-red-50'}">
                    <span>${r.success ? '✅' : '❌'}</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-800">${r.studentName || 'ID: ' + r.studentId}</p>
                        ${r.success
                            ? `<p class="text-xs text-gray-500">${r.fromClassroom} → ${r.toClassroom}</p>`
                            : `<p class="text-xs text-red-500">${r.message}</p>`
                        }
                    </div>
                </div>`).join('')}
            </div>
        </div>`;

        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ─────────────────────────────────────────────────────────────────────
    // UTILITAIRES
    // ─────────────────────────────────────────────────────────────────────
    async function apiFetch(url, options = {}) {
        const res = await fetch(url, {
            ...options,
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || `HTTP ${res.status}`);
        }
        return res.json();
    }

    function show(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }

    function hide(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }

    function showToast(message, type = 'info') {
        // Utilise la fonction toast existante du dashboard, ou fallback
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else if (typeof window.toast === 'function') {
            window.toast(message, type);
        } else {
            console.warn('[Migration Toast]', type, message);
        }
    }

    // ── API publique ──────────────────────────────────────────────────────
    return { init };

})();

// ─────────────────────────────────────────────────────────────────────────
// Appel automatique si un conteneur #migration-section existe dans la page
// ─────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('migration-section')) {
        MigrationModule.init();
    }
});