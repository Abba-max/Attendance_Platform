document.addEventListener('DOMContentLoaded', function () {
    console.log('Pedagog Dashboard initializing...');

    initializeNavigation();
    initializeMobileMenu();
    initializeProfileDropdown();
    initializeNotifications();

    // Initialise date display for the timetable
    updateTTDates();

    // Default section
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') || 'dashboard';
    const navItem = document.querySelector(`[data-section="${section}"]`);
    if (navItem) navItem.click();

    // Initialise custom select dropdowns
    setTimeout(() => {
        initializeTomSelects();
    }, 300);

    setTimeout(() => {
        if (typeof applyStudentFilters === 'function') applyStudentFilters();
        if (typeof applyCourseFilters === 'function') applyCourseFilters();
    }, 200);
});

window.initializeTomSelects = function() {
    window.tsInstances = {};
    const selectIds = [
        'migrationFromClassSelect',
        'migrationToClassSelect',
        'classroomSelect',
        'bulkClassroomId',
        'emailClassSelect',
        'specFilter',
        'emailSpecSelect',
        'hubClassFilter',
        'planningClassroomId'
    ];

    selectIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && typeof TomSelect !== 'undefined') {
            window.tsInstances[id] = new TomSelect(el, {
                create: false,
                sortField: { field: "text", direction: "asc" },
                controlClass: 'ts-control !bg-slate-50 !border !border-slate-200 !rounded-xl !px-4 !py-3 !text-sm !font-bold !text-slate-700 !outline-none !shadow-sm',
                dropdownClass: 'ts-dropdown !border !border-slate-200 !rounded-xl !shadow-lg !overflow-hidden !text-sm !font-medium',
                optionClass: 'option !p-3 hover:!bg-emerald-50 hover:!text-emerald-700 !cursor-pointer',
                itemClass: 'item',
            });
        }
    });
};

/**
 * Sets default dates for the timetable: Monday-Saturday of current week.
 */
function updateTTDates() {
    var startInput = document.getElementById('ttStartDate');
    var endInput   = document.getElementById('ttEndDate');
    if (!startInput) return;
    if (startInput.value) return;
    var today   = new Date();
    var day     = today.getDay();
    var diffToMon = (day === 0) ? -6 : 1 - day;
    var monday  = new Date(today);
    monday.setDate(today.getDate() + diffToMon);
    var saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    var fmt = function(d) { return d.toISOString().split('T')[0]; };
    startInput.value = fmt(monday);
    if (endInput) endInput.value = fmt(saturday);
    if (typeof syncTTDates === 'function') syncTTDates('start');
}

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');

            // Update nav UI
            navItems.forEach(nav => {
                nav.classList.remove('active', 'bg-[#00B0FF]', 'text-white');
                nav.classList.add('text-gray-700');
            });
            this.classList.add('active', 'bg-[#00B0FF]', 'text-white');
            this.classList.remove('text-gray-700');

            // Show section
            sections.forEach(section => {
                section.classList.add('hidden');
                if (section.id === `section-${sectionId}`) {
                    section.classList.remove('hidden');
                }
            });

            // Special handling for sections
            if (sectionId === 'planning') {
                loadPlanning();
            }
            if (sectionId === 'sessions') {
                if (typeof loadSessionsMonitor === 'function') loadSessionsMonitor();
            }
            if (sectionId === 'justifications') {
                if (typeof loadJustifications === 'function') loadJustifications();
            }
            if (sectionId === 'attendance') {
                const clsFilter = document.getElementById('hubClassFilter');
                if (clsFilter && clsFilter.options.length <= 1) {
                    if (typeof loadHubClasses === 'function') loadHubClasses();
                }
            }
            if (sectionId === 'stats') {
                loadStatsWeeks();
                loadAttendanceStats();
            }
            if (sectionId === 'migration') {
                if (typeof MigrationModule !== 'undefined' && typeof MigrationModule.init === 'function') {
                    MigrationModule.init();
                } else if (typeof loadMigrationData === 'function') {
                    loadMigrationData();
                }
            }


            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('section', sectionId);
            window.history.pushState({}, '', url);
        });
    });
}

function initializeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    window.toggleMobileMenu = function () {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    };
}

function initializeProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const profileMenu = document.getElementById('profile-menu');

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            profileMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', function () {
            profileMenu.classList.add('hidden');
        });
    }
}
// Student Modal Management
window.openStudentModal = function () {
    const modal = document.getElementById('studentModal');
    const content = document.getElementById('studentModalContent');

    // Reset speciality filter
    const specSelect = document.getElementById('specFilter');
    if (specSelect) specSelect.value = "";
    filterClassrooms('', 'classroomSelect');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeStudentModal = function () {
    const modal = document.getElementById('studentModal');
    const content = document.getElementById('studentModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

// Bulk Import State
let currentBulkImportMode = 'STUDENT';

// Bulk Import Modal Management
window.openBulkImportModal = function (mode = 'STUDENT') {
    currentBulkImportMode = mode;
    const modal = document.getElementById('bulkImportModal');
    const content = document.getElementById('bulkImportModalContent');
    const title = document.getElementById('bulkImportModalTitle');
    const instruction = document.getElementById('bulkImportInstructions');
    const classroomRow = document.getElementById('classroomSelectorRow');
    const courseRow = document.getElementById('courseSelectorRow');
    const header = document.getElementById('bulkImportHeader');
    const banner = document.getElementById('bulkInstructionBanner');

    // Reset steps
    document.getElementById('pedagogBulkStep1').classList.remove('hidden');
    document.getElementById('pedagogBulkPreview').classList.add('hidden');
    document.getElementById('pedagogBulkResults').classList.add('hidden');

    if (mode === 'STUDENT') {
        title.textContent = "Bulk Student Import";
        instruction.innerHTML = 'Ensure your CSV has exactly these 4 columns in order:<br><code class="bg-emerald-100/50 px-1.5 py-0.5 rounded text-emerald-800 font-bold">firstName, lastName, email, matricule</code>';
        classroomRow.classList.remove('hidden');
        courseRow.classList.add('hidden');
        header.className = "p-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white relative";
        banner.className = "bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex gap-4 transition-colors duration-300";
    } else {
        title.textContent = "Bulk Course Import";
        instruction.innerHTML = 'Ensure your CSV has these 2 columns in order:<br><code class="bg-blue-100/50 px-1.5 py-0.5 rounded text-blue-800 font-bold">courseName, code</code> <span class="text-[9px] opacity-70">(Hours is optional)</span>';
        classroomRow.classList.add('hidden');
        courseRow.classList.remove('hidden');
        header.className = "p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative";
        banner.className = "bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 transition-colors duration-300";
    }

    // Reset fields
    const specSelect = modal.querySelector('select[onchange*="bulkClassroomId"]');
    if (specSelect) specSelect.value = "";
    document.getElementById('bulkClassroomId').value = "";
    document.getElementById('bulkCourseSpecId').value = "";
    document.getElementById('bulkCourseLevel').value = "";
    document.getElementById('studentCsvFile').value = "";
    document.getElementById('fileNameDisplay').textContent = "Drop CSV file here";
    document.getElementById('fileNameDisplay').classList.remove('text-emerald-600', 'text-blue-600');

    // Show all classrooms initially
    filterClassrooms('', 'bulkClassroomId');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeBulkImportModal = function () {
    const modal = document.getElementById('bulkImportModal');
    const content = document.getElementById('bulkImportModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.updateFileName = function (input) {
    const display = document.getElementById('fileNameDisplay');
    const colorClass = currentBulkImportMode === 'STUDENT' ? 'text-emerald-600' : 'text-blue-600';

    if (input.files && input.files.length > 0) {
        display.textContent = input.files[0].name;
        display.classList.add(colorClass, 'font-black');
    } else {
        display.textContent = 'Drop CSV file here';
        display.classList.remove('text-emerald-600', 'text-blue-600', 'font-black');
    }
};

// Cascading Filter for Student/Bulk Modals
window.filterClassrooms = function (specId, targetId = 'classroomSelect') {
    const select = document.getElementById(targetId);
    if (!select) return;

    const options = select.querySelectorAll('option');

    // Reset selection if not matching anymore
    select.value = "";

    options.forEach(option => {
        if (option.value === "") return; // Skip placeholder

        const optionSpecId = option.getAttribute('data-spec');
        if (!specId || optionSpecId === specId) {
            option.style.display = "";
            option.disabled = false;
        } else {
            option.style.display = "none";
            option.disabled = true;
        }
    });

    // Native TomSelect Sync to update custom dropdown DOM
    if (window.tsInstances && window.tsInstances[targetId]) {
        window.tsInstances[targetId].sync();
    }
};

function displayValidationErrors(form, errorData) {
    // Clear previous errors
    form.querySelectorAll('.validation-error').forEach(el => el.remove());
    form.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));

    if (errorData && errorData.details) {
        let hasErrors = false;
        for (const [field, message] of Object.entries(errorData.details)) {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('border-red-500');
                const errorDiv = document.createElement('div');
                errorDiv.className = 'validation-error text-red-500 text-xs mt-1';
                errorDiv.innerText = message;
                input.parentNode.appendChild(errorDiv);
                hasErrors = true;
            }
        }
        return hasErrors;
    }
    return false;
}

function clearValidationErrors(form) {
    if(!form) return;
    form.querySelectorAll('.validation-error').forEach(el => el.remove());
    form.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
}

// Individual Student Creation
window.handleCreateStudent = async function (event) {
    event.preventDefault();
    const form = event.target;
    const loader = document.getElementById('studentSubmitLoader');
    const submitBtn = form.querySelector('button[type="submit"]');

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Convert status to boolean if present
    data.isActive = true;

    loader.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const response = await fetch('/api/pedagog/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification('Student registered successfully!', 'success');
            form.reset();
            clearValidationErrors(form);
            closeStudentModal();
            window.location.reload(); // Refresh to see stats update
        } else {
            const errorData = await response.json();
            if (displayValidationErrors(form, errorData)) {
                showNotification('Validation failed. Please check the highlighted fields.', 'error');
            } else {
                showNotification(errorData.message || errorData.error || 'Failed to register student', 'error');
            }
        }
    } catch (error) {
        console.error('Error creating student:', error);
        showNotification('An unexpected error occurred.', 'error');
    } finally {
        loader.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = false;
    }
};

window.startBulkImport = async function () {
    const fileInput = document.getElementById('studentCsvFile');
    const classroomId = document.getElementById('bulkClassroomId').value;
    const courseSpecId = document.getElementById('bulkCourseSpecId').value;
    const courseLevel = document.getElementById('bulkCourseLevel').value;
    const loader = document.getElementById('bulkImportLoader');
    const startBtn = document.getElementById('pedagogStartImportBtn');

    if (currentBulkImportMode === 'STUDENT' && !classroomId) {
        showNotification('Please select a target classroom', 'warning');
        return;
    }

    if (currentBulkImportMode === 'COURSE') {
        if (!courseSpecId) { showNotification('Please select a target speciality', 'warning'); return; }
        if (!courseLevel) { showNotification('Please select a target level', 'warning'); return; }
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('Please select a CSV file', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    if (currentBulkImportMode === 'STUDENT') formData.append('classroomId', classroomId);
    formData.append('dryRun', 'true');

    loader.classList.remove('hidden');
    startBtn.disabled = true;

    try {
        let url = currentBulkImportMode === 'STUDENT'
            ? '/api/pedagog/students/bulk-import?dryRun=true'
            : `/api/pedagog/courses/bulk-import?dryRun=true&specialityId=${courseSpecId}&level=${courseLevel}`;

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            showPedagogPreview(result);
        } else {
            showNotification('Failed to parse bulk import file.', 'error');
        }
    } catch (error) {
        console.error('Error during bulk import preview:', error);
        showNotification('An error occurred during preview.', 'error');
    } finally {
        loader.classList.add('hidden');
        startBtn.disabled = false;
    }
};

function showPedagogPreview(result) {
    document.getElementById('pedagogBulkStep1').classList.add('hidden');
    document.getElementById('pedagogBulkPreview').classList.remove('hidden');

    const head = document.getElementById('pedagogPreviewHead');
    const body = document.getElementById('pedagogPreviewBody');
    const errorSection = document.getElementById('pedagogBulkErrors');
    const errorContainer = document.getElementById('pedagogErrorContainer');

    // Set Headers
    if (currentBulkImportMode === 'STUDENT') {
        head.innerHTML = '<tr><th class="px-3 py-2 font-bold text-slate-600">First Name</th><th class="px-3 py-2 font-bold text-slate-600">Last Name</th><th class="px-3 py-2 font-bold text-slate-600">Email</th><th class="px-3 py-2 font-bold text-slate-600">Matricule</th></tr>';
        body.innerHTML = result.previewData.map(row => `
            <tr>
                <td class="px-3 py-2 font-medium">${escapeHtml(row.firstName || '')}</td>
                <td class="px-3 py-2">${escapeHtml(row.lastName || '')}</td>
                <td class="px-3 py-2 text-slate-500">${escapeHtml(row.email || '')}</td>
                <td class="px-3 py-2 font-black tabular-nums text-slate-400">${escapeHtml(row.matricule || '')}</td>
            </tr>
        `).join('');
    } else {
        head.innerHTML = '<tr><th class="px-3 py-2 font-bold text-slate-600">Course</th><th class="px-3 py-2 font-bold text-slate-600">Code</th><th class="px-3 py-2 font-bold text-slate-600">Hours</th><th class="px-3 py-2 font-bold text-slate-600">Level</th></tr>';
        body.innerHTML = result.previewData.map(row => `
            <tr>
                <td class="px-3 py-2 font-medium">${escapeHtml(row.courseName || '')}</td>
                <td class="px-3 py-2 text-blue-600 font-bold">${escapeHtml(row.code || '')}</td>
                <td class="px-3 py-2">${escapeHtml(row.totalHours || '')}h</td>
                <td class="px-3 py-2">L${escapeHtml(row.level || '')}</td>
            </tr>
        `).join('');
    }

    if (result.previewData.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="px-3 py-8 text-center text-slate-400 italic">No valid rows found to preview.</td></tr>';
    }

    // Handle Errors
    if (result.failureCount > 0) {
        errorSection.classList.remove('hidden');
        errorContainer.innerHTML = result.errors.map(err => `
            <div class="flex gap-2 mb-1">
                <span class="font-bold min-w-[30px]">Row ${err.rowNumber}:</span>
                <span class="text-rose-700">${escapeHtml(err.errorMessage)}</span>
            </div>
        `).join('');
    } else {
        errorSection.classList.add('hidden');
    }
}

window.backToPedagogUpload = function() {
    document.getElementById('pedagogBulkPreview').classList.add('hidden');
    document.getElementById('pedagogBulkStep1').classList.remove('hidden');
};

window.confirmBulkImport = async function() {
    const fileInput = document.getElementById('studentCsvFile');
    const classroomId = document.getElementById('bulkClassroomId').value;
    const confirmBtn = document.getElementById('pedagogConfirmBtn');

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    if (currentBulkImportMode === 'STUDENT') formData.append('classroomId', classroomId);
    formData.append('dryRun', 'false');

    try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...';

        const courseSpecId = document.getElementById('bulkCourseSpecId').value;
        const courseLevel = document.getElementById('bulkCourseLevel').value;

        const url = currentBulkImportMode === 'STUDENT'
            ? '/api/pedagog/students/bulk-import?dryRun=false'
            : `/api/pedagog/courses/bulk-import?dryRun=false&specialityId=${courseSpecId}&level=${courseLevel}`;

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            document.getElementById('pedagogBulkPreview').classList.add('hidden');
            document.getElementById('pedagogBulkResults').classList.remove('hidden');
            document.getElementById('pedagogFinalSummary').textContent = `Success: ${result.successCount}, Failed: ${result.failureCount}`;
        } else {
            showNotification('Final import failed.', 'error');
        }
    } catch (error) {
        console.error('Final Import Error:', error);
        showNotification('An error occurred during final import.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm & Save';
    }
};

window.downloadBulkTemplate = function() {
    let headers, example, filename;
    if (currentBulkImportMode === 'STUDENT') {
        headers = "firstName,lastName,email,matricule\n";
        example = "Alice,Johnson,alice@example.com,MAT001\nBob,Wilson,bob@example.com,MAT002";
        filename = "student_import_template.csv";
    } else {
        headers = "courseName,code,totalHours\n";
        example = "Data Structures,CS201,60\nAlgorithms,CS202,45";
        filename = "course_import_template.csv";
    }

    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};


// Course Modal Management
// Teacher Selection State for Course Modal
let selectedTeachers = [];
let availableTeachers = [];

window.openCourseModal = async function () {
    const modal = document.getElementById('courseModal');
    const content = document.getElementById('courseModalContent');
    const form = document.getElementById('createCourseForm');

    // Reset form for fresh creation
    form.reset();
    form.querySelector('[name="courseId"]').value = '';
    document.getElementById('courseModalTitle').textContent = 'Create New Course';
    document.getElementById('cfSaveBtn').innerHTML = '<span id="cfBtnText">Save Course</span><div id="courseSubmitLoader" class="hidden" style="..."></div>';

    // Fetch teachers if not already loaded
    if (availableTeachers.length === 0) {
        await fetchTeachers();
    }

    renderTeacherOptions();
    resetTeacherSelection();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeCourseModal = function () {
    const modal = document.getElementById('courseModal');
    const content = document.getElementById('courseModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

async function fetchTeachers() {
    try {
        const response = await fetch('/api/pedagog/teachers');
        if (response.ok) {
            availableTeachers = await response.json();
        }
    } catch (error) {
        console.error('Error fetching teachers:', error);
    }
}

window.toggleTeacherDropdown = function () {
    const drop = document.getElementById('cfTeacherDrop');
    drop.classList.toggle('hidden');
};

function renderTeacherOptions() {
    const container = document.getElementById('cfTeacherOptions');
    if (!container) return;

    if (availableTeachers.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-xs text-slate-400">No teachers found</div>';
        return;
    }

    container.innerHTML = availableTeachers.map(teacher => {
        const isSelected = selectedTeachers.some(t => t.userId === teacher.userId);
        return `
            <div onclick="selectTeacher(${teacher.userId})"
                class="px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-blue-50 text-blue-600' : ''}">
                <span>${teacher.username}</span>
                ${isSelected ? '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>' : ''}
            </div>
        `;
    }).join('');
}

window.selectTeacher = function (id) {
    const teacher = availableTeachers.find(t => t.userId === id);
    if (!teacher) return;

    const index = selectedTeachers.findIndex(t => t.userId === id);
    if (index === -1) {
        selectedTeachers.push(teacher);
    } else {
        selectedTeachers.splice(index, 1);
    }

    updateTeacherUI();
    renderTeacherOptions();
};

function updateTeacherUI() {
    const wrapper = document.getElementById('cfTeacherChips');
    const placeholder = document.getElementById('cfTeacherPlaceholder');
    const hiddenInput = document.getElementById('cfTeacherIds');

    if (selectedTeachers.length > 0) {
        placeholder.classList.add('hidden');
        wrapper.innerHTML = selectedTeachers.map(t => `
            <div class="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                ${t.username}
                <button type="button" onclick="event.stopPropagation(); selectTeacher(${t.userId})" class="hover:text-blue-900 transition">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `).join('');
        hiddenInput.value = JSON.stringify(selectedTeachers.map(t => t.userId));
    } else {
        placeholder.classList.remove('hidden');
        wrapper.innerHTML = '';
        hiddenInput.value = '';
    }
}

function resetTeacherSelection() {
    selectedTeachers = [];
    updateTeacherUI();
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('cfTeacherWrap');
    const drop = document.getElementById('cfTeacherDrop');
    if (wrap && drop && !wrap.contains(e.target) && !drop.contains(e.target)) {
        drop.classList.add('hidden');
    }
});

// Student Pagination State
let currentStudentPage = 1;
const studentsPerPage = 10;
let filteredStudentRows = [];

window.applyStudentFilters = function () {
    const specName = document.getElementById('studentSpecFilter')?.value || '';
    const className = document.getElementById('studentClassFilter')?.value || '';
    const levelValue = document.getElementById('studentLevelFilter')?.value || '';
    const searchText = document.getElementById('studentSearch')?.value.toLowerCase() || '';

    const allRows = document.querySelectorAll('.student-row');
    filteredStudentRows = [];

    allRows.forEach(row => {
        const rowSpec = row.getAttribute('data-spec') || '';
        const rowClass = row.getAttribute('data-class') || '';
        const rowLevel = row.getAttribute('data-level') || '';
        const rowName = (row.getAttribute('data-name') || '').toLowerCase();
        const rowEmail = (row.getAttribute('data-email') || '').toLowerCase();
        const rowMatricule = (row.getAttribute('data-matricule') || '').toLowerCase();

        const match = (!specName || rowSpec === specName)
            && (!className || rowClass === className)
            && (!levelValue || rowLevel === levelValue)
            && (!searchText || rowName.includes(searchText) || rowEmail.includes(searchText) || rowMatricule.includes(searchText));

        if (match) {
            filteredStudentRows.push(row);
        } else {
            row.style.display = 'none';
        }
    });

    currentStudentPage = 1;
    renderStudentPagination();
};

window.renderStudentPagination = function () {
    const totalPages = Math.ceil(filteredStudentRows.length / studentsPerPage);
    const startIdx = (currentStudentPage - 1) * studentsPerPage;
    const endIdx = startIdx + studentsPerPage;

    filteredStudentRows.forEach((row, idx) => {
        if (idx >= startIdx && idx < endIdx) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    let tfoot = document.getElementById('studentPaginationFooter');
    if (!tfoot) {
        const table = document.querySelector('#studentTableBody').parentElement;
        tfoot = document.createElement('tfoot');
        tfoot.id = 'studentPaginationFooter';
        table.appendChild(tfoot);
    }

    if (totalPages > 1) {
        let html = '<tr><td colspan="4" class="px-6 py-4"><div class="flex justify-between items-center"><div class="text-xs text-slate-500">Showing ' + (startIdx + 1) + ' to ' + Math.min(endIdx, filteredStudentRows.length) + ' of ' + filteredStudentRows.length + ' entries</div><div class="inline-flex rounded-md shadow-sm">';

        const prevDisabled = currentStudentPage === 1 ? 'disabled cursor-not-allowed opacity-50' : '';
        html += '<button onclick="changeStudentPage(' + (currentStudentPage - 1) + ')" class="px-3 py-1 border border-slate-200 bg-white text-xs text-slate-600 rounded-l-md hover:bg-slate-50 ' + prevDisabled + '" ' + (currentStudentPage === 1 ? 'disabled' : '') + '>Previous</button>';

        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === currentStudentPage ? 'bg-blue-50 text-blue-600 font-bold border-blue-500 z-10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';
            html += '<button onclick="changeStudentPage(' + i + ')" class="px-3 py-1 border -ml-px text-xs ' + activeClass + '">' + i + '</button>';
        }

        const nextDisabled = currentStudentPage === totalPages ? 'disabled cursor-not-allowed opacity-50' : '';
        html += '<button onclick="changeStudentPage(' + (currentStudentPage + 1) + ')" class="px-3 py-1 border border-slate-200 -ml-px bg-white text-xs text-slate-600 rounded-r-md hover:bg-slate-50 ' + nextDisabled + '" ' + (currentStudentPage === totalPages ? 'disabled' : '') + '>Next</button>';

        html += '</div></div></td></tr>';
        tfoot.innerHTML = html;
    } else {
        tfoot.innerHTML = '';
    }
};

window.changeStudentPage = function (page) {
    currentStudentPage = page;
    renderStudentPagination();
};

// Course Pagination State
let currentCoursePage = 1;
const coursesPerPage = 10;
let filteredCourseRows = [];

window.applyCourseFilters = function () {
    const specName = document.getElementById('courseSpecFilter').value;
    const levelValue = document.getElementById('courseLevelFilter').value;
    const searchText = document.getElementById('courseSearch').value.toLowerCase();
    const creditValue = document.getElementById('courseCreditFilter').value;

    const rows = document.querySelectorAll('.course-row');
    filteredCourseRows = [];

    rows.forEach(row => {
        const rowSpec = row.getAttribute('data-spec');
        const rowLevel = row.getAttribute('data-level');
        const rowName = (row.getAttribute('data-name') || '').toLowerCase();
        const rowCode = (row.getAttribute('data-code') || '').toLowerCase();
        const rowCredit = row.getAttribute('data-credit');

        const specMatch = !specName || rowSpec === specName;
        const levelMatch = !levelValue || rowLevel === levelValue;
        const creditMatch = !creditValue || rowCredit === creditValue;
        const searchMatch = !searchText || rowName.includes(searchText) || rowCode.includes(searchText);

        if (specMatch && levelMatch && creditMatch && searchMatch) {
            filteredCourseRows.push(row);
        } else {
            row.style.display = "none";
        }
    });

    currentCoursePage = 1;
    renderCoursePagination();
};

window.renderCoursePagination = function () {
    const totalPages = Math.ceil(filteredCourseRows.length / coursesPerPage);
    const startIdx = (currentCoursePage - 1) * coursesPerPage;
    const endIdx = startIdx + coursesPerPage;

    filteredCourseRows.forEach((row, idx) => {
        if (idx >= startIdx && idx < endIdx) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    let tfoot = document.getElementById('coursePaginationFooter');
    if (!tfoot) {
        const table = document.querySelector('.course-row').closest('table');
        tfoot = document.createElement('tfoot');
        tfoot.id = 'coursePaginationFooter';
        table.appendChild(tfoot);
    }

    if (totalPages > 1) {
        let html = '<tr><td colspan="4" class="px-6 py-4"><div class="flex justify-between items-center"><div class="text-xs text-slate-500">Showing ' + (startIdx + 1) + ' to ' + Math.min(endIdx, filteredCourseRows.length) + ' of ' + filteredCourseRows.length + ' entries</div><div class="inline-flex rounded-md shadow-sm">';

        const prevDisabled = currentCoursePage === 1 ? 'disabled cursor-not-allowed opacity-50' : '';
        html += '<button onclick="changeCoursePage(' + (currentCoursePage - 1) + ')" class="px-3 py-1 border border-slate-200 bg-white text-xs text-slate-600 rounded-l-md hover:bg-slate-50 ' + prevDisabled + '" ' + (currentCoursePage === 1 ? 'disabled' : '') + '>Previous</button>';

        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === currentCoursePage ? 'bg-blue-50 text-blue-600 font-bold border-blue-500 z-10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';
            html += '<button onclick="changeCoursePage(' + i + ')" class="px-3 py-1 border -ml-px text-xs ' + activeClass + '">' + i + '</button>';
        }

        const nextDisabled = currentCoursePage === totalPages ? 'disabled cursor-not-allowed opacity-50' : '';
        html += '<button onclick="changeCoursePage(' + (currentCoursePage + 1) + ')" class="px-3 py-1 border border-slate-200 -ml-px bg-white text-xs text-slate-600 rounded-r-md hover:bg-slate-50 ' + nextDisabled + '" ' + (currentCoursePage === totalPages ? 'disabled' : '') + '>Next</button>';

        html += '</div></div></td></tr>';
        tfoot.innerHTML = html;
    } else {
        tfoot.innerHTML = '';
    }
};

window.changeCoursePage = function (page) {
    currentCoursePage = page;
    renderCoursePagination();
};

window.editCourse = async function (courseId) {
    try {
        const response = await fetch(`/api/pedagog/courses/${courseId}`);
        if (!response.ok) throw new Error('Failed to fetch course details');

        const course = await response.json();

        // Open modal
        await openCourseModal();

        // Populate form
        const form = document.getElementById('createCourseForm');
        form.querySelector('[name="courseId"]').value = course.courseId;
        form.querySelector('[name="courseName"]').value = course.courseName;
        form.querySelector('[name="code"]').value = course.code;
        form.querySelector('[name="credits"]').value = course.credits;
        form.querySelector('[name="totalHours"]').value = course.totalHours;
        form.querySelector('[name="level"]').value = course.level;
        form.querySelector('[name="description"]').value = course.description;
        form.querySelector('[name="specialityId"]').value = course.specialityId;

        // Update Modal Title and Button
        document.getElementById('courseModalTitle').textContent = 'Update Course';
        document.getElementById('cfSaveBtn').innerHTML = `
            <span id="courseSubmitLoader" class="hidden"><svg class="animate-spin h-5 w-5 mr-3 ..." viewBox="0 0 24 24"></svg></span>
            Update Course
        `;

        // Populate teachers
        if (course.teacherIds && availableTeachers.length > 0) {
            selectedTeachers = availableTeachers.filter(t => course.teacherIds.includes(t.userId));
        } else {
            selectedTeachers = [];
        }

        updateTeacherUI();
        renderTeacherOptions();

    } catch (error) {
        console.error('Error fetching course:', error);
        showNotification('Failed to load course details', 'error');
    }
};

window.handleCreateCourse = async function (event) {
    event.preventDefault();
    const form = event.target;
    const loader = document.getElementById('courseSubmitLoader');
    const submitBtn = document.getElementById('cfSaveBtn');

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const courseId = data.courseId;

    // Parse teacherIds
    if (data.teacherIds) {
        try {
            data.teacherIds = JSON.parse(data.teacherIds);
        } catch (e) {
            data.teacherIds = [];
        }
    } else {
        data.teacherIds = [];
    }

    // Convert numeric fields
    if (data.credits) data.credits = parseInt(data.credits);
    if (data.totalHours) data.totalHours = parseInt(data.totalHours);
    if (data.level) data.level = parseInt(data.level);
    if (data.specialityId) data.specialityId = parseInt(data.specialityId);

    loader.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
        const url = courseId ? `/api/pedagog/courses/${courseId}` : '/api/pedagog/courses';
        const method = courseId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification(courseId ? 'Course updated successfully!' : 'Course created successfully!', 'success');
            form.reset();
            clearValidationErrors(form);
            resetTeacherSelection();
            closeCourseModal();
            window.location.reload();
        } else {
            const error = await response.json();
            if (displayValidationErrors(form, error)) {
                showNotification('Validation failed. Please check the highlighted fields.', 'error');
            } else {
                showNotification(error.message || error.error || 'Failed to save course', 'error');
            }
        }
    } catch (error) {
        console.error('Error saving course:', error);
        showNotification('An unexpected error occurred.', 'error');
    } finally {
        loader.classList.add('hidden');
        submitBtn.disabled = false;
    }
};

function showNotification(message, type = 'info') {
    // Remove any existing notification
    const existing = document.getElementById('tt-toast');
    if (existing) existing.remove();

    const icons = {
        success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
        error:   `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
        warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
        info:    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/></svg>`
    };
    const palettes = {
        success: { bg: '#ECFDF5', border: '#10B981', icon: '#10B981', title: '#065F46', msg: '#047857' },
        error:   { bg: '#FEF2F2', border: '#EF4444', icon: '#EF4444', title: '#7F1D1D', msg: '#B91C1C' },
        warning: { bg: '#FFFBEB', border: '#F59E0B', icon: '#F59E0B', title: '#78350F', msg: '#B45309' },
        info:    { bg: '#EFF6FF', border: '#3B82F6', icon: '#3B82F6', title: '#1E3A5F', msg: '#1D4ED8' }
    };
    const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };
    const p = palettes[type] || palettes.info;

    const toast = document.createElement('div');
    toast.id = 'tt-toast';
    toast.setAttribute('role', 'alert');
    toast.style.cssText = [
        'position:fixed', 'top:80px', 'right:24px', 'z-index:9999',
        `background:${p.bg}`, `border:1.5px solid ${p.border}`,
        'border-radius:14px', 'box-shadow:0 8px 32px rgba(0,0,0,0.13)',
        'padding:16px 20px', 'display:flex', 'align-items:flex-start', 'gap:12px',
        'min-width:300px', 'max-width:400px',
        'transform:translateX(440px)', 'opacity:0',
        'transition:transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.35s ease'
    ].join(';');

    toast.innerHTML = `
        <span style="color:${p.icon};flex-shrink:0;margin-top:1px">${icons[type] || icons.info}</span>
        <div style="flex:1;min-width:0">
            <p style="margin:0 0 2px;font-weight:700;font-size:13px;color:${p.title}">${titles[type] || 'Notice'}</p>
            <p style="margin:0;font-size:12.5px;color:${p.msg};line-height:1.45">${message}</p>
        </div>
        <button onclick="this.closest('#tt-toast').remove()" style="color:${p.icon};background:none;border:none;cursor:pointer;padding:0;line-height:1;flex-shrink:0" aria-label="Dismiss">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>`;

    document.body.appendChild(toast);
    // Slide in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });
    // Auto-dismiss
    const delay = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
        toast.style.transform = 'translateX(440px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, delay);
}

// ==========================================
// TIMETABLE MANAGEMENT LOGIC
// ==========================================

window.filterTTClassrooms = function () {
    const specId = document.getElementById('ttSpecSelect').value;
    const level = document.getElementById('ttLevelSelect').value;
    const select = document.getElementById('ttClassSelect');
    const options = select.querySelectorAll('option');

    select.value = "";
    options.forEach(opt => {
        if (!opt.value) return;
        const optSpec = opt.getAttribute('data-spec');
        const optLevel = opt.getAttribute('data-level');
        const specMatch = !specId || optSpec === specId;
        const levelMatch = !level || optLevel === level;
        opt.style.display = (specMatch && levelMatch) ? "" : "none";
    });
};

window.switchTTLibrary = function (type) {
    const coursesBtn = document.getElementById('ttLibCoursesBtn');
    const teachersBtn = document.getElementById('ttLibTeachersBtn');
    const coursesList = document.getElementById('ttCoursesList');
    const teachersList = document.getElementById('ttTeachersList');

    if (type === 'courses') {
        coursesBtn.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
        teachersBtn.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
        teachersList.classList.add('hidden');
        coursesList.classList.remove('hidden');
    } else {
        teachersBtn.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
        coursesBtn.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
        coursesList.classList.add('hidden');
        teachersList.classList.remove('hidden');
    }
};

window.loadTTCoursesAndTeachers = async function () {
    const specId = document.getElementById('ttSpecSelect').value;
    const level = document.getElementById('ttLevelSelect').value;
    const coursesList = document.getElementById('ttCoursesListContainer');
    window.currentSpecialityTeachers = [];

    if (!specId || !level) return;

    coursesList.innerHTML = '<p class="text-center py-4 text-xs text-slate-400">Loading...</p>';

    try {
        const [coursesRes, teachersRes] = await Promise.all([
            fetch(`/api/pedagog/courses/filter?specialityId=${specId}&level=${level}`),
            fetch(`/api/pedagog/teachers/filter?specialityId=${specId}`)
        ]);

        const courses = await coursesRes.json();
        const teachers = await teachersRes.json();

        window.currentSpecialityCourses = courses;

        // Render Courses
        if (courses.length === 0) {
            coursesList.innerHTML = `<div class="flex flex-col items-center justify-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p class="text-slate-400 text-[11px] font-bold text-center">No courses found for this level</p>
            </div>`;
        } else {
            coursesList.innerHTML = courses.map(c => `
                <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm cursor-move hover:border-blue-300 hover:shadow-md transition-all group relative"
                     draggable="true" ondragstart="handleTTDragStart(event)"
                     data-type="course" data-id="${c.courseId}" data-name="${c.courseName}">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 bg-blue-50 text-[#00B0FF] rounded-xl flex items-center justify-center text-xs font-black shadow-inner">
                            ${c.courseName.charAt(0)}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2 mb-1">
                                <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tight">${c.code}</span>
                                <span class="text-[10px] font-bold text-blue-500">${c.credits || 0} Cr</span>
                            </div>
                            <p class="text-[12px] font-black text-slate-800 leading-tight line-clamp-2">${c.courseName}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Store Teachers globally for the assignment modal
        if (teachers && teachers.length > 0) {
            window.currentSpecialityTeachers = teachers;
        } else {
            window.currentSpecialityTeachers = [];
        }
    } catch (err) {
        console.error('Error loading library:', err);
    }
};

let draggedItem = null;

window.handleTTDragStart = function (e) {
    const el = e.currentTarget;
    draggedItem = {
        type: el.getAttribute('data-type'),
        id: el.getAttribute('data-id'),
        name: el.getAttribute('data-name'),
        isEvent: el.getAttribute('data-is-event') === 'true'
    };
    e.dataTransfer.setData('text/plain', '');
    e.dataTransfer.effectAllowed = 'copy';
};

window.handleTTDragOver = function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const cell = e.target.closest('.grid-cell');
    if (cell) cell.classList.add('drag-over');
};

window.handleTTDragLeave = function (e) {
    const cell = e.target.closest('.grid-cell');
    // Only remove highlight when leaving the cell entirely (not entering a child)
    if (cell && !cell.contains(e.relatedTarget)) {
        cell.classList.remove('drag-over');
    }
};

window.handleTTDrop = function (e) {
    e.preventDefault();
    const cell = e.target.closest('.grid-cell');
    if (!cell) return;
    cell.classList.remove('drag-over');

    if (!draggedItem) return;

    if (draggedItem.type === 'course') {
        if (draggedItem.isEvent) {
            // Save the contextual cell we dropped onto so the modal can use it later
            pendingEventDropCell = cell;
            pendingEventDropItem = { ...draggedItem };

            // Open the custom HTML modal instead of window.prompt
            const modal = document.getElementById('eventModal');
            const content = document.getElementById('eventModalContent');
            document.getElementById('eventTitleInput').value = '';

            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
                document.getElementById('eventTitleInput').focus();
            }, 10);

            // We exit the drag event loop here, and wait for form submission (confirmEventCreation)!
            draggedItem = null;
            return;
        }
        if (draggedItem.sourceCell) {
            // Already placed block being moved
            if (draggedItem.sourceCell === cell) {
                draggedItem = null;
                return;
            }
            renderCourseInCell(cell, draggedItem);
            draggedItem.sourceCell.innerHTML = `<div class="absolute inset-1 rounded-xl border-2 border-dashed border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>`;
            draggedItem = null;
            return;
        }

        // New course block being dropped
        pendingCourseDropCell = cell;
        pendingCourseDropItem = { ...draggedItem };
        openCourseAssignmentModal(draggedItem.id, draggedItem.name);
        draggedItem = null;
        return;
    } else if (draggedItem.type === 'teacher') {
        showNotification('Teachers are now assigned via the Course drop modal.', 'info');
    }
    draggedItem = null;
};

// Global vars to hold state while waiting for the Custom Modal to submit
let pendingEventDropCell = null;
let pendingEventDropItem = null;
let pendingCourseDropCell = null;
let pendingCourseDropItem = null;

window.cancelEventCreation = function () {
    const modal = document.getElementById('eventModal');
    const content = document.getElementById('eventModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);

    pendingEventDropCell = null;
    pendingEventDropItem = null;
};

window.confirmEventCreation = function (e) {
    e.preventDefault();
    const eventName = document.getElementById('eventTitleInput').value;

    if (eventName && eventName.trim() !== "" && pendingEventDropCell && pendingEventDropItem) {
        pendingEventDropItem.name = eventName.trim();
        pendingEventDropItem.id = null; // Events don't have course IDs
        renderCourseInCell(pendingEventDropCell, pendingEventDropItem);
    }

    cancelEventCreation();
};

window.openCourseAssignmentModal = function (courseId, courseName, existingColor = null, existingTeachers = null) {
    const modal = document.getElementById('courseAssignmentModal');
    const content = document.getElementById('courseAssignmentModalContent');
    const subtitle = document.getElementById('assignCourseSubtitle');

    if (subtitle) subtitle.textContent = `Assigning: ${courseName}`;

    // Default color setup or use pre-existing from an edited block
    const colorInput = document.getElementById('selectedCourseColor');
    if (colorInput) colorInput.value = existingColor || '#00B0FF';

    // Populate teachers checkboxes
    const container = document.getElementById('assignCourseTeachers');
    if (container && window.currentSpecialityTeachers && window.currentSpecialityCourses) {
        // Find the specific course
        const targetCourse = window.currentSpecialityCourses.find(c => String(c.courseId) === String(courseId));

        let validTeacherIds = [];
        if (targetCourse && targetCourse.teacherIds) {
            validTeacherIds = targetCourse.teacherIds.map(id => String(id));
        }

        // Filter valid teachers
        const eligibleTeachers = window.currentSpecialityTeachers.filter(t => validTeacherIds.includes(String(t.userId)));

        if (eligibleTeachers.length > 0) {
            container.innerHTML = eligibleTeachers.map(t => {
                const isChecked = existingTeachers && existingTeachers.some(et => String(et.id) === String(t.userId)) ? 'checked' : '';
                const displayFirstName = t.firstName ? t.firstName.trim() : t.username;
                const displayFullName = (t.firstName || t.lastName) ? `${t.firstName || ''} ${t.lastName || ''}`.trim() : t.username;

                return `
                <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition">
                    <input type="checkbox" value="${t.userId}" data-name="${displayFirstName}" class="w-4 h-4 text-blue-500 rounded border-slate-300 focus:ring-blue-500" ${isChecked}>
                    <span class="text-sm font-bold text-slate-700">${displayFullName}</span>
                </label>
            `;}).join('');
        } else {
            container.innerHTML = `<p class="text-xs text-slate-500 italic py-2 text-center">No teachers explicitly assigned to this module.</p>`;
        }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.cancelCourseAssignment = function () {
    const modal = document.getElementById('courseAssignmentModal');
    const content = document.getElementById('courseAssignmentModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);

    pendingCourseDropCell = null;
    pendingCourseDropItem = null;
};

window.confirmCourseAssignment = function () {
    const colorInput = document.getElementById('selectedCourseColor');
    const container = document.getElementById('assignCourseTeachers');

    const checkedBoxes = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
    const selectedTeachers = checkedBoxes.map(cb => ({
        id: cb.value,
        name: cb.getAttribute('data-name')
    }));

    if (pendingCourseDropCell && pendingCourseDropItem) {
        pendingCourseDropItem.color = colorInput ? colorInput.value : '#00B0FF';
        pendingCourseDropItem.teachers = selectedTeachers;
        renderCourseInCell(pendingCourseDropCell, pendingCourseDropItem);
    }

    cancelCourseAssignment();
};

window.handlePlacedTTDragStart = function (e) {
    const block = e.currentTarget;
    draggedItem = {
        type: 'course',
        id: block.getAttribute('data-course-id'),
        name: block.getAttribute('data-event-name'),
        isEvent: block.getAttribute('data-is-event') === 'true',
        color: block.getAttribute('data-color'),
        teachers: JSON.parse(block.getAttribute('data-teachers') || '[]'),
        sourceCell: block.closest('.grid-cell')
    };
    e.dataTransfer.setData('text/plain', '');
    e.dataTransfer.effectAllowed = 'copy';
};

window.editTTBlock = function(block) {
    const isEvent = block.getAttribute('data-is-event') === 'true';
    if (isEvent) {
         showNotification('Events cannot be edited yet.', 'info');
         return;
    }

    const item = {
        type: 'course',
        id: block.getAttribute('data-course-id'),
        name: block.getAttribute('data-event-name'),
        isEvent: isEvent,
        color: block.getAttribute('data-color'),
        teachers: JSON.parse(block.getAttribute('data-teachers') || '[]'),
        sourceCell: block.closest('.grid-cell')
    };

    pendingCourseDropCell = item.sourceCell;
    pendingCourseDropItem = item;
    openCourseAssignmentModal(item.id, item.name, item.color, item.teachers);
};

function renderCourseInCell(cell, item) {
    const bgColor = item.color || '#00B0FF';
    const isEvent = item.isEvent === true || item.isEvent === 'true';
    const encodedTeachers = item.teachers ? item.teachers.map(({id, name}) => ({id, name})) : [];

    cell.innerHTML = `
        <div class="rounded-xl p-1 shadow-sm group/block tt-block text-white h-full min-h-[48px] cursor-pointer"
             draggable="true" ondragstart="handlePlacedTTDragStart(event)" onclick="if(event.target.closest('button')) return; editTTBlock(this)"
             data-course-id="${item.id || ''}" data-color="${bgColor}" data-duration="1"
             data-is-event="${isEvent}" data-event-name="${item.name}"
             data-teachers='${JSON.stringify(encodedTeachers).replace(/'/g, "&#39;")}'
             style="background: linear-gradient(135deg, ${bgColor}, ${adjustColor(bgColor, -15)}); border-left-color: ${bgColor};">
            <div class="flex flex-col h-full relative z-10 px-1">
                <div class="flex items-start justify-between gap-1 mb-0.5">
                    <p class="text-[9px] font-black leading-tight overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.name}</p>
                    <button onclick="removeTTBlock(this)" class="opacity-0 group-hover/block:opacity-100 p-0.5 text-white/80 hover:text-white transition-opacity">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="mt-auto pt-1 w-full flex flex-col gap-0.5">
                    ${isEvent ? `
                        <span class="inline-block px-1 py-0.5 bg-white/20 rounded text-[7px] font-black uppercase tracking-widest self-start">Event</span>
                    ` : `
                        ${(item.teachers && item.teachers.length > 0) ? item.teachers.map(t => `
                            <div class="teacher-info flex items-center gap-1 py-0.5 px-1 bg-black/10 rounded-md w-full">
                                <div class="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                    <svg class="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <span class="teacher-name text-[8px] font-black truncate">${t.name}</span>
                            </div>
                        `).join('') : `
                            <div class="teacher-info flex items-center gap-1 py-0.5 px-1 bg-black/10 rounded-md w-full">
                                <div class="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                    <svg class="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <span class="teacher-name text-[8px] font-black truncate">Unassigned</span>
                            </div>
                        `}
                    `}
                </div>
            </div>


            <!-- Resize Handle -->
            <div class="tt-resize-handle absolute bottom-0 left-0 right-0 h-1.5 cursor-s-resize hover:bg-white/20 rounded-b-xl z-20 transition"></div>
        </div>
    `;
}

// Helper to darken colors for gradients
function adjustColor(color, percent) {
    let num = parseInt(color.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}




window.removeTTBlock = function (btn) {
    const cell = btn.closest('.grid-cell');
    const day = cell.getAttribute('data-day-index');
    const hour = cell.getAttribute('data-hour');
    cell.innerHTML = `
        <div class="absolute inset-1 rounded-xl border-2 border-dashed border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    `;
};



window.getISOWeek = function (date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

window.syncTTDates = function (source) {
    const startInput = document.getElementById('ttStartDate');
    const endInput = document.getElementById('ttEndDate');
    const dateRangeDisplay = document.getElementById('ttDateRange');

    if (source === 'start' && startInput.value) {
        const d = new Date(startInput.value);
        d.setDate(d.getDate() + 5); // Saturday
        endInput.value = d.toISOString().split('T')[0];
    } else if (source === 'end' && endInput.value) {
        const d = new Date(endInput.value);
        d.setDate(d.getDate() - 5); // Monday
        startInput.value = d.toISOString().split('T')[0];
    }

    if (startInput.value && endInput.value) {
        const options = { month: 'short', day: 'numeric' };
        dateRangeDisplay.textContent = `${new Date(startInput.value).toLocaleDateString('en-US', options)} - ${new Date(endInput.value).toLocaleDateString('en-US', options)}`;
    }
};

window.timetableHistoryVersionMap = [];

window.fetchTimetable = async function () {
    const classroomId = document.getElementById('ttClassSelect').value;
    const startDateStr = document.getElementById('ttStartDate').value;
    const week = startDateStr ? getISOWeek(new Date(startDateStr)) : 1;
    const semester = document.getElementById('ttSemesterSelect').value;

    const academicYearId = document.getElementById('ttAcademicYearSelect')?.value;

    if (!classroomId) return;

    try {
        let url = `/api/timetablecontent/search?classroomId=${classroomId}&week=${week}&semester=${semester}`;
        if (academicYearId) {
            url += `&academicYearId=${academicYearId}`;
        }
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            renderTimetableData(data);
            loadTimetableHistory(classroomId, week, semester, academicYearId);
        }
    } catch (err) {
        console.error('Error fetching timetable:', err);
    }
};

window.loadTimetableHistory = async function (classroomId, week, semester, academicYearId) {
    let url = `/api/timetablecontent/history?classroomId=${classroomId}&week=${week}&semester=${semester}`;
    if (academicYearId) url += `&academicYearId=${academicYearId}`;
    try {
        const res = await fetch(url);
        if (res.ok) {
            window.timetableHistoryVersionMap = await res.json();
            populateVersionDropdown();
        }
    } catch (err) {
        console.error("Error loading history", err);
    }
};

window.populateVersionDropdown = function () {
    const select = document.getElementById('ttVersionSelect');
    if (!select) return;

    if (!window.timetableHistoryVersionMap || window.timetableHistoryVersionMap.length === 0) {
        select.innerHTML = '<option value="latest">Latest Active</option>';
        select.disabled = true;
        select.classList.add('cursor-not-allowed', 'bg-slate-100');
        return;
    }

    select.disabled = false;
    select.classList.remove('cursor-not-allowed', 'bg-slate-100');

    select.innerHTML = window.timetableHistoryVersionMap.map(tt => {
        const isCurrent = tt.isActive ? ' (Active)' : '';
        return `<option value="${tt.version}">Version ${tt.version}${isCurrent}</option>`;
    }).join('');

    // Select the currently active component
    const activeTt = window.timetableHistoryVersionMap.find(t => t.isActive);
    if (activeTt) {
        select.value = activeTt.version;
    }
};

window.fetchTimetableByVersion = function () {
    const version = document.getElementById('ttVersionSelect').value;
    const tt = window.timetableHistoryVersionMap.find(t => t.version.toString() === version);
    if (!tt) return;
    renderTimetableData(tt);
};

window.renderTimetableData = function (data) {
    // Reset grid
    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.innerHTML = '<div class="absolute inset-1 rounded-xl border-2 border-dashed border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>';
    });

    if (data && data.entries) {
        data.entries.forEach(entry => {
            const startHourStr = entry.startTime.split(':')[0];
            const startHour = parseInt(startHourStr);
            const cell = document.querySelector(`.grid-cell[data-day-index="${entry.dayOfWeek}"][data-hour="${startHour}"]`);
            if (cell) {
                renderCourseInCell(cell, {
                    id: entry.courseId,
                    name: Boolean(entry.isEvent) ? entry.eventName : entry.courseName,
                    color: entry.color,
                    isEvent: Boolean(entry.isEvent)
                });

                if (entry.teacherId) {
                    assignTeacherToCell(cell, { id: entry.teacherId, name: entry.teacherName });
                }

                const block = cell.querySelector('.tt-block');
                if (block) {
                    const endH = parseInt(entry.endTime.split(':')[0]);
                    const duration = Math.max(1, endH - startHour);
                    if (duration > 1) {
                        block.setAttribute('data-duration', duration);
                        block.style.height = `calc(${duration * 100}% + ${duration - 1}px - 6px)`;
                        block.style.zIndex = '15';
                    }
                }
            }
        });
    }
};

window.saveTimetable = async function () {
    // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Field helpers ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
    const highlight = (id, on) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (on) {
            el.style.outline = '2px solid #EF4444';
            el.style.outlineOffset = '2px';
        } else {
            el.style.outline = '';
            el.style.outlineOffset = '';
        }
    };
    const clearHighlights = () =>
        ['ttClassSelect','ttSemesterSelect','ttAcademicYearSelect','ttStartDate']
        .forEach(id => highlight(id, false));

    clearHighlights();

    // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Read field values ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
    const classroomId    = document.getElementById('ttClassSelect')?.value;
    const startDateStr   = document.getElementById('ttStartDate')?.value;
    const semester       = document.getElementById('ttSemesterSelect')?.value;
    const academicYearId = document.getElementById('ttAcademicYearSelect')?.value;

    const semesterVal        = parseInt(semester);
    const academicYearIdVal  = (academicYearId && academicYearId !== '') ? parseInt(academicYearId) : null;
    const week               = startDateStr ? getISOWeek(new Date(startDateStr)) : null;

    // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Validations ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
    const errors = [];

    if (!classroomId || classroomId === '') {
        errors.push({ field: 'ttClassSelect', msg: 'Please select a <strong>classroom</strong> before saving.' });
    }
    if (!semester || isNaN(semesterVal)) {
        errors.push({ field: 'ttSemesterSelect', msg: 'Please select a <strong>semester</strong> (1 or 2).' });
    }
    if (!startDateStr) {
        errors.push({ field: 'ttStartDate', msg: 'Please pick a <strong>week start date</strong> so the timetable can be anchored correctly.' });
    }

    const blocks = document.querySelectorAll('.tt-block');
    if (blocks.length === 0) {
        errors.push({ field: null, msg: 'The timetable grid is <strong>empty</strong>. Drag at least one course onto the grid before saving.' });
    }

    if (errors.length > 0) {
        errors.forEach(({ field, msg }, i) => {
            if (field) highlight(field, true);
            // Stagger each toast slightly
            setTimeout(() => showNotification(msg, 'warning'), i * 250);
        });
        // Auto-clear red borders after user starts interacting
        ['ttClassSelect','ttSemesterSelect','ttAcademicYearSelect','ttStartDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', clearHighlights, { once: true });
        });
        return;
    }

    // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Build entries ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
    const entries = [];
    blocks.forEach(block => {
        const cell = block.closest('.grid-cell');
        if (!cell) return;
        const duration  = parseInt(block.getAttribute('data-duration') || 1);
        const startHour = parseInt(cell.getAttribute('data-hour'));
        const isEvent   = block.getAttribute('data-is-event') === 'true';
        const eventName = block.getAttribute('data-event-name');

        entries.push({
            dayOfWeek:  parseInt(cell.getAttribute('data-day-index')),
            startTime:  `${startHour.toString().padStart(2, '0')}:00:00`,
            endTime:    `${(startHour + duration).toString().padStart(2, '0')}:00:00`,
            courseId:   isEvent ? null : parseInt(block.getAttribute('data-course-id')),
            isEvent,
            eventName:  isEvent ? eventName : null,
            teacherId: (() => {
                const teachersStr = block.getAttribute('data-teachers');
                if (teachersStr) {
                    try {
                        const parsed = JSON.parse(teachersStr);
                        if (parsed && parsed.length > 0) return parseInt(parsed[0].id);
                    } catch (e) { console.warn("Failed to parse teachers string", e); }
                }
                return block.getAttribute('data-teacher-id') ? parseInt(block.getAttribute('data-teacher-id')) : null;
            })(),
            color: block.getAttribute('data-color') || '#00B0FF'
        });
    });

    const endDateStr     = document.getElementById('ttEndDate')?.value;

    const payload = {
        classroomId:    parseInt(classroomId),
        academicYearId: academicYearIdVal,
        week:           parseInt(week),
        semester:       semesterVal,
        startDate:      startDateStr,
        endDate:        endDateStr,
        entries
    };

    try {
        if (!navigator.onLine) throw new Error('offline');

        const res = await fetch('/api/timetablecontent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showNotification('Timetable saved successfully! All entries have been stored.', 'success');
        } else {
            let detail = '';
            try { const body = await res.json(); detail = body.message || body.error || ''; } catch (parseErr) { console.error("Failed to parse error response:", parseErr); }
            showNotification(`Failed to save timetable.${ detail ? ' ' + detail : ' Please check server logs for details.' }`, 'error');
        }
    } catch (err) {
        console.error('Error saving timetable:', err);
        
        // Handle Offline Background Sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const db = await new Promise((resolve, reject) => {
                    const req = indexedDB.open('attendee-offline-db', 1);
                    req.onupgradeneeded = e => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains('timetable-requests')) {
                            db.createObjectStore('timetable-requests', { autoIncrement: true, keyPath: 'id' });
                        }
                    };
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });

                await new Promise((resolve, reject) => {
                    const tx = db.transaction('timetable-requests', 'readwrite');
                    tx.objectStore('timetable-requests').add({ payload });
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });

                const swReg = await navigator.serviceWorker.ready;
                await swReg.sync.register('sync-timetable');
                
                showNotification('You are offline. Your timetable has been saved locally and will automatically sync when you reconnect.', 'warning');
            } catch (syncErr) {
                console.error('Failed to register background sync:', syncErr);
                showNotification('Network error — could not reach the server and offline sync failed.', 'error');
            }
        } else {
            showNotification('Network error — could not reach the server. Check your connection and try again.', 'error');
        }
    }};

window.exportTTPdf = function () {
    const classroomId = document.getElementById('ttClassSelect').value;
    const startDateStr = document.getElementById('ttStartDate').value;
    const week = startDateStr ? getISOWeek(new Date(startDateStr)) : 1;
    const semester = document.getElementById('ttSemesterSelect').value;
    const academicYearId = document.getElementById('ttAcademicYearSelect')?.value;

    if (!classroomId) {
        showNotification('Select a classroom first', 'warning');
        return;
    }

    let url = `/api/timetablecontent/export/pdf?classroomId=${classroomId}&week=${week}&semester=${semester}`;
    if (academicYearId) {
        url += `&academicYearId=${academicYearId}`;
    }
    window.open(url, '_blank');
};

// ==========================================
// RESPONSIVE / UI HELPERS
// ==========================================

/** Toggle the timetable sidebar panel on mobile */
window.toggleTTPanel = function () {
    const panel = document.getElementById('ttSidePanel');
    if (!panel) return;
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    }
};

/** Highlight the selected day tab and scroll the grid to that column */
window.setActiveTTDay = function (dayIndex) {
    document.querySelectorAll('.tt-day-tab').forEach(btn => {
        const i = parseInt(btn.getAttribute('data-day-btn'));
        if (i === dayIndex) {
            btn.classList.add('text-[#00B0FF]', 'border-[#00B0FF]');
            btn.classList.remove('text-slate-400', 'border-transparent');
        } else {
            btn.classList.remove('text-[#00B0FF]', 'border-[#00B0FF]');
            btn.classList.add('text-slate-400', 'border-transparent');
        }
    });

    const container = document.querySelector('.tt-grid-scroll-container');
    if (container) {
        // Time column is 100px wide; each of the 6 day columns takes equal share of the rest
        const timeColWidth = 100;
        const totalScrollWidth = container.scrollWidth;
        const dayColWidth = (totalScrollWidth - timeColWidth) / 6;
        container.scrollTo({ left: timeColWidth + dayIndex * dayColWidth, behavior: 'smooth' });
    }
};

/** Filter student table rows by speciality, classroom, and level */
window.applyStudentFilters = function () {
    const specName = document.getElementById('studentSpecFilter')?.value || '';
    const className = document.getElementById('studentClassFilter')?.value || '';
    const levelValue = document.getElementById('studentLevelFilter')?.value || '';
    const searchText = document.getElementById('studentSearch')?.value.toLowerCase() || '';

    document.querySelectorAll('.student-row').forEach(row => {
        const rowSpec = row.getAttribute('data-spec') || '';
        const rowClass = row.getAttribute('data-class') || '';
        const rowLevel = row.getAttribute('data-level') || '';
        const rowName = (row.getAttribute('data-name') || '').toLowerCase();
        const rowEmail = (row.getAttribute('data-email') || '').toLowerCase();
        const rowMatricule = (row.getAttribute('data-matricule') || '').toLowerCase();

        const match = (!specName || rowSpec === specName)
            && (!className || rowClass === className)
            && (!levelValue || rowLevel === levelValue)
            && (!searchText || rowName.includes(searchText) || rowEmail.includes(searchText) || rowMatricule.includes(searchText));

        row.style.display = match ? '' : 'none';
    });
};

// ==========================================
// COURSE RESIZE LOGIC
// ==========================================

let ttIsResizing = false;
let ttCurrentBlock = null;
let ttStartY = 0;
let ttStartHeight = 0;

document.addEventListener('mousedown', function (e) {
    if (e.target.classList.contains('tt-resize-handle')) {
        ttIsResizing = true;
        ttCurrentBlock = e.target.closest('.tt-block');
        ttStartY = e.clientY;
        ttStartHeight = ttCurrentBlock.offsetHeight;
        ttCurrentBlock.style.zIndex = '50';
        document.body.style.cursor = 's-resize';
        e.preventDefault();
        e.stopPropagation();
    }
});

document.addEventListener('mousemove', function (e) {
    if (!ttIsResizing || !ttCurrentBlock) return;

    const dy = e.clientY - ttStartY;
    // Each hour slot is ~48px high.
    let newDuration = Math.max(1, Math.round((ttStartHeight + dy) / 48));

    // Constraints: Can't exceed the end of the day (17:00). Max Start Hour is 16.
    const cell = ttCurrentBlock.closest('.grid-cell');
    const startHour = parseInt(cell.getAttribute('data-hour'));
    if (startHour + newDuration > 17) {
        newDuration = 17 - startHour;
    }

    ttCurrentBlock.setAttribute('data-duration', newDuration);
    ttCurrentBlock.style.height = `calc(${newDuration * 100}% + ${newDuration - 1}px - 6px)`;
});

document.addEventListener('mouseup', function (e) {
    if (ttIsResizing) {
        ttIsResizing = false;
        if (ttCurrentBlock) ttCurrentBlock.style.zIndex = '15';
        ttCurrentBlock = null;
        document.body.style.cursor = '';
    }
});

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Mobile Responsiveness Handlers ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬

window.toggleTTPanel = function () {
    const panel = document.getElementById('ttSidePanel');
    if (panel) {
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            panel.classList.add('flex');
            // Force it to take up full width on mobile
            panel.classList.add('w-full', 'mb-6');
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('flex', 'w-full', 'mb-6');
        }
    }
};

window.setActiveTTDay = function (dayIndex) {
    document.querySelectorAll('.tt-day-tab').forEach(tab => {
        if (parseInt(tab.getAttribute('data-day-btn')) === dayIndex) {
            tab.classList.remove('text-slate-400', 'border-transparent');
            tab.classList.add('text-[#00B0FF]', 'border-[#00B0FF]');
        } else {
            tab.classList.add('text-slate-400', 'border-transparent');
            tab.classList.remove('text-[#00B0FF]', 'border-[#00B0FF]');
        }
    });

    const gridContainer = document.querySelector('.tt-grid-scroll-container');
    if (gridContainer) {
        const minWidthElement = gridContainer.querySelector('.min-w-\\[620px\\]');
        const totalWidth = minWidthElement ? minWidthElement.offsetWidth : 620;
        const dayWidth = (totalWidth - 100) / 6;
        gridContainer.scrollTo({
            left: 100 + (dayIndex * dayWidth) - 10,
            behavior: 'smooth'
        });
    }
};

// ==========================================
// EMAIL DISTRIBUTION LOGIC
// ==========================================

window.openEmailTTModal = function () {
    const modal = document.getElementById('emailTTModal');
    const content = document.getElementById('emailTTModalContent');
    const form = document.getElementById('emailTTForm');

    // reset form
    form.reset();

    // Prefill speciality and classroom from main filters
    const currentSpec = document.getElementById('ttSpecSelect').value;
    const currentClass = document.getElementById('ttClassSelect').value;

    if (currentSpec) {
        document.getElementById('emailSpecSelect').value = currentSpec;
        // The global filterClassrooms is defined in pedagog-dashboard.js
        if (typeof filterClassrooms === 'function') {
            filterClassrooms(currentSpec, 'emailClassSelect');
        }

        if (currentClass) {
            document.getElementById('emailClassSelect').value = currentClass;
        }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeEmailTTModal = function () {
    const modal = document.getElementById('emailTTModal');
    const content = document.getElementById('emailTTModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.handleSendEmailTT = async function (event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const loader = document.getElementById('emailTTLoader');

    // Get current week, semester, academicYear from main dashboard
    const weekInput = document.getElementById('ttStartDate');
    let week = 1;
    if (weekInput && weekInput.value) {
        week = getISOWeek(new Date(weekInput.value));
    }
    const semester = document.getElementById('ttSemesterSelect').value;
    const academicYearId = document.getElementById('ttAcademicYearSelect').value;

    if (!formData.get('classroomId')) {
        Swal.fire({ text: 'Please select a classroom first.', icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        return;
    }

    loader.classList.remove('hidden');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        const params = new URLSearchParams();
        params.append('classroomId', formData.get('classroomId'));
        params.append('week', week);
        params.append('semester', semester);
        if (academicYearId) params.append('academicYearId', academicYearId);
        params.append('subject', formData.get('subject'));
        params.append('message', formData.get('message'));

        const response = await fetch('/api/timetablecontent/email', {
            method: 'POST',
            body: params
        });

        const result = await response.json();

        if (response.ok) {
            Swal.fire({ text: result.message || 'Timetable emails sent successfully!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            closeEmailTTModal();
        } else {
            Swal.fire({ text: result.error || 'Failed to send emails.', icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    } catch (error) {
        console.error('Email error:', error);
        Swal.fire({ text: 'Network error while sending emails.', icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    } finally {
        loader.classList.add('hidden');
        btn.disabled = false;
    }
};

/* --- Detail View Modal Handlers --- */

/**
 * Open Detail Modal
 */
window.openDetailModal = function(title, subtitle = 'Viewing detailed information') {
    const modal = document.getElementById('detailViewModal');
    const content = document.getElementById('detailViewModalContent');
    const titleEl = document.getElementById('detailModalTitle');
    const subtitleEl = document.getElementById('detailModalSubtitle');
    const bodyEl = document.getElementById('detailModalBody');

    if (!modal) return;

    titleEl.textContent = title;
    subtitleEl.textContent = subtitle;
    bodyEl.innerHTML = `
        <div class="flex items-center justify-center py-10">
            <div class="w-8 h-8 border-4 border-[#00B0FF] border-t-transparent rounded-full animate-spin"></div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

/**
 * Close Detail Modal
 */
window.closeDetailModal = function() {
    const modal = document.getElementById('detailViewModal');
    const content = document.getElementById('detailViewModalContent');

    if (!modal) return;

    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

/**
 * Handle View Student Details
 */
window.handleViewStudent = async function(studentId) {
    openDetailModal('Student Details', `Profile for student #${studentId}`);

    try {
        const response = await fetch(`/api/pedagog/students/${studentId}`);
        if (!response.ok) throw new Error('Failed to fetch student details');
        const student = await response.json();

        const bodyEl = document.getElementById('detailModalBody');
        bodyEl.innerHTML = `
            <div class="space-y-6 text-slate-700">
                <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div class="w-16 h-16 bg-[#00B0FF] bg-opacity-10 rounded-2xl flex items-center justify-center text-[#00B0FF] text-2xl font-bold">
                        ${student.firstName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 class="text-xl font-bold text-slate-800">${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</h4>
                        <p class="text-slate-500">${escapeHtml(student.email || 'No email')}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Matricule</p>
                        <p class="font-bold text-slate-800">${escapeHtml(student.matricule)}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Speciality</p>
                        <p class="font-bold text-slate-800">${escapeHtml(student.specialityName || 'Common')}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Classroom</p>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-bold">${escapeHtml(student.classroomName || 'Unassigned')}</span>
                            <span class="text-[10px] font-bold text-slate-400">Level ${student.level || 0}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Information</p>
                    <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <div class="flex items-center gap-2 text-sm">
                            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                            <span>${escapeHtml(student.email)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error viewing student:', error);
        document.getElementById('detailModalBody').innerHTML = `
            <div class="p-8 text-center text-red-500">
                <p class="font-bold">Error loading student details</p>
                <p class="text-sm mt-1">${error.message}</p>
            </div>
        `;
    }
};

/**
 * Handle View Course Details
 */
window.handleViewCourse = async function(courseId) {
    openDetailModal('Course Details', `Information for course #${courseId}`);

    try {
        const response = await fetch(`/api/pedagog/courses/${courseId}`);
        if (!response.ok) throw new Error('Failed to fetch course details');
        const course = await response.json();

        const bodyEl = document.getElementById('detailModalBody');
        bodyEl.innerHTML = `
            <div class="space-y-6 text-slate-700">
                <div class="flex items-center gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div class="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl font-black">
                        ${course.courseName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 class="text-xl font-bold text-slate-800">${escapeHtml(course.courseName)}</h4>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-tight">${escapeHtml(course.code)}</span>
                            <span class="text-xs font-bold text-purple-600">${course.credits || 0} Credits</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Speciality</p>
                        <p class="font-bold text-slate-800">${escapeHtml(course.specialityName || 'Common')}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Level</p>
                        <p class="font-bold text-slate-800">Level ${course.level || 0}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Hours</p>
                        <p class="font-bold text-slate-800">${course.totalHours || 0} hrs</p>
                    </div>
                </div>

                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Teachers</p>
                    <div class="space-y-2 mt-2">
                        ${(course.teacherNames || []).map(name => `
                            <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div class="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-xs font-bold">
                                    ${name.charAt(0).toUpperCase()}
                                </div>
                                <span class="text-sm font-bold text-slate-700">${escapeHtml(name)}</span>
                            </div>
                        `).join('') || '<p class="text-sm text-slate-400 italic py-2">No teachers assigned yet</p>'}
                    </div>
                </div>

                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Course Description</p>
                    <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p class="text-sm leading-relaxed">${escapeHtml(course.description || 'No description provided for this course.')}</p>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error viewing course:', error);
        document.getElementById('detailModalBody').innerHTML = `
            <div class="p-8 text-center text-red-500">
                <p class="font-bold">Error loading course details</p>
                <p class="text-sm mt-1">${error.message}</p>
            </div>
        `;
    }
};

/**
 * Filter Teachers in searchable dropdown
 */
window.filterTeachers = function(input) {
    const term = input.value.toLowerCase();
    const options = document.querySelectorAll('#cfTeacherOptions > div[onclick]');

    options.forEach(opt => {
        const name = opt.textContent.trim().toLowerCase();
        if (name.includes(term)) {
            opt.classList.remove('hidden');
        } else {
            opt.classList.add('hidden');
        }
    });

    // Check if any results
    const container = document.getElementById('cfTeacherOptions');
    const existingNoResults = container.querySelector('.no-results-msg');

    const hasVisible = Array.from(options).some(opt => !opt.classList.contains('hidden'));

    if (!hasVisible) {
        if (!existingNoResults) {
            const msg = document.createElement('div');
            msg.className = 'no-results-msg p-4 text-center text-xs text-slate-400 italic';
            msg.textContent = 'No teachers match your search';
            container.appendChild(msg);
        }
    } else if (existingNoResults) {
        existingNoResults.remove();
    }
};

/**
 * Escape HTML Helper
 */
function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Weekly Planning Logic for Pedagogic Assistant
 */
window.onPlanningFilterChange = async function() {
    console.log("Planning filter changed...");
    const specId = document.getElementById('planningSpecId').value;
    const level = document.getElementById('planningLevel').value;
    const roomSelect = document.getElementById('planningClassroomId');

    // Reset/Clear classroom select
    const ts = window.tsInstances['planningClassroomId'];
    if (ts) {
        ts.clear();
        ts.clearOptions();
    } else {
        roomSelect.innerHTML = '<option value="">Select Classroom</option>';
    }

    if (!specId || !level) {
        clearPlanningGrid();
        return;
    }

    try {
        const resp = await fetch(`/admin/classrooms/by-speciality/${specId}`);
        if (resp.ok) {
            const rooms = await resp.json();

            // Filter by level
            const filtered = rooms.filter(r => {
                const roomLevelNum = String(r.level).replace(/\D/g, '');
                const targetLevelNum = String(level).replace(/\D/g, '');
                return roomLevelNum === targetLevelNum;
            });

            if (filtered.length === 0) {
                if (ts) {
                    ts.addOption({value: "", text: rooms.length > 0 ? "No rooms for this level" : "No classrooms found"});
                } else {
                    const opt = document.createElement('option');
                    opt.value = "";
                    opt.textContent = rooms.length > 0 ? "No rooms for this level" : "No classrooms found";
                    roomSelect.appendChild(opt);
                }
            } else {
                filtered.forEach(r => {
                    const label = `${r.name} (${r.level})`;
                    if (ts) {
                        ts.addOption({value: r.classId, text: label});
                    } else {
                        const opt = document.createElement('option');
                        opt.value = r.classId;
                        opt.textContent = label;
                        roomSelect.appendChild(opt);
                    }
                });

                if (filtered.length === 1) {
                    if (ts) {
                        ts.setValue(filtered[0].classId);
                    } else {
                        roomSelect.value = filtered[0].classId;
                    }
                    loadPlanning();
                }
            }
        }
    } catch (e) {
        console.error("Error refreshing planning classrooms:", e);
    }
};

/**
 * Weekly Planning Logic for Pedagogic Assistant
 */
window.loadPlanning = async function() {
    console.log("Loading planning...");
    const roomId = document.getElementById('planningClassroomId').value;
    const week = document.getElementById('planningWeek').value;
    const semester = 1; // Default

    // Clear grid and update headers
    clearPlanningGrid();
    updatePlanningDates(week);

    if (!roomId || !week) return;

    try {
        // Direct fetch by classroomId
        const resp = await fetch(`/api/timetablecontent/search?classroomId=${roomId}&week=${week}&semester=${semester}`);
        if (!resp.ok) throw new Error("Timetable fetch failed");

        const timetable = await resp.json();
        renderPlanningGrid(timetable.entries || []);
    } catch (error) {
        console.error("Error loading planning:", error);
    }
};

function clearPlanningGrid() {
    for (let hour = 8; hour <= 17; hour++) {
        for (let dayIndex = 0; dayIndex <= 6; dayIndex++) {
            const slot = document.getElementById(`planning-slot-${hour}-${dayIndex}`);
            if (slot) slot.innerHTML = '';
        }
    }
}

function updatePlanningDates(week) {
    const today = new Date();
    const [currYear, currWeek] = getWeekNumber(today);
    const diff = week - currWeek;

    const monday = new Date();
    monday.setDate(today.getDate() + (diff * 7) - (today.getDay() === 0 ? 6 : today.getDay() - 1));

    const placeholders = document.querySelectorAll('#planning-date-placeholder');
    placeholders.forEach((p, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        p.textContent = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    });
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return [d.getUTCFullYear(), weekNo];
}

function renderPlanningGrid(entries) {
    console.log("Rendering planning grid with", entries.length, "entries");
    const dayMap = {
        'MONDAY': 0, 'TUESDAY': 1, 'WEDNESDAY': 2, 'THURSDAY': 3,
        'FRIDAY': 4, 'SATURDAY': 5, 'SUNDAY': 6
    };

    const STATUS_MAP = {
        'SCHEDULED':   { cls: 'state-scheduled', bCls: 'badge-scheduled', label: '🗓️ Scheduled' },
        'IN_PROGRESS': { cls: 'state-live',      bCls: 'badge-live',      label: '🔴 LIVE' },
        'COMPLETED':   { cls: 'state-completed', bCls: 'badge-done',      label: '✅ DONE' },
        'CANCELLED':   { cls: 'state-scheduled', bCls: 'badge-scheduled', label: 'Cancelled' }
    };

    entries.forEach(entry => {
        const dayIndex = entry.dayOfWeek !== null ? entry.dayOfWeek : dayMap[entry.day.toUpperCase()];
        const startParts = entry.startTime.split(':');
        const startH = parseInt(startParts[0]);
        const startM = parseInt(startParts[1]);

        const endParts = entry.endTime.split(':');
        const endH = parseInt(endParts[0]);
        const endM = parseInt(endParts[1]);

        const startOffsetMinutes = startM;
        const durationMinutes = ((endH * 60) + endM) - ((startH * 60) + startM);

        const slot = document.getElementById(`planning-slot-${startH}-${dayIndex}`);
        if (slot) {
            const st = STATUS_MAP[entry.status] || STATUS_MAP['SCHEDULED'];
            const block = document.createElement('div');
            block.className = `tt-block p-2 ${st.cls}`;

            // Absolute positioning for precise minute alignment
            block.style.position = 'absolute';
            block.style.top = `calc((${startOffsetMinutes} / 60) * 100%)`;
            block.style.height = `calc((${durationMinutes} / 60) * 100%)`;
            block.style.width = 'calc(100% - 8px)';
            block.style.left = '4px';
            block.style.zIndex = '10';

            block.style.borderLeft = `4px solid ${entry.color || '#3b82f6'}`;

            if (entry.status === 'COMPLETED' && entry.sessionId) {
                block.setAttribute('onclick', `viewSessionPdf(${entry.sessionId})`);
                block.setAttribute('title', 'Click to view attendance PDF');
            }

            const name = entry.isEvent ? (entry.eventName || 'Event') : (entry.courseName || 'Course');
            const teacher = entry.teacherName ? `By ${entry.teacherName}` : '';

            block.innerHTML = `
                <div class="flex flex-col h-full overflow-hidden">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[9px] font-black uppercase tracking-tight text-slate-400">
                            ${entry.startTime.substring(0, 5)} - ${entry.endTime.substring(0, 5)}
                        </span>
                        <span class="status-badge ${st.bCls}">${st.label}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-black text-slate-800 text-[11px] leading-tight line-clamp-2">${escapeHtml(name)}</p>
                        <p class="text-[9px] font-bold text-slate-500 mt-0.5 truncate">${escapeHtml(teacher)}</p>
                    </div>
                    ${entry.status === 'COMPLETED' ? `
                        <div class="mt-auto flex items-center gap-1 text-[8px] font-black text-emerald-600">
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            VIEW LIST
                        </div>
                    ` : ''}
                </div>
            `;
            slot.appendChild(block);
        }
    });
}

window.exportPlanningPdf = async function() {
    const roomId = document.getElementById('planningClassroomId').value;
    const week = document.getElementById('planningWeek').value;

    if (!roomId || !week) return showNotification("Select a Classroom and Week first.", 'warning');

    window.open(`/api/timetablecontent/export/pdf?classroomId=${roomId}&week=${week}&semester=1`, '_blank');
};
// ==========================================
// NOTIFICATION MANAGEMENT
// ==========================================

window.handleNotificationClick = async function(id, type) {
    try {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
        loadNotifications(); // Refresh

        if (type === 'ATTENDANCE_SUBMISSION') {
            const navItem = document.querySelector('[data-section="attendance"]');
            if (navItem) navItem.click();
        }
    } catch (error) {
        console.error("Failed to mark notification as read", error);
    }
};

// =========================================================================
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
        const courseName = block.querySelector('.tt-name')?.textContent?.trim() || block.getAttribute('data-event-name') || 'â€”';
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
                '<td style="padding:9px 14px;font-size:13px;color:var(--text-2)">' + e.startTime + ' â€“ ' + e.endTime + '</td>' +
                '<td style="padding:9px 14px;font-size:13px;color:var(--text)">' + e.courseName + '</td>' +
                '<td style="padding:9px 14px">' +
                    (e.teacherName
                        ? '<span style="padding:2px 8px;background:var(--blue-lt);color:var(--blue-dk);border-radius:6px;font-size:11px;font-weight:700">' + e.teacherName + '</span>'
                        : '<span style="color:#f97316;font-size:11px;font-weight:700">âš  Unassigned</span>') +
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

/** Actually save + publish â€” called from the modal button */
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
let smVisibleCount = 10;

window.loadSessionsMonitor = async function () {
    smVisibleCount = 10;
    const tbody = document.getElementById('smTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="padding:48px 20px;text-align:center">' +
        '<div style="width:28px;height:28px;border:3px solid #93c5fd;border-top-color:#2563eb;border-radius:50%;' +
             'animation:spin .7s linear infinite;margin:0 auto 10px"></div>' +
        '<div style="font-size:13px;color:var(--text-3);font-weight:500">Loading sessionsâ€¦</div>' +
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
        const loadMoreContainer = document.getElementById('smLoadMoreContainer');
        if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
        return;
    }

     // Sort by date DESC then startTime DESC (Most recent first)
    sessions.sort((a, b) => {
        const d = (b.date || '').localeCompare(a.date || '');
        return d !== 0 ? d : (b.startTime || '').localeCompare(a.startTime || '');
    });

    const totalFiltered = sessions.length;
    const visibleSessions = sessions.slice(0, smVisibleCount);

    tbody.innerHTML = visibleSessions.map(s => renderSessionRow(s)).join('');

    const loadMoreContainer = document.getElementById('smLoadMoreContainer');
    if (loadMoreContainer) {
        if (totalFiltered > smVisibleCount) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }
}

window.smLoadMore = function() {
    smVisibleCount += 10;
    renderSessionsTable();
};

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
                '<div style="display:flex;align-items:center;gap:8px">' +
                    '<div>' +
                        '<div style="font-weight:600;font-size:13px;color:var(--text)">' + (s.courseName || 'Event') + '</div>' +
                        '<div style="font-size:11px;color:var(--text-3)">Week ' + (s.week || '—') + '</div>' +
                    '</div>' +
                    (s.isValidated ? '<div style="width:16px;height:16px;background:#10b981;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold" title="Validated">âœ“</div>' : '') +
                '</div>' +
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
                '<div style="display:flex;justify-content:flex-end;gap:4px">' +
                    (s.status === 'COMPLETED' ? '<button onclick="viewSessionPdf(' + s.sessionId + ')" style="padding:5px;border:1px solid var(--border);background:var(--surface);border-radius:8px;cursor:pointer" title="View Attendance PDF">' +
                        '<svg style="width:14px;height:14px;color:#64748b" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>' +
                    '</button>' : '') +
                    '<button onclick="viewSessionDetails(' + s.sessionId + ')" ' +
                            'style="padding:5px 10px;border:1px solid var(--border);background:var(--surface);border-radius:8px;font-size:11px;font-weight:600;color:var(--text-2);cursor:pointer;white-space:nowrap">' +
                        'View' +
                    '</button>' +
                    ((s.status !== 'CANCELLED' && s.status !== 'COMPLETED') ? ('<button onclick="cancelSession(' + s.sessionId + ')" style="padding:5px 10px;border:1px solid #fecdd3;background:#fff1f2;border-radius:8px;font-size:11px;font-weight:600;color:#e11d48;cursor:pointer;white-space:nowrap">Cancel</button>') : '') +
                '</div>' +
            '</td>' +
        '</tr>';
}

window.cancelSession = async function(sessionId) {
    const result = await Swal.fire({
        title: "Cancel this session?",
        text: "This will remove the session from the schedule and notify the teacher. This action is permanent.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#94a3b8",
        confirmButtonText: "Yes, Cancel Session"
    });
    if (!result.isConfirmed) return;
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

window.viewSessionPdf = function(sessionId) {
    window.open(`/api/teacher/sessions/${sessionId}/export/pdf`, '_blank');
};

window.viewSessionDetails = function(sessionId) {
    const session = smAllSessions?.find(s => s.sessionId === parseInt(sessionId));
    if (!session) {
        showNotification("Session data not found.", "error");
        return;
    }

    document.getElementById('rsCourseName').textContent = session.courseName || 'â€”';
    document.getElementById('rsTeacherName').textContent = session.teacherName || 'â€”';
    document.getElementById('rsClassroomName').textContent = session.classroomName || 'â€”';
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

    sessSelect.innerHTML = '<option value="">â€” Choose Session â€”</option>';
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
    tbody.innerHTML = '<tr><td colspan="4" class="py-12 text-center text-slate-400">Loading roster...</td></tr>';
    document.getElementById('hubWorkspace').style.display = 'block';
    document.getElementById('hubEmptyState').style.display = 'none';

    try {
        const res = await fetch("/api/attendance/session/" + sessionId + "/students");
        if (!res.ok) throw new Error("Failed to fetch roster");
        const data = await res.json();
        renderHubRoster(data);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" class="py-12 text-center text-red-500 font-bold">Error: ' + e.message + '</td></tr>';
    }
};

function renderHubRoster(records) {
    const tbody = document.getElementById('hubRosterBody');
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-12 text-center text-slate-400">No students recorded for this session.</td></tr>';
        return;
    }

    const sessionId = document.getElementById('hubSessionFilter').value;

    tbody.innerHTML = records.map(r => {
        const fullName = escapeHtml((r.firstName || '') + " " + (r.lastName || ''));
        const email = escapeHtml(r.email || '');
        const matricule = escapeHtml(r.matricule || '—');
        const attended = r.hoursAttended || 0;
        const total    = r.totalHours || 1;

        let hourChecks = '';
        for (let i = 0; i < total; i++) {
            const slot = r.hourSlots ? r.hourSlots.find(h => h.hourIndex === i) : null;
            const isChecked = slot && slot.status === 'PRESENT';

            hourChecks += '<div class="flex flex-col items-center gap-1 scale-90">' +
                '<input type="checkbox" onchange="hubMarkHourStatus(' + sessionId + ',' + r.userId + ',' + i + ', this.checked)" ' +
                    (isChecked ? 'checked' : '') + ' ' +
                    'class="w-5 h-5 rounded-md border-slate-200 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500 hover:scale-110 transition-transform">' +
                '<span class="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">H' + (i+1) + '</span>' +
            '</div>';
        }

        return '<tr class="hover:bg-slate-50 transition border-b border-slate-50">' +
            '<td class="px-6 py-4">' +
                '<div class="font-bold text-slate-700">' + fullName + '</div>' +
                '<div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">' + email + '</div>' +
            '</td>' +
            '<td class="px-6 py-4 text-sm font-bold text-slate-500">' + matricule + '</td>' +
            '<td class="px-6 py-4">' +
                '<div class="flex items-center gap-1.5">' +
                    '<span class="text-sm font-black text-slate-800">' + attended + '</span>' +
                    '<span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">/ ' + total + 'h</span>' +
                '</div>' +
            '</td>' +
            '<td class="px-6 py-4 text-right">' +
                '<div class="flex items-center justify-end gap-3">' +
                    hourChecks +
                '</div>' +
            '</td>' +
        '</tr>';
    }).join('');
}

window.hubMarkHourStatus = function(sessionId, userId, hourIndex, isChecked) {
    const status = isChecked ? 'PRESENT' : 'ABSENT';
    const url = "/api/attendance/session/" + sessionId + "/student/" + userId + "/hour/" + hourIndex + "?status=" + status;

    fetch(url, { method: 'POST' })
        .then(res => {
            if (!res.ok) throw new Error();
            // Update the hours-attended counter in this student's row without a full reload
            const allCheckboxes = document.querySelectorAll(
                '#hubRosterBody input[type="checkbox"][onchange*="hubMarkHourStatus(' + sessionId + ',' + userId + '"]');
            const attendedCount = Array.from(allCheckboxes).filter(cb => cb.checked).length;
            // Find the attended cell (3rd td in the row) and update it
            if (allCheckboxes.length > 0) {
                const row = allCheckboxes[0].closest('tr');
                if (row) {
                    const attendedCell = row.querySelectorAll('td')[2];
                    if (attendedCell) {
                        const countSpan = attendedCell.querySelector('span.text-sm');
                        if (countSpan) countSpan.textContent = attendedCount;
                    }
                }
            }
        })
        .catch(() => {
            // Revert the checkbox to the state before the failed request
            const cb = document.querySelector(
                '#hubRosterBody input[type="checkbox"][onchange*="hubMarkHourStatus(' + sessionId + ',' + userId + ',' + hourIndex + '"]');
            if (cb) cb.checked = !isChecked;
            showNotification("Failed to update attendance. Change reverted.", "error");
        });
};

window.hubMarkAll = async function(status) {
    const sessionId = document.getElementById('hubSessionFilter').value;
    if (!sessionId) return;

    const result = await Swal.fire({
        title: `Mark All ${status === 'PRESENT' ? 'Present' : 'Absent'}?`,
        text: `This will update the entire roster for this session to ${status.toLowerCase()}.`,
        icon: status === 'PRESENT' ? 'info' : 'warning',
        showCancelButton: true,
        confirmButtonColor: status === 'PRESENT' ? '#3b82f6' : '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: `Mark All ${status === 'PRESENT' ? 'Present' : 'Absent'}`
    });
    if (!result.isConfirmed) return;

    // Snappy UI: Update all checkboxes immediately
    const checkboxes = document.querySelectorAll('#hubRosterBody input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = (status === 'PRESENT'));

    try {
        const res = await fetch("/api/attendance/session/" + sessionId + "/mark-all?status=" + status, { method: 'POST' });
        if (!res.ok) throw new Error();
        showNotification("All students and hours marked " + status.toLowerCase(), "success");
        loadHubRoster();
    } catch (e) {
        showNotification("Failed to update roster", "error");
        loadHubRoster(); // Reset on failure
    }
};

window.saveHubRoster = function() {
    showNotification("All changes are saved automatically.", "success");
};

window.exportHubAttendance = function() {
    const sessionId = document.getElementById('hubSessionFilter').value;
    if (!sessionId) return;
    window.open("/api/pedagog/sessions/" + sessionId + "/export", '_blank');
};

// ==========================================
// JUSTIFICATION REVIEW QUEUE
// ==========================================

window.loadJustifications = async function () {
    const container = document.getElementById('justificationQueueList');
    if (!container) return;

    const statusFilter = document.getElementById('justifStatusFilter')?.value || 'PENDING';
    
    container.innerHTML = `
        <div class="md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center py-14 bg-white rounded-2xl border border-slate-100 text-slate-400">
            <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p class="text-sm font-bold">Loading justifications...</p>
        </div>`;

    try {
        let url = '/api/justifications';
        if (statusFilter !== 'ALL') {
            url = `/api/justifications/status/${statusFilter}`;
        }
        url += '?size=50';

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load justifications');
        const page = await res.json();
        
        // Save raw list for frontend filtering
        window.rawJustifications = page.content || page;
        
        applyJustifFilters();
    } catch (e) {
        console.error('Justification queue error:', e);
        container.innerHTML = `
            <div class="md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center py-14 bg-white rounded-2xl border border-rose-100 text-rose-500">
                <svg class="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="text-sm font-bold">Failed to load queue: ${escapeHtml(e.message)}</p>
            </div>`;
    }
};

window.applyJustifFilters = function() {
    const searchText = document.getElementById('justifSearch')?.value.toLowerCase() || '';
    const specFilter = document.getElementById('justifSpecFilter')?.value || '';
    const classFilter = document.getElementById('justifClassFilter')?.value || '';
    
    const list = window.rawJustifications || [];
    
    const filtered = list.filter(item => {
        const studentName = (item.studentName || '').toLowerCase();
        const matricule = (item.studentMatricule || '').toLowerCase();
        const className = item.className || '';
        const specialityName = item.specialityName || '';
        
        const matchSearch = !searchText || studentName.includes(searchText) || matricule.includes(searchText);
        const matchSpec = !specFilter || specialityName === specFilter;
        const matchClass = !classFilter || className === classFilter;
        
        return matchSearch && matchSpec && matchClass;
    });
    
    renderJustificationQueue(filtered);
};


function renderJustificationQueue(list) {
    const container = document.getElementById('justificationQueueList');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="md:col-span-2 xl:col-span-3 flex flex-col items-center justify-center py-14 bg-white rounded-2xl border border-slate-100 text-slate-400">
                <svg class="w-12 h-12 mb-3 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="text-base font-black text-slate-600 mb-1">All caught up!</p>
                <p class="text-sm font-medium text-slate-400">No pending justifications to review.</p>
            </div>`;
        return;
    }

    container.innerHTML = list.map(j => {
        const slotLabel = (j.hourIndex != null)
            ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
                   <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                   Hour ${j.hourIndex + 1}
               </span>`
            : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                   All Hours
               </span>`;

        // j.documentPath is now a web URL like /uploads/uuid_file.pdf
        const docUrl = j.documentPath || null;
        const isImage = docUrl && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(docUrl);
        const isPdf   = docUrl && /\.pdf$/i.test(docUrl);
        let fileHtml = '';
        if (docUrl) {
            if (isImage) {
                fileHtml = `
                    <div class="mt-3">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Supporting Document</p>
                        <a href="${escapeHtml(docUrl)}" target="_blank" rel="noopener">
                            <img src="${escapeHtml(docUrl)}"
                                 alt="Justification document"
                                 class="w-full max-h-48 object-cover rounded-xl border border-slate-200 hover:border-[#00B0FF] transition cursor-zoom-in shadow-sm" />
                        </a>
                    </div>`;
            } else if (isPdf) {
                fileHtml = `
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                        <a href="${escapeHtml(docUrl)}" target="_blank" rel="noopener"
                           class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-bold hover:bg-red-100 transition">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            View PDF
                        </a>
                        <a href="${escapeHtml(docUrl)}" download
                           class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold hover:bg-slate-100 transition">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download
                        </a>
                    </div>`;
            } else {
                fileHtml = `
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                        <a href="${escapeHtml(docUrl)}" target="_blank" rel="noopener"
                           class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#00B0FF] border border-blue-100 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                            View Attachment
                        </a>
                        <a href="${escapeHtml(docUrl)}" download
                           class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold hover:bg-slate-100 transition">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download
                        </a>
                    </div>`;
            }
        }

        const dateStr = j.attendanceDate ? new Date(j.attendanceDate).toLocaleDateString() : '';
        const initials = (j.studentName || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

        return `
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group" id="justCard-${j.justificationId}">
            <!-- Card Header -->
            <div class="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B0FF] to-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-blue-500/20 shrink-0">${initials}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-black text-slate-800 leading-tight truncate">${escapeHtml(j.studentName || 'Unknown Student')}</p>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mt-0.5">${escapeHtml(j.courseName || '')} • ${escapeHtml(dateStr)}</p>
                </div>
                ${slotLabel}
            </div>

            <!-- Reason body -->
            <div class="px-5 py-4 flex-1">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Reason</p>
                <p class="text-sm text-slate-700 font-medium leading-relaxed line-clamp-3">${escapeHtml(j.reason || '—')}</p>
                ${fileHtml}
            </div>

            <!-- Actions -->
            <div class="px-5 py-4 border-t border-slate-50 flex gap-2">
                <button onclick="processJustification(${j.justificationId}, 'APPROVED')"
                        class="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                    Approve
                </button>
                <button onclick="processJustification(${j.justificationId}, 'REJECTED')"
                        class="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-md shadow-rose-500/20 flex items-center justify-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>
                    Reject
                </button>
            </div>
        </div>`;
    }).join('');
}

window.processJustification = async function (justificationId, decision) {
    const card = document.getElementById('justCard-' + justificationId);
    if (card) {
        const btns = card.querySelectorAll('button');
        btns.forEach(b => { b.disabled = true; b.classList.add('opacity-50'); });
    }

    try {
        const res = await fetch(`/api/pedagog/justifications/${justificationId}/${decision === 'APPROVED' ? 'approve' : 'reject'}`, {
            method: 'POST'
        });
        if (!res.ok) throw new Error(await res.text());

        // Animate card out
        if (card) {
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.remove(), 320);
        }

        const isApproved = decision === 'APPROVED';
        showNotification(
            isApproved ? 'Justification approved ✓' : 'Justification rejected',
            isApproved ? 'success' : 'info'
        );

        // If queue is now empty, show empty state
        setTimeout(() => {
            const remaining = document.querySelectorAll('#justificationQueueList [id^="justCard-"]');
            if (remaining.length === 0) renderJustificationQueue([]);
        }, 400);

    } catch (e) {
        console.error('Process justification error:', e);
        showNotification('Failed to process: ' + e.message, 'error');
        if (card) {
            const btns = card.querySelectorAll('button');
            btns.forEach(b => { b.disabled = false; b.classList.remove('opacity-50'); });
        }
    }
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

// ==========================================
// REAL-TIME NOTIFICATIONS
// ==========================================

let allNotifications = [];

window.initializeNotifications = function() {
    console.log("Initializing Real-Time Notifications...");

    // Initial load of notifications to display the badge count immediately
    loadNotifications();

    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
        console.warn("WebSocket libraries not loaded yet. Retrying in 2s...");
        setTimeout(initializeNotifications, 2000);
        return;
    }

    const socket = new SockJS('/ws');
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, function (frame) {
        console.log('Connected to WebSocket');

        // Subscribe to user-specific notifications
        stompClient.subscribe('/user/queue/notifications', function (msg) {
            const notification = JSON.parse(msg.body);
            handleIncomingNotification(notification);
        });

        // Subscribe to justifications
        stompClient.subscribe('/topic/justifications', function (msg) {
            console.log('New Justification received via WebSocket');
            const currentSection = new URLSearchParams(window.location.search).get('section');
            if (currentSection === 'justifications' || document.getElementById('section-justifications')?.offsetParent !== null) {
                loadJustifications();
            }
        });

        // Subscribe to sessions
        stompClient.subscribe('/topic/sessions', function (msg) {
            console.log('Session update received via WebSocket');
            const currentSection = new URLSearchParams(window.location.search).get('section');
            if (currentSection === 'sessions' || document.getElementById('section-sessions')?.offsetParent !== null) {
                if (typeof loadSessionsMonitor === 'function') loadSessionsMonitor();
            }
        });
    }, function (error) {
        console.error('WebSocket connection error:', error);
        // Retry connection after 5s
        setTimeout(initializeNotifications, 5000);
    });

    // Toggle Notification Dropdown
    const notifBtn = document.getElementById('notification-btn');
    const notifPanel = document.getElementById('notification-panel');

    if (notifBtn && notifPanel) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('hidden');
            if (!notifPanel.classList.contains('hidden')) {
                loadNotifications();
            }
        });

        document.addEventListener('click', (e) => {
            if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
                notifPanel.classList.add('hidden');
            }
        });
    }
};

function handleIncomingNotification(n) {
    console.log("New Notification:", n);

    Swal.fire({
        title: 'New Notification',
        text: n.message,
        icon: n.type === 'ATTENDANCE_SUBMITTED' ? 'success' : 'info',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        customClass: { popup: 'rounded-xl shadow-lg' }
    });

    // Update UI (e.g., refresh sessions if on that page)
    const currentSection = new URLSearchParams(window.location.search).get('section');
    if (currentSection === 'sessions' || document.getElementById('section-sessions')?.offsetParent !== null) {
        if (typeof loadSessionsMonitor === 'function') loadSessionsMonitor();
    }

    loadNotifications();
}

window.loadNotifications = function() {
    fetch('/api/notifications/my')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            allNotifications = data || [];
            renderNotifications();
        })
        .catch(err => console.error('Error fetching notifications:', err));
};

function renderNotifications() {
    const listEl = document.getElementById('notification-list');
    const badgeEl = document.getElementById('notif-count-badge');
    if (!listEl) return;

    listEl.innerHTML = '';
    const unreadCount = allNotifications.filter(n => !n.isRead).length;

    if (badgeEl) {
        if (unreadCount > 0) {
            badgeEl.textContent = unreadCount;
            badgeEl.style.display = 'flex';
        } else {
            badgeEl.style.display = 'none';
        }
    }

    if (allNotifications.length === 0) {
        listEl.innerHTML = `
            <div class="p-8 text-center text-slate-400">
                <p class="text-xs font-bold">No new notifications</p>
            </div>`;
        return;
    }

    allNotifications.forEach(n => {
        const item = document.createElement('div');
        item.className = `p-4 flex flex-col gap-1.5 transition-colors cursor-pointer hover:bg-slate-50/50 ${n.isRead ? 'opacity-60' : 'bg-blue-50/10'}`;
        item.onclick = (e) => {
            e.stopPropagation();
            markNotificationRead(n.notificationId);
        };

        // Parse notification type for icon
        let iconHtml = '';
        if (n.type === 'TIMETABLE') {
            iconHtml = '<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-250">Timetable</span>';
        } else if (n.type === 'ANNOUNCEMENT') {
            iconHtml = '<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-250">Announcement</span>';
        } else {
            iconHtml = '<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-250">Notice</span>';
        }

        item.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                ${iconHtml}
                <span class="text-[10px] text-slate-400 font-bold">${new Date(n.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="text-xs font-semibold text-slate-700 leading-relaxed">${escapeHtml(n.message)}</p>
        `;
        listEl.appendChild(item);
    });
}

window.markNotificationRead = function(id) {
    fetch(`/api/notifications/${id}/read`, { method: 'POST' })
        .then(response => {
            if (response.ok) {
                allNotifications = allNotifications.map(n => n.notificationId === id ? { ...n, isRead: true } : n);
                renderNotifications();
            }
        })
        .catch(err => console.error('Error marking notification as read:', err));
};

window.markAllNotificationsRead = function() {
    fetch('/api/notifications/read-all', { method: 'POST' })
        .then(response => {
            if (response.ok) {
                allNotifications = allNotifications.map(n => ({ ...n, isRead: true }));
                renderNotifications();
            }
        })
        .catch(err => console.error('Error marking all notifications as read:', err));
}

// ==========================================
// ATTENDANCE STATISTICS MODULE
// ==========================================

window.loadStatsWeeks = async function() {
    try {
        const response = await fetch('/api/pedagog/stats/weeks');
        if (response.ok) {
            const weeks = await response.json();
            const filter = document.getElementById('statsWeekFilter');
            if (filter) {
                // Keep "All Weeks" (first option)
                const firstOption = filter.options[0];
                filter.innerHTML = '';
                filter.appendChild(firstOption);

                weeks.forEach(w => {
                    const opt = document.createElement('option');
                    opt.value = w;
                    opt.textContent = `Week ${w}`;
                    filter.appendChild(opt);
                });
            }
        }
    } catch (e) {
        console.error("Error loading completed weeks:", e);
    }
};

// ==========================================
// ATTENDANCE STATISTICS MODULE
// ==========================================

window.currentStatsData = [];
window.isStatsDetailed = false;

window.onStatsSpecChange = function() {
    const specId = document.getElementById('statsSpecFilter').value;

    // Update Classroom Select
    const classSelect = document.getElementById('statsClassFilter');
    if (!classSelect) return;
    classSelect.innerHTML = '<option value="">All Classrooms</option>';

    const sourceSelect = document.getElementById('emailClassSelect') || document.getElementById('ttClassSelect');
    if (sourceSelect) {
        Array.from(sourceSelect.options).forEach(opt => {
            if (!opt.value) return;
            const optSpecId = opt.getAttribute('data-spec');
            if (!specId || optSpecId === specId) {
                const newOpt = document.createElement('option');
                newOpt.value = opt.value;
                newOpt.textContent = opt.textContent;
                // Preserve level data for classroom
                newOpt.setAttribute('data-level', opt.getAttribute('data-level') || '0');
                classSelect.appendChild(newOpt);
            }
        });
    }

    // Update Course Select (all for spec)
    const courseSelect = document.getElementById('statsCourseFilter');
    if (!courseSelect) return;
    courseSelect.innerHTML = '<option value="">All Courses</option>';

    if (specId) {
        fetch(`/api/pedagog/courses/filter?specialityId=${specId}`)
            .then(res => res.json())
            .then(courses => {
                courses.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.courseId;
                    opt.textContent = c.courseName;
                    courseSelect.appendChild(opt);
                });
            });
    }

    loadAttendanceStats();
};

window.onStatsClassChange = function() {
    const specId = document.getElementById('statsSpecFilter').value;
    const classSelect = document.getElementById('statsClassFilter');
    const selectedOpt = classSelect.options[classSelect.selectedIndex];
    const level = selectedOpt ? selectedOpt.getAttribute('data-level') : null;

    // Update Course Select based on LEVEL of selected classroom
    const courseSelect = document.getElementById('statsCourseFilter');
    if (!courseSelect) return;
    courseSelect.innerHTML = '<option value="">All Courses</option>';

    if (specId) {
        let url = `/api/pedagog/courses/filter?specialityId=${specId}`;
        if (level && level !== "0") url += `&level=${level}`;

        fetch(url)
            .then(res => res.json())
            .then(courses => {
                courses.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.courseId;
                    opt.textContent = c.courseName;
                    courseSelect.appendChild(opt);
                });
            });
    }

    loadAttendanceStats();
};

window.loadAttendanceStats = async function() {
    const specId = document.getElementById('statsSpecFilter')?.value;
    const roomId = document.getElementById('statsClassFilter')?.value;
    const courseId = document.getElementById('statsCourseFilter')?.value;
    const week = document.getElementById('statsWeekFilter')?.value;

    const tableBody = document.getElementById('statsTableBody');
    const searchContainer = document.getElementById('statsSearchContainer');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="3" class="px-8 py-12 text-center text-slate-400">
                <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p class="font-bold text-sm">Aggregating department data...</p>
            </td>
        </tr>
    `;

    // Mode: Aggregated (per course) vs Detailed (per student)
    window.isStatsDetailed = (roomId && courseId);

    // UI: Toggle Search Bar
    if (searchContainer) {
        if (window.isStatsDetailed) {
            searchContainer.classList.remove('hidden');
        } else {
            searchContainer.classList.add('hidden');
            const searchInput = document.getElementById('statsStudentSearch');
            if (searchInput) searchInput.value = '';
        }
    }

    let url = window.isStatsDetailed ? `/api/pedagog/stats/students?` : `/api/pedagog/stats/attendance?`;

    if (specId && !window.isStatsDetailed) url += `specialityId=${specId}&`;
    if (roomId) url += `classroomId=${roomId}&`;
    if (courseId) url += `courseId=${courseId}&`;
    if (week) url += `week=${week}&`;

    try {
        const response = await fetch(url);
        if (response.ok) {
            window.currentStatsData = await response.json();
            renderStatsTable(window.currentStatsData, window.isStatsDetailed);
        } else {
            tableBody.innerHTML = '<tr><td colspan="3" class="px-8 py-12 text-center text-rose-500 font-bold">Failed to load statistics.</td></tr>';
        }
    } catch (e) {
        console.error("Error loading stats:", e);
        tableBody.innerHTML = '<tr><td colspan="3" class="px-8 py-12 text-center text-rose-500 font-bold">An unexpected error occurred.</td></tr>';
    }
};

window.onStatsSearch = function() {
    const query = document.getElementById('statsStudentSearch').value.toLowerCase().trim();
    if (!window.isStatsDetailed) return;

    if (!query) {
        renderStatsTable(window.currentStatsData, true);
        return;
    }

    const filtered = window.currentStatsData.filter(s => {
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const matricule = (s.matricule || '').toLowerCase();
        return fullName.includes(query) || matricule.includes(query);
    });

    renderStatsTable(filtered, true);
};

function renderStatsTable(stats, isDetailedMode) {
    const body = document.getElementById('statsTableBody');
    const headerOne = document.getElementById('statsHeaderOne');

    if (!body) return;
    if (headerOne) {
        headerOne.textContent = isDetailedMode ? 'STUDENT' : 'TARGET CONTEXT';
    }

    if (stats.length === 0) {
        body.innerHTML = '<tr><td colspan="3" class="px-8 py-16 text-center text-slate-400 font-bold">No attendance data found for the selected filters.</td></tr>';
        return;
    }

    body.innerHTML = stats.map(s => {
        const pct = Math.round(s.attendanceRate);
        const gradient = pct < 60 ? 'from-rose-400 to-rose-600' : (pct < 80 ? 'from-amber-400 to-amber-600' : 'from-blue-400 to-blue-600');

        const title = isDetailedMode ? `${s.firstName} ${s.lastName}` : s.courseName;
        const subTitle = isDetailedMode
            ? `<span class="text-blue-500 font-black">${escapeHtml(s.matricule || 'NO MATRICULE')}</span>`
            : `<span class="text-blue-500">${escapeHtml(s.classroomName)}</span><span class="w-1 h-1 bg-slate-200 rounded-full mx-2"></span><span>${escapeHtml(s.specialityName)}</span>`;

        const avatarIcon = isDetailedMode
            ? `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>`
            : `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>`;

        return `
            <tr class="hover:bg-slate-50/50 transition-all duration-200 group">
                <td class="px-8 py-6 text-left">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:scale-110 transition-transform">
                            ${avatarIcon}
                        </div>
                        <div>
                            <p class="font-black text-slate-800 text-base leading-tight">${escapeHtml(title)}</p>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1.5 flex items-center">
                                ${subTitle}
                            </p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-6">
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center justify-between text-xs font-black">
                            <span class="text-slate-800">${pct}% <span class="text-slate-400 font-bold ml-1 tracking-tight">Yield</span></span>
                        </div>
                        <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                            <div class="h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-1000 ease-out shadow-lg"
                                 style="width: 0%;"
                                 data-width="${pct}%">
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-6 text-right">
                    <div class="inline-flex flex-col items-end">
                        <span class="text-lg font-black text-slate-800 tracking-tighter">${s.attendedHours}h</span>
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ ${s.plannedHours}h Total</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    setTimeout(() => {
        body.querySelectorAll('[data-width]').forEach(el => {
            el.style.width = el.getAttribute('data-width');
        });
    }, 100);
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// STUDENT MIGRATION UI LOGIC
// ==========================================

let migrationStudentsData = []; // Store currently loaded eligible students

window.loadMigrationData = async function () {
    try {
        // Load Academic Years — use the pedagog-accessible endpoint
        const response = await fetch('/api/pedagog/academic-years');
        if (!response.ok) throw new Error("Failed to fetch academic years");

        const years = await response.json();
        const yearSelect = document.getElementById('migrationAcademicYearSelect');
        if (yearSelect) {
            yearSelect.innerHTML = '<option value="">Select Academic Year to View...</option>';
            // Sort: active first, then by start date descending
            years.sort((a, b) => {
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                return (b.startDate || '').localeCompare(a.startDate || '');
            });
            years.forEach(year => {
                const opt = document.createElement('option');
                opt.value = year.id;  // AcademicYearDto field is 'id'
                opt.textContent = `${year.academicYear}${year.isActive ? ' (Current)' : ''}`;
                if (year.isActive) {
                    opt.selected = true; // Pre-select the active year
                }
                yearSelect.appendChild(opt);
            });
        }

    } catch (e) {
        console.error("Error loading migration prerequisite data:", e);
        showMigrationNotification("Error loading academic years.", "error");
    }
};

window.toggleAutoNextLevel = function () {
    const btn = document.getElementById('toggleAutoNextLevelBtn');
    const container = document.getElementById('targetClassroomContainer');
    const ts = window.tsInstances && window.tsInstances['migrationToClassSelect'];
    const select = document.getElementById('migrationToClassSelect');

    // Toggle state
    const isAuto = btn.getAttribute('aria-checked') === 'true';
    const newState = !isAuto;

    btn.setAttribute('aria-checked', newState.toString());

    if (newState) {
        // Turn ON Auto
        btn.classList.remove('bg-slate-200');
        btn.classList.add('bg-emerald-600');
        btn.querySelector('span').classList.remove('translate-x-0');
        btn.querySelector('span').classList.add('translate-x-5');

        container.style.opacity = '0.5';
        if (ts) { ts.disable(); ts.setValue(''); } else { select.disabled = true; select.value = ''; }
    } else {
        // Turn OFF Auto
        btn.classList.remove('bg-emerald-600');
        btn.classList.add('bg-slate-200');
        btn.querySelector('span').classList.remove('translate-x-5');
        btn.querySelector('span').classList.add('translate-x-0');

        container.style.opacity = '1';
        // Re-trigger eligible targets for the currently selected source classroom
        const fromClassroomId = document.getElementById('migrationFromClassSelect')?.value;
        if (fromClassroomId) {
            loadEligibleTargetClassrooms(fromClassroomId);
        } else {
            if (ts) ts.enable(); else select.disabled = false;
        }
    }
};

/**
 * Fetch classrooms eligible as migration targets for the given source classroom
 * (same speciality, level = source level + 1) and repopulate the target select.
 * Uses TomSelect API when the instance exists, falls back to native select otherwise.
 */
async function loadEligibleTargetClassrooms(classroomId) {
    const select = document.getElementById('migrationToClassSelect');
    if (!select) return;

    // Use TomSelect API when available (it manages the visible UI)
    const ts = window.tsInstances && window.tsInstances['migrationToClassSelect'];

    // Helper: set a single placeholder option and optionally disable
    function setPlaceholder(text, disabled = true) {
        if (ts) {
            ts.clearOptions();
            ts.addOption({ value: '', text });
            ts.setValue('', true);
            if (disabled) ts.disable(); else ts.enable();
        } else {
            select.innerHTML = `<option value="">${text}</option>`;
            select.disabled = disabled;
        }
    }

    // Auto-next-level mode manages its own state — skip when enabled
    const autoBtn = document.getElementById('toggleAutoNextLevelBtn');
    if (autoBtn && autoBtn.getAttribute('aria-checked') === 'true') return;

    if (!classroomId) {
        setPlaceholder('\u2014 Select a source classroom first \u2014', true);
        return;
    }

    setPlaceholder('Loading eligible classrooms...', true);

    try {
        const res = await fetch(`/api/pedagog/classrooms/eligible-targets?fromClassroomId=${classroomId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const classrooms = await res.json();

        if (classrooms.length === 0) {
            setPlaceholder('No next-level classrooms found in this speciality', true);
            return;
        }

        if (ts) {
            ts.clearOptions();
            ts.addOption({ value: '', text: 'Select destination classroom...' });
            classrooms.forEach(c => {
                ts.addOption({
                    value: String(c.classId),
                    text: `${c.name}  \u2014  Level ${c.level}  (${c.specialityName || 'Same speciality'})`
                });
            });
            ts.refreshOptions(false);
            ts.setValue('', true);
            ts.enable();
        } else {
            select.innerHTML = '<option value="">Select destination classroom...</option>';
            classrooms.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.classId;
                opt.textContent = `${c.name}  \u2014  Level ${c.level}  (${c.specialityName || 'Same speciality'})`;
                select.appendChild(opt);
            });
            select.disabled = false;
        }
    } catch (e) {
        console.error('Failed to load eligible target classrooms:', e);
        setPlaceholder(`Error loading classrooms (${e.message})`, false); // enable so user isn't stuck
    }
}

window.loadClassroomStudentsForMigration = async function (classroomId) {
    const tableBody = document.getElementById('migrationStudentsTableBody');
    const tableEl = document.getElementById('migrationStudentsTable');
    const emptyState = document.getElementById('migrationEmptyState');
    const loader = document.getElementById('migrationTableLoader');
    const executeBtn = document.getElementById('executeMigrationBtn');
    const selectAllCbx = document.getElementById('selectAllMigrationStudents');

    migrationStudentsData = []; // Clear current
    updateMigrationSelectionCount();

    // Always refresh eligible target classrooms when source changes
    loadEligibleTargetClassrooms(classroomId);

    if (!classroomId) {
        emptyState.classList.remove('hidden');
        tableEl.style.display = 'none';
        executeBtn.disabled = true;
        executeBtn.classList.add('cursor-not-allowed', 'opacity-50');
        return;
    }

    try {
        loader.classList.remove('hidden');

        // Include the selected academic year so the backend can filter appropriately
        const academicYearId = document.getElementById('migrationAcademicYearSelect')?.value || '';
        const url = academicYearId
            ? `/api/migration/classroom/${classroomId}/students?academicYearId=${academicYearId}`
            : `/api/migration/classroom/${classroomId}/students`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load students");

        migrationStudentsData = await response.json();

        if (migrationStudentsData.length === 0) {
            emptyState.classList.remove('hidden');
            emptyState.innerHTML = `
                <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <h4 class="text-lg font-bold text-slate-600 mb-1">No Students Found</h4>
                <p class="text-sm font-medium">This classroom is currently empty.</p>
            `;
            tableEl.style.display = 'none';
        } else {
            emptyState.classList.add('hidden');
            tableEl.style.display = 'table';

            // Build Rows
            tableBody.innerHTML = migrationStudentsData.map(student => `
                <tr class="hover:bg-slate-50 transition border-b border-slate-50 last:border-0 group">
                    <td class="px-6 py-4">
                        <div class="flex items-center">
                            <input type="checkbox" value="${student.studentId}" onchange="updateMigrationSelectionCount()"
                                class="migration-student-cbx w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-300 cursor-pointer">
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs uppercase">
                                ${student.fullName.substring(0, 2)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-slate-800 leading-tight">${student.fullName}</p>
                                <p class="text-[10px] uppercase tracking-widest text-slate-500">${student.email || 'N/A'}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black font-mono tracking-widest border border-slate-200">
                            ${student.matricule}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="viewStudentMigrationHistory(${student.studentId}, '${escapeHtml(student.fullName)}')"
                                class="text-xs font-bold text-slate-400 hover:text-emerald-600 flex items-center justify-end gap-1 w-full transition-colors group-hover:text-emerald-500">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            History
                        </button>
                    </td>
                </tr>
            `).join('');

            selectAllCbx.checked = false;
        }

    } catch (e) {
        console.error("Error loading eligible students:", e);
        showMigrationNotification("Error loading eligible students.", "error");
    } finally {
        loader.classList.add('hidden');
    }
};

window.toggleAllMigrationStudents = function () {
    const selectAll = document.getElementById('selectAllMigrationStudents').checked;
    const checkboxes = document.querySelectorAll('.migration-student-cbx');
    checkboxes.forEach(cbx => cbx.checked = selectAll);
    updateMigrationSelectionCount();
};

window.updateMigrationSelectionCount = function () {
    const checkboxes = document.querySelectorAll('.migration-student-cbx:checked');
    const badge = document.getElementById('migrationSelectedCountBadge');
    const executeBtn = document.getElementById('executeMigrationBtn');

    if (checkboxes.length > 0) {
        badge.textContent = `${checkboxes.length} Selected`;
        badge.classList.remove('hidden');
        executeBtn.disabled = false;
        executeBtn.classList.remove('cursor-not-allowed', 'opacity-50');
    } else {
        badge.classList.add('hidden');
        executeBtn.disabled = true;
        executeBtn.classList.add('cursor-not-allowed', 'opacity-50');
    }

    // Check 'Select All' sync
    const allCbx = document.getElementById('selectAllMigrationStudents');
    if (document.querySelectorAll('.migration-student-cbx').length > 0) {
        allCbx.checked = document.querySelectorAll('.migration-student-cbx').length === checkboxes.length;
    }
};

let migrationConfirmResolver = null;

window.showMigrationConfirmModal = function(count) {
    return new Promise((resolve) => {
        migrationConfirmResolver = resolve;
        document.getElementById('migrationConfirmText').innerHTML = `You are about to migrate <b>${count}</b> student(s).<br>Are you strictly sure to proceed?`;

        const modal = document.getElementById('migrationConfirmModal');
        const content = document.getElementById('migrationConfirmModalContent');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    });
};

window.closeMigrationConfirmModal = function(isConfirmed) {
    const modal = document.getElementById('migrationConfirmModal');
    const content = document.getElementById('migrationConfirmModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (migrationConfirmResolver) {
            migrationConfirmResolver(isConfirmed);
            migrationConfirmResolver = null;
        }
    }, 300);
};

window.showMigrationResultModal = function(isSuccess, title, message, results) {
    const modal = document.getElementById('migrationResultModal');
    const content = document.getElementById('migrationResultModalContent');
    const iconContainer = document.getElementById('migrationResultIcon');
    const titleEl = document.getElementById('migrationResultTitle');
    const textEl = document.getElementById('migrationResultText');
    const recapContainer = document.getElementById('migrationRecapContainer');
    const recapList = document.getElementById('migrationRecapList');

    titleEl.textContent = title;
    textEl.textContent = message;

    if (isSuccess) {
        iconContainer.className = 'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-100 text-emerald-500';
        iconContainer.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    } else {
        iconContainer.className = 'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-100 text-red-500';
        iconContainer.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    }

    // Render per-student recap — only the students involved in this migration
    if (results && results.length > 0) {
        recapList.innerHTML = '';
        results.forEach(r => {
            const row = document.createElement('div');
            const statusColor = r.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700';
            const statusIcon = r.success
                ? '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>'
                : '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>';
            row.className = `flex items-start gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${statusColor}`;
            row.innerHTML = `
                ${statusIcon}
                <div class="flex-1 min-w-0">
                    <span class="font-bold truncate block">${r.studentName || 'Student #' + r.studentId}</span>
                    ${r.success
                        ? `<span class="text-slate-500">${r.fromClassroom} \u2192 ${r.toClassroom}</span>`
                        : `<span class="opacity-75">${r.message}</span>`
                    }
                </div>`;
            recapList.appendChild(row);
        });
        recapContainer.classList.remove('hidden');
    } else {
        recapContainer.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeMigrationResultModal = function() {
    const modal = document.getElementById('migrationResultModal');
    const content = document.getElementById('migrationResultModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.executeMigration = async function () {
    // Collect Data
    const fromClassroomId = document.getElementById('migrationFromClassSelect').value;
    const toClassroomId = document.getElementById('migrationToClassSelect').value;
    const academicYearId = document.getElementById('migrationAcademicYearSelect').value;
    const reason = document.getElementById('migrationReason').value;
    const isAutoLevel = document.getElementById('toggleAutoNextLevelBtn').getAttribute('aria-checked') === 'true';

    const selectedIds = Array.from(document.querySelectorAll('.migration-student-cbx:checked'))
                             .map(cbx => parseInt(cbx.value));

    // Validation
    if (!fromClassroomId) { showMigrationNotification("Please select a source classroom."); return; }
    if (!academicYearId) { showMigrationNotification("Please select an academic year."); return; }
    if (!reason.trim()) { showMigrationNotification("Please enter a valid reason for the migration."); return; }
    if (!isAutoLevel && !toClassroomId) { showMigrationNotification("Please select a target classroom or enable Auto-Next Level."); return; }
    if (selectedIds.length === 0) { showMigrationNotification("Please select at least one student to migrate."); return; }

    const payload = {
        studentIds: selectedIds,
        fromClassroomId: parseInt(fromClassroomId),
        toClassroomId: isAutoLevel ? null : parseInt(toClassroomId),
        academicYearId: parseInt(academicYearId),
        reason: reason,
        autoNextLevel: isAutoLevel
    };

    const isConfirmed = await showMigrationConfirmModal(selectedIds.length);

    if (!isConfirmed) return;

    try {
        const executeBtn = document.getElementById('executeMigrationBtn');
        const originalText = executeBtn.innerHTML;
        executeBtn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Processing...</span>';
        executeBtn.disabled = true;

        const response = await fetch('/api/migration/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Bulk migration backend error");
        }

        const results = await response.json();
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        if (failCount > 0) {
            // Show partial result with recap of every student (success + failures)
            showMigrationResultModal(false, 'Partial Success', `${successCount} migrated successfully, ${failCount} failed.`, results);
            console.warn("Migration Failures:", results.filter(r => !r.success));
        } else {
            // Show success recap listing only the students that were migrated
            showMigrationResultModal(true, 'Migration Successful', `Successfully migrated ${successCount} student(s)!`, results);

            // Clean up UI state
            document.getElementById('migrationReason').value = "";
            document.getElementById('migrationToClassSelect').value = "";
            // Reload the source classroom roster since students moved out
            loadClassroomStudentsForMigration(fromClassroomId);
        }

    } catch (e) {
        console.error("Migration Error:", e);
        showMigrationResultModal(false, 'System Error', "An error occurred during migration: " + e.message);
    } finally {
        const executeBtn = document.getElementById('executeMigrationBtn');
        executeBtn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span>Execute Migration</span>`;
        // updateMigrationSelectionCount will re-disable it if needed
        updateMigrationSelectionCount();
    }
};

window.viewStudentMigrationHistory = async function (studentId, studentName) {
    const modal = document.getElementById('migrationHistoryModal');
    const content = document.getElementById('migrationHistoryModalContent');
    const timeline = document.getElementById('migrationHistoryTimeline');
    const loader = document.getElementById('migrationHistoryLoader');
    const empty = document.getElementById('migrationHistoryEmpty');
    const nameLabel = document.getElementById('migrationHistoryStudentName');

    nameLabel.textContent = `${studentName} - Transfer Logs`;
    timeline.innerHTML = '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);

    try {
        loader.classList.remove('hidden');
        timeline.classList.add('hidden');
        empty.classList.add('hidden');

        const response = await fetch(`/api/migration/history/${studentId}`);
        if (!response.ok) throw new Error("Failed to fetch history");

        const records = await response.json();

        if (records.length === 0) {
            empty.classList.remove('hidden');
        } else {
            timeline.classList.remove('hidden');
            timeline.innerHTML = records.map(record => `
                <div class="relative">
                    <div class="absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-4 border-white shadow-sm"></div>
                    <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                        <div class="flex justify-between items-start mb-3">
                            <span class="inline-flex items-center px-2.5 py-1 rounded bg-slate-50 text-slate-500 text-[10px] font-black tracking-widest border border-slate-200 uppercase">
                                Academic Year: ${record.academicYear || 'N/A'}
                            </span>
                            <span class="text-[10px] font-bold text-slate-400">
                                ${new Date(record.migratedAt).toLocaleDateString()}
                            </span>
                        </div>

                        <div class="flex items-center gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div class="flex-1">
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">From</p>
                                <p class="text-sm font-black text-slate-700">${record.fromClassroom}</p>
                            </div>
                            <div class="text-emerald-400">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </div>
                            <div class="flex-1 text-right">
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">To</p>
                                <p class="text-sm font-black text-emerald-700">${record.toClassroom}</p>
                            </div>
                        </div>

                        <div class="space-y-1">
                            <p class="text-xs text-slate-600 font-medium">
                                <span class="text-slate-400 font-bold">Reason:</span> ${record.reason || 'No reason provided'}
                            </p>
                            <p class="text-[10px] text-slate-400 font-bold">
                                Executed by: ${record.migratedBy || 'System'}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("Error loading history:", e);
        empty.classList.remove('hidden');
        empty.innerHTML = `<p class="text-red-500 font-bold text-sm">Failed to load migration history records.</p>`;
    } finally {
        loader.classList.add('hidden');
    }
};

window.closeMigrationHistoryModal = function () {
    const modal = document.getElementById('migrationHistoryModal');
    const content = document.getElementById('migrationHistoryModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.showMigrationNotification = function (message, type = "error") {
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        icon: type,
        title: message,
        customClass: {
            popup: 'rounded-xl shadow-2xl',
            title: 'text-sm font-bold text-slate-700'
        }
    });
};

// ==========================================
// Delegate Toggle Logic
// ==========================================
window.toggleDelegate = async function (studentId, currentStatus, btnElement) {
    try {
        const response = await fetch('/api/pedagog/students/' + studentId + '/delegate?isDelegate=' + currentStatus, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]')?.content || ''
            }
        });

        if (response.ok) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                icon: 'success',
                title: currentStatus ? 'Delegate assigned successfully' : 'Delegate removed successfully'
            });
            // Flip the status visually for the next click
            btnElement.setAttribute('data-is-delegate', (!currentStatus).toString());
            if (currentStatus) {
                btnElement.classList.remove('text-slate-400');
                btnElement.classList.add('text-amber-500');
            } else {
                btnElement.classList.remove('text-amber-500');
                btnElement.classList.add('text-slate-400');
            }
        } else {
            const data = await response.json();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.error || 'Failed to update delegate status.'
            });
        }
    } catch (e) {
        console.error('Delegate Toggle Error:', e);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred.'
        });
    }
};

/**
 * Handle Edit Student Profile
 */
window.openEditStudentModal = async function(studentId) {
    try {
        const response = await fetch(`/api/pedagog/students/${studentId}`);
        if (!response.ok) throw new Error('Failed to fetch student details');
        const student = await response.json();
        
        window._currentEditStudent = student;

        document.getElementById('editStudentId').value = student.userId || '';
        document.getElementById('editStudentFirstName').value = student.firstName || '';
        document.getElementById('editStudentLastName').value = student.lastName || '';
        document.getElementById('editStudentEmail').value = student.email || '';
        document.getElementById('editStudentMatricule').value = student.matricule || '';
        
        // If student is assigned to a classroom, set the selector, otherwise empty string
        const classroomSelect = document.getElementById('editStudentClassroom');
        if(student.classroomId) {
            classroomSelect.value = student.classroomId;
        } else {
            classroomSelect.value = '';
        }

        const modal = document.getElementById('editStudentModal');
        const content = document.getElementById('editStudentModalContent');
        modal.classList.remove('hidden');
        
        requestAnimationFrame(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        });
    } catch (error) {
        console.error('Error viewing student for edit:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
                icon: 'error', title: 'Could not load student details'
            });
        }
    }
};

window.closeEditStudentModal = function() {
    const modal = document.getElementById('editStudentModal');
    const content = document.getElementById('editStudentModalContent');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('editStudentForm').reset();
        window._currentEditStudent = null;
    }, 300);
};

window.submitEditStudent = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('editStudentSubmitBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Saving...';

    const studentId = document.getElementById('editStudentId').value;
    const newEmail = document.getElementById('editStudentEmail').value.trim();
    const data = {
        ...(window._currentEditStudent || {}),
        firstName: document.getElementById('editStudentFirstName').value.trim(),
        lastName: document.getElementById('editStudentLastName').value.trim(),
        email: newEmail,
        username: newEmail,
        matricule: document.getElementById('editStudentMatricule').value.trim(),
        classroomId: document.getElementById('editStudentClassroom').value || null
    };

    try {
        const response = await fetch(`/api/users/${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]')?.content || ''
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
                icon: 'success', title: 'Student updated successfully'
            });
            closeEditStudentModal();
            setTimeout(() => window.location.reload(), 1500);
        } else {
            const errData = await response.json();
            throw new Error(errData.message || 'Failed to update student');
        }
    } catch (error) {
        console.error('Update error:', error);
        Swal.fire({
            icon: 'error', title: 'Update Failed', text: error.message
        });
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// ==========================================
// Announcement Logic
// ==========================================
let announcementFiles = [];

window.handleAnnouncementFileSelection = function(input) {
    const files = Array.from(input.files);
    let totalSize = announcementFiles.reduce((sum, f) => sum + f.size, 0);

    for (let f of files) {
        if (totalSize + f.size > 10 * 1024 * 1024) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Total file size exceeds 10MB limit.', showConfirmButton: false, timer: 3000 });
            continue;
        }
        announcementFiles.push(f);
        totalSize += f.size;
    }
    
    input.value = ''; // Reset input
    renderAnnouncementFileList();
};

function renderAnnouncementFileList() {
    const list = document.getElementById('announce-file-list');
    if (!list) return;
    
    if (announcementFiles.length === 0) {
        list.innerHTML = '';
        return;
    }

    list.innerHTML = announcementFiles.map((file, index) => `
        <div class="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl border border-slate-200">
            <div class="flex items-center gap-2 overflow-hidden">
                <svg class="w-4 h-4 text-[#00B0FF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span class="text-xs font-semibold text-slate-700 truncate">${file.name}</span>
                <span class="text-[10px] text-slate-400 font-bold">(${Math.round(file.size / 1024)} KB)</span>
            </div>
            <button type="button" onclick="removeAnnouncementFile(${index})" class="text-slate-400 hover:text-red-500 transition-colors p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    `).join('');
}

window.removeAnnouncementFile = function(index) {
    announcementFiles.splice(index, 1);
    renderAnnouncementFileList();
};

window.sendAnnouncement = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('announce-submit-btn');
    const originalText = btn.innerHTML;
    
    const target = document.getElementById('announce-target').value;
    const title = document.getElementById('announce-title').value.trim();
    const message = document.getElementById('announce-message').value.trim();
    const classroomId = document.getElementById('announce-classroom').value || null;

    if (!title || !message) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Subject and message are required.', showConfirmButton: false, timer: 3000 });
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Sending...`;

    try {
        const formData = new FormData();
        formData.append('targetType', target);
        formData.append('subject', title);
        formData.append('content', message);
        if (classroomId) formData.append('classroomId', classroomId);
        
        announcementFiles.forEach(f => formData.append('files', f));

        const response = await fetch('/api/announcements/send', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="_csrf"]')?.content || ''
            },
            body: formData
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Announcement Sent!',
                text: 'Your mail has been dispatched and notifications delivered.',
                customClass: { popup: 'rounded-2xl shadow-xl' }
            });
            document.getElementById('announcement-form').reset();
            announcementFiles = [];
            renderAnnouncementFileList();
        } else {
            const err = await response.json();
            Swal.fire({ icon: 'error', title: 'Failed to Send', text: err.error || 'An error occurred during dispatch.' });
        }
    } catch (e) {
        console.error('Announcement Error:', e);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error or server unavailable.' });
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

