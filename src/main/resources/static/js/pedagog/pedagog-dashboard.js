document.addEventListener('DOMContentLoaded', function () {
    console.log('Pedagog Dashboard initializing...');

    initializeNavigation();
    initializeMobileMenu();
    initializeProfileDropdown();

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
window.filterClassrooms = function (specId) {
    const select = document.getElementById('classroomSelect');
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
window.openCourseModal = function () {
    const modal = document.getElementById('courseModal');
    const content = document.getElementById('courseModalContent');
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

window.handleCreateCourse = async function (event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/pedagog/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification('Course created successfully!', 'success');
            form.reset();
            closeCourseModal();
            window.location.reload();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to create course', 'error');
        }
    } catch (error) {
        console.error('Error creating course:', error);
        showNotification('An unexpected error occurred.', 'error');
    }
};

// Student Filtering Logic
window.applyStudentFilters = function () {
    const specName = document.getElementById('studentSpecFilter').value;
    const className = document.getElementById('studentClassFilter').value;
    const levelValue = document.getElementById('studentLevelFilter').value;
    const rows = document.querySelectorAll('.student-row');

    rows.forEach(row => {
        const rowSpec = row.getAttribute('data-spec');
        const rowClass = row.getAttribute('data-class');
        const rowLevel = row.getAttribute('data-level');

        const specMatch = !specName || rowSpec === specName;
        const classMatch = !className || rowClass === className;
        const levelMatch = !levelValue || rowLevel === levelValue;

        if (specMatch && classMatch && levelMatch) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
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

    notification.className = `fixed top-20 right-8 px-6 py-4 rounded-xl shadow-lg z-50 transform transition-all duration-300 ${colors[type]}`;
    notification.textContent = message;
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';

    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
    }, 5000);
}
