document.addEventListener('DOMContentLoaded', function () {
    console.log('Pedagog Dashboard initializing...');

    initializeNavigation();
    initializeMobileMenu();
    initializeProfileDropdown();

    // Initialise date display for the timetable
    updateTTDates();

    // Default section
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') || 'dashboard';
    const navItem = document.querySelector(`[data-section="${section}"]`);
    if (navItem) navItem.click();
});

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

// Bulk Import Modal Management
window.openBulkImportModal = function () {
    const modal = document.getElementById('bulkImportModal');
    const content = document.getElementById('bulkImportModalContent');

    // Reset modal state
    const specSelect = modal.querySelector('select[onchange*="bulkClassroomId"]');
    if (specSelect) specSelect.value = "";
    document.getElementById('bulkClassroomId').value = "";
    document.getElementById('studentCsvFile').value = "";
    document.getElementById('fileNameDisplay').textContent = "Choose CSV file";
    document.getElementById('fileNameDisplay').classList.remove('text-emerald-600');

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
    if (input.files && input.files.length > 0) {
        display.textContent = input.files[0].name;
        display.classList.add('text-emerald-600');
    } else {
        display.textContent = 'Choose CSV file';
        display.classList.remove('text-emerald-600');
    }
};

// Cascading Filter for Individual Student Modal
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
    submitBtn.disabled = true;

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
        submitBtn.disabled = false;
    }
};

// Bulk Student Import
window.startBulkImport = async function () {
    const fileInput = document.getElementById('studentCsvFile');
    const classroomId = document.getElementById('bulkClassroomId').value;
    const loader = document.getElementById('bulkImportLoader');

    if (!classroomId) {
        showNotification('Please select a target classroom', 'warning');
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('Please select a CSV file', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('classroomId', classroomId);

    loader.classList.remove('hidden');

    try {
        const response = await fetch('/api/pedagog/students/bulk-import', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            showNotification(`Import completed! ${result.successCount} success, ${result.failedCount} failures.`, 'success');
            closeBulkImportModal();
            window.location.reload();
        } else {
            showNotification('Failed to process bulk import.', 'error');
        }
    } catch (error) {
        console.error('Error during bulk import:', error);
        showNotification('An error occurred during import.', 'error');
    } finally {
        loader.classList.add('hidden');
    }
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

// Course Filtering Logic
window.applyCourseFilters = function () {
    const specName = document.getElementById('courseSpecFilter').value;
    const levelValue = document.getElementById('courseLevelFilter').value;
    const rows = document.querySelectorAll('.course-row');

    rows.forEach(row => {
        const rowSpec = row.getAttribute('data-spec');
        const rowLevel = row.getAttribute('data-level');

        const specMatch = !specName || rowSpec === specName;
        const levelMatch = !levelValue || rowLevel === levelValue;

        if (specMatch && levelMatch) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
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
    let notification = document.getElementById('notification');

    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }

    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-white',
        info: 'bg-blue-500 text-white'
    };

    notification.className = `fixed top-20 right-8 px-6 py-4 rounded-xl shadow-lg ${colors[type]}`;
    notification.textContent = message;
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';

    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
    }, 5000);
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
    const teachersList = document.getElementById('ttTeachersList');

    if (!specId || !level) return;

    coursesList.innerHTML = '<p class="text-center py-4 text-xs text-slate-400">Loading...</p>';
    teachersList.innerHTML = '<p class="text-center py-4 text-xs text-slate-400">Loading...</p>';

    try {
        const [coursesRes, teachersRes] = await Promise.all([
            fetch(`/api/pedagog/courses/filter?specialityId=${specId}&level=${level}`),
            fetch(`/api/pedagog/teachers/filter?specialityId=${specId}`)
        ]);

        const courses = await coursesRes.json();
        const teachers = await teachersRes.json();

        // Render Courses
        if (courses.length === 0) {
            coursesList.innerHTML = '<p class="text-center py-4 text-xs text-slate-400">No courses available</p>';
        } else {
            coursesList.innerHTML = courses.map(c => `
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-move hover:border-blue-300 transition group relative"
                     draggable="true" ondragstart="handleTTDragStart(event)" 
                     data-type="course" data-id="${c.courseId}" data-name="${c.courseName}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                            ${c.courseName.charAt(0)}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] font-bold text-slate-700 leading-tight truncate">${c.courseName}</p>
                            <p class="text-[9px] text-slate-400 font-medium">${c.code}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Render Teachers
        if (teachers.length === 0) {
            teachersList.innerHTML = '<p class="text-center py-4 text-xs text-slate-400">No teachers available</p>';
        } else {
            teachersList.innerHTML = teachers.map(t => `
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-move hover:border-blue-300 transition group relative"
                     draggable="true" ondragstart="handleTTDragStart(event)" 
                     data-type="teacher" data-id="${t.userId}" data-name="${t.username}">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                            ${t.username.charAt(0)}
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-700">${t.username}</p>
                            <p class="text-[10px] text-slate-400 font-medium">Lecturer</p>
                        </div>
                    </div>
                </div>
            `).join('');
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
        renderCourseInCell(cell, draggedItem);
    } else if (draggedItem.type === 'teacher') {
        assignTeacherToCell(cell, draggedItem);
    }
    draggedItem = null;
};

// Global vars to hold state while waiting for the Custom Modal to submit
let pendingEventDropCell = null;
let pendingEventDropItem = null;

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

function renderCourseInCell(cell, item) {
    const bgColor = item.color || '#00B0FF';
    const isEvent = item.isEvent === true || item.isEvent === 'true';

    cell.innerHTML = `
        <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none z-0"></div>
        <div class="h-full rounded-xl p-2 shadow-sm relative group/block tt-block text-white"
             data-course-id="${item.id || ''}" data-color="${bgColor}" data-duration="1" 
             data-is-event="${isEvent}" data-event-name="${item.name}"
             style="background-color: ${bgColor}; z-index: 10;">
            <div class="flex flex-col h-full">
                <p class="text-[10px] font-black leading-tight mb-1 overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.name}</p>
                <div class="mt-auto flex items-center justify-between">
                    ${isEvent ? '' : `
                    <div class="teacher-info flex items-center gap-1 opacity-90">
                        <span class="text-[8px] font-bold">Teacher:</span>
                        <span class="teacher-name text-[9px] font-black truncate max-w-[60px]">Unassigned</span>
                    </div>
                    `}
                    <button onclick="removeTTBlock(this)" class="opacity-0 group-hover/block:opacity-100 p-1 text-white hover:text-red-200 transition ${isEvent ? 'ml-auto' : ''}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
            <!-- Color Picker -->
            <div class="absolute -right-2 top-0 bottom-0 flex flex-col justify-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity z-20">
                <div onclick="event.stopPropagation(); setTTBlockColor(this.closest('.tt-block'), '#00B0FF')" class="w-2.5 h-2.5 bg-[#00B0FF] rounded-full shadow-sm border border-white cursor-pointer hover:scale-125 transition"></div>
                <div onclick="event.stopPropagation(); setTTBlockColor(this.closest('.tt-block'), '#FF5252')" class="w-2.5 h-2.5 bg-[#FF5252] rounded-full shadow-sm border border-white cursor-pointer hover:scale-125 transition"></div>
                <div onclick="event.stopPropagation(); setTTBlockColor(this.closest('.tt-block'), '#4CAF50')" class="w-2.5 h-2.5 bg-[#4CAF50] rounded-full shadow-sm border border-white cursor-pointer hover:scale-125 transition"></div>
                <div onclick="event.stopPropagation(); setTTBlockColor(this.closest('.tt-block'), '#FFC107')" class="w-2.5 h-2.5 bg-[#FFC107] rounded-full shadow-sm border border-white cursor-pointer hover:scale-125 transition"></div>
            </div>
            
            <!-- Resize Handle -->
            <div class="tt-resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-white/20 rounded-b-xl z-20 transition"></div>
        </div>
    `;
}


function assignTeacherToCell(cell, item) {
    const block = cell.querySelector('.tt-block');
    if (!block) {
        showNotification('Drop a course first!', 'warning');
        return;
    }
    block.setAttribute('data-teacher-id', item.id);
    block.querySelector('.teacher-name').textContent = item.name;
}

window.removeTTBlock = function (btn) {
    const cell = btn.closest('.grid-cell');
    const day = cell.getAttribute('data-day-index');
    const hour = cell.getAttribute('data-hour');
    cell.innerHTML = `
        <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>
    `;
};

window.setTTBlockColor = function (block, color) {
    block.style.backgroundColor = color;
    block.style.borderLeftColor = 'transparent'; // Cleanup old style if present
    block.setAttribute('data-color', color);
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
        cell.innerHTML = '<div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>';
    });

    if (data && data.entries) {
        data.entries.forEach(entry => {
            const cell = document.querySelector(`.grid-cell[data-day-index="${entry.dayOfWeek}"][data-hour="${entry.startTime.split(':')[0]}"]`);
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
                    if (entry.color) {
                        block.style.backgroundColor = entry.color;
                        block.setAttribute('data-color', entry.color);
                    }
                    const startH = parseInt(entry.startTime.split(':')[0]);
                    const endH = parseInt(entry.endTime.split(':')[0]);
                    const duration = Math.max(1, endH - startH);
                    if (duration > 1) {
                        block.setAttribute('data-duration', duration);
                        block.style.position = 'absolute';
                        block.style.top = '0';
                        block.style.left = '0';
                        block.style.right = '0';
                        block.style.height = `calc(${duration * 100}% + ${duration - 1}px)`;
                        block.style.zIndex = '15';
                    }
                }
            }
        });
    }
};

window.saveTimetable = async function () {
    const classroomId = document.getElementById('ttClassSelect').value;
    const startDateStr = document.getElementById('ttStartDate').value;
    const week = startDateStr ? getISOWeek(new Date(startDateStr)) : 1;
    const semester = document.getElementById('ttSemesterSelect').value;
    const academicYearId = document.getElementById('ttAcademicYearSelect')?.value;

    if (!classroomId) {
        showNotification('Select a classroom first', 'warning');
        return;
    }

    const entries = [];
    document.querySelectorAll('.tt-block').forEach(block => {
        const cell = block.closest('.grid-cell');
        const duration = parseInt(block.getAttribute('data-duration') || 1);
        const startHour = parseInt(cell.getAttribute('data-hour'));

        const isEvent = block.getAttribute('data-is-event') === 'true';
        const eventName = block.getAttribute('data-event-name');

        entries.push({
            dayOfWeek: parseInt(cell.getAttribute('data-day-index')),
            startTime: `${startHour.toString().padStart(2, '0')}:00:00`,
            endTime: `${(startHour + duration).toString().padStart(2, '0')}:00:00`,
            courseId: isEvent ? null : parseInt(block.getAttribute('data-course-id')),
            isEvent: isEvent,
            eventName: isEvent ? eventName : null,
            teacherId: block.getAttribute('data-teacher-id') ? parseInt(block.getAttribute('data-teacher-id')) : null,
            color: block.getAttribute('data-color') || '#00B0FF'
        });
    });

    const payload = {
        classroomId: parseInt(classroomId),
        academicYearId: academicYearId ? parseInt(academicYearId) : null,
        week: parseInt(week),
        semester: parseInt(semester),
        entries: entries
    };

    try {
        const res = await fetch('/api/timetablecontent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showNotification('Timetable saved successfully!', 'success');
        } else {
            showNotification('Failed to save timetable', 'error');
        }
    } catch (err) {
        console.error('Error saving timetable:', err);
        showNotification('An error occurred', 'error');
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
        // Time column is 72px wide; each of the 6 day columns takes equal share of the rest
        const timeColWidth = 72;
        const totalScrollWidth = container.scrollWidth;
        const dayColWidth = (totalScrollWidth - timeColWidth) / 6;
        container.scrollTo({ left: timeColWidth + dayIndex * dayColWidth, behavior: 'smooth' });
    }
};

/** Filter student table rows by speciality, classroom, and level */
window.applyStudentFilters = function () {
    const specName = document.getElementById('studentSpecFilter')?.value || '';
    const className = document.getElementById('studentClassFilter')?.value || '';
    const level = document.getElementById('studentLevelFilter')?.value || '';

    document.querySelectorAll('.student-row').forEach(row => {
        const rowSpec = row.getAttribute('data-spec') || '';
        const rowClass = row.getAttribute('data-class') || '';
        const rowLevel = row.getAttribute('data-level') || '';

        const match = (!specName || rowSpec === specName)
            && (!className || rowClass === className)
            && (!level || rowLevel === level);

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
    // Each hour slot is ~82px high.
    let newDuration = Math.max(1, Math.round((ttStartHeight + dy) / 82));

    // Constraints: Can't exceed the end of the day (18:00). Max Start Hour is 17.
    const cell = ttCurrentBlock.closest('.grid-cell');
    const startHour = parseInt(cell.getAttribute('data-hour'));
    if (startHour + newDuration > 18) {
        newDuration = 18 - startHour;
    }

    ttCurrentBlock.setAttribute('data-duration', newDuration);
    ttCurrentBlock.style.position = 'absolute';
    ttCurrentBlock.style.top = '0';
    ttCurrentBlock.style.left = '0';
    ttCurrentBlock.style.right = '0';
    ttCurrentBlock.style.height = `calc(${newDuration * 100}% + ${newDuration - 1}px)`;
});

document.addEventListener('mouseup', function (e) {
    if (ttIsResizing) {
        ttIsResizing = false;
        if (ttCurrentBlock) ttCurrentBlock.style.zIndex = '15';
        ttCurrentBlock = null;
        document.body.style.cursor = '';
    }
});

// ── Mobile Responsiveness Handlers ────────────────────────────

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
        const dayWidth = (totalWidth - 72) / 6;
        gridContainer.scrollTo({
            left: 72 + (dayIndex * dayWidth) - 10,
            behavior: 'smooth'
        });
    }
};
