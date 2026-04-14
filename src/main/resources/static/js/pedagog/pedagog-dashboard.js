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

    setTimeout(() => {
        if (typeof applyStudentFilters === 'function') applyStudentFilters();
        if (typeof applyCourseFilters === 'function') applyCourseFilters();
    }, 200);
});

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
            if (sectionId === 'attendance') {
                const clsFilter = document.getElementById('hubClassFilter');
                if (clsFilter && clsFilter.options.length <= 1) {
                    if (typeof loadHubClasses === 'function') loadHubClasses();
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
        instruction.innerHTML = 'Ensure your CSV has these 2 columns in order:<br><code class="bg-blue-100/50 px-1.5 py-0.5 rounded text-blue-800 font-bold">courseName, code</code> <span class="text-[9px] opacity-70">(Hours and Semester are optional)</span>';
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
        } else {
            option.style.display = "none";
        }
    });
};

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
            closeStudentModal();
            window.location.reload(); // Refresh to see stats update
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Failed to register student', 'error');
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
        headers = "courseName,code,totalHours,semester\n";
        example = "Data Structures,CS201,60,1\nAlgorithms,CS202,45,2";
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
            resetTeacherSelection();
            closeCourseModal();
            window.location.reload();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to save course', 'error');
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
                    } catch (e) {}
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
        const res = await fetch('/api/timetablecontent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showNotification('Timetable saved successfully! All entries have been stored.', 'success');
        } else {
            let detail = '';
            try { const body = await res.json(); detail = body.message || body.error || ''; } catch (_) {}
            showNotification(`Failed to save timetable.${ detail ? ' ' + detail : ' Please check server logs for details.' }`, 'error');
        }
    } catch (err) {
        console.error('Error saving timetable:', err);
        showNotification('Network error ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â could not reach the server. Check your connection and try again.', 'error');
    }
};

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
        showNotification('error', 'Please select a classroom first.');
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
            showNotification(result.message || 'Timetable emails sent successfully!', 'success');
            closeEmailTTModal();
        } else {
            showNotification(result.error || 'Failed to send emails.', 'error');
        }
    } catch (error) {
        console.error('Email error:', error);
        showNotification('Network error while sending emails.', 'error');
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
window.loadPlanning = async function() {
    console.log("Loading planning...");
    const specId = document.getElementById('planningSpecId').value;
    const level = document.getElementById('planningLevel').value;
    const week = document.getElementById('planningWeek').value;
    const semester = 1; // Default semester
    
    // Clear grid and update headers
    clearPlanningGrid();
    updatePlanningDates(week);

    if (!specId || !level || !week) return;

    try {
        // 1. Resolve Classroom
        const resolveResp = await fetch(`/api/timetablecontent/resolve-classroom?specialityId=${specId}&level=${level}`);
        if (!resolveResp.ok) {
            console.warn("No classroom found for the selected speciality and level.");
            return;
        }
        const { classroomId } = await resolveResp.json();
        
        // 2. Fetch Timetable
        const resp = await fetch(`/api/timetablecontent/search?classroomId=${classroomId}&week=${week}&semester=${semester}`);
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

    entries.forEach(entry => {
        const dayIndex = entry.dayOfWeek !== null ? entry.dayOfWeek : dayMap[entry.day.toUpperCase()];
        const startHour = parseInt(entry.startTime.split(':')[0]);
        const endHour = parseInt(entry.endTime.split(':')[0]);
        const duration = endHour - startHour;

        const slot = document.getElementById(`planning-slot-${startHour}-${dayIndex}`);
        if (slot) {
            const block = document.createElement('div');
            block.className = 'tt-block p-2';
            block.style.height = `calc((${duration} * 100%) - 6px)`;
            block.style.borderLeft = `4px solid ${entry.color || '#3b82f6'}`;
            
            const name = entry.isEvent ? (entry.eventName || 'Event') : (entry.courseName || 'Course');
            const teacher = entry.teacherName ? `By ${entry.teacherName}` : '';
            
            block.innerHTML = `
                <div class="flex flex-col h-full overflow-hidden">
                    <span class="text-[9px] font-black uppercase tracking-tight text-slate-400 mb-0.5">${entry.startTime.substring(0, 5)} - ${entry.endTime.substring(0, 5)}</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-black text-slate-800 text-[11px] leading-tight line-clamp-2">${name}</p>
                        <p class="text-[9px] font-bold text-slate-500 mt-0.5 truncate">${teacher}</p>
                    </div>
                </div>
            `;
            slot.appendChild(block);
        }
    });
}

window.exportPlanningPdf = async function() {
    const specId = document.getElementById('planningSpecId').value;
    const level = document.getElementById('planningLevel').value;
    const week = document.getElementById('planningWeek').value;
    
    if (!specId || !level || !week) return alert("Select Speciality, Level, and Week.");
    
    try {
        const resolveResp = await fetch(`/api/timetablecontent/resolve-classroom?specialityId=${specId}&level=${level}`);
        if (!resolveResp.ok) return alert("Classroom not found.");
        const { classroomId } = await resolveResp.json();
        
        window.open(`/api/timetablecontent/export/pdf?classroomId=${classroomId}&week=${week}&semester=1`, '_blank');
    } catch (e) {
        console.error(e);
    }
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

window.loadSessionsMonitor = async function () {
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
        return;
    }

     // Sort by date DESC then startTime DESC (Most recent first)
    sessions.sort((a, b) => {
        const d = (b.date || '').localeCompare(a.date || '');
        return d !== 0 ? d : (b.startTime || '').localeCompare(a.startTime || '');
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
    const confirmed = await ModernConfirm({
        title: "Cancel this session?",
        message: "This will remove the session from the schedule and notify the teacher. This action is permanent.",
        confirmText: "Yes, Cancel Session",
        type: "danger"
    });
    if (!confirmed) return;
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
            loadHubRoster(); // Refresh to update "Attended" count and sync check marks
        })
        .catch(() => showNotification("Failed to update hour status", "error"));
};

window.hubMarkAll = async function(status) {
    const sessionId = document.getElementById('hubSessionFilter').value;
    if (!sessionId) return;
    
    const confirmed = await ModernConfirm({
        title: `Mark All ${status === 'PRESENT' ? 'Present' : 'Absent'}?`,
        message: `This will update the entire roster for this session to ${status.toLowerCase()}.`,
        confirmText: `Mark All ${status === 'PRESENT' ? 'Present' : 'Absent'}`,
        type: status === 'PRESENT' ? 'info' : 'warning'
    });
    if (!confirmed) return;

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
    showNotification("Roster state synchronized with database.", "success");
};

window.exportHubAttendance = function() {
    const sessionId = document.getElementById('hubSessionFilter').value;
    if (!sessionId) return;
    window.open("/api/attendance/session/" + sessionId + "/export/pdf", '_blank');
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

window.initializeNotifications = function() {
    console.log("Initializing Real-Time Notifications...");
    
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
    }, function (error) {
        console.error('WebSocket connection error:', error);
        // Retry connection after 5s
        setTimeout(initializeNotifications, 5000);
    });
};

function handleIncomingNotification(n) {
    console.log("New Notification:", n);
    
    // Show Toast
    if (typeof showNotification === 'function') {
        showNotification(n.message, n.type === 'ATTENDANCE_SUBMITTED' ? 'success' : 'info');
    }
    
    // Update UI (e.g., refresh sessions if on that page)
    const currentSection = new URLSearchParams(window.location.search).get('section');
    if (currentSection === 'sessions' || document.getElementById('section-sessions')?.offsetParent !== null) {
        if (typeof loadSessionsMonitor === 'function') loadSessionsMonitor();
    }
    
    // Update Badge (if any)
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        badge.classList.remove('hidden');
        const count = parseInt(badge.textContent || '0');
        badge.textContent = count + 1;
    }
}
