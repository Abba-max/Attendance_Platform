// Reports module logic

// Shared helper to get Monday date of a specific week number
function getMondayOfISOWeek(week) {
    const today = new Date();
    const getWeekNumber = function(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return [d.getUTCFullYear(), weekNo];
    };
    
    const [currYear, currWeek] = getWeekNumber(today);
    
    // Parse '2024-W20' format
    let targetWeek = week;
    if (typeof week === 'string' && week.includes('-W')) {
        targetWeek = parseInt(week.split('-W')[1], 10);
    }
    
    const diff = targetWeek - currWeek;
    
    const monday = new Date();
    monday.setDate(today.getDate() + (diff * 7) - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    return monday.toISOString().split('T')[0];
}

function filterClassrooms(specId, classDropdownId) {
    const classDropdown = document.getElementById(classDropdownId);
    const options = classDropdown.querySelectorAll('option');
    
    classDropdown.value = ''; // Reset selection
    
    options.forEach(opt => {
        if (!opt.value) return; // Skip "Select Class..."
        const optSpec = opt.getAttribute('data-spec');
        if (!specId || optSpec === specId) {
            opt.style.display = '';
        } else {
            opt.style.display = 'none';
        }
    });
}

async function openReportPreview(pdfUrl, excelUrl) {
    // If offline, check if the report is cached first
    if (!navigator.onLine) {
        try {
            await fetch(pdfUrl, { method: 'HEAD' });
        } catch (e) {
            if (typeof showNotification === 'function') {
                showNotification("You are offline and this report hasn't been generated before. Please connect to the internet to view new reports.", 'warning');
            }
            return;
        }
    }

    const modal = document.getElementById('reportPreviewModal');
    const frame = document.getElementById('reportPreviewFrame');
    const loading = document.getElementById('reportPreviewLoading');
    const btnPdf = document.getElementById('btnDownloadPdf');
    const btnExcel = document.getElementById('btnDownloadExcel');
    
    // Reset state
    loading.classList.remove('hidden');
    frame.src = pdfUrl;
    
    // Safety fallback: hide loader after 8 seconds if onload doesn't fire
    // (e.g. if the browser downloads the PDF instead of rendering it inline)
    setTimeout(() => {
        if (!loading.classList.contains('hidden')) {
            loading.classList.add('hidden');
        }
    }, 8000);
    
    // Set download button actions
    btnPdf.onclick = () => window.open(pdfUrl, '_blank');
    btnExcel.onclick = () => window.open(excelUrl, '_blank');
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Trigger reflow
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    document.getElementById('reportPreviewContent').classList.remove('scale-95');
    document.body.style.overflow = 'hidden';
}

function closeReportPreview() {
    const modal = document.getElementById('reportPreviewModal');
    const frame = document.getElementById('reportPreviewFrame');
    
    modal.classList.add('opacity-0');
    document.getElementById('reportPreviewContent').classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        frame.src = '';
        document.body.style.overflow = '';
    }, 300);
}

function downloadDailyReport() {
    const classId = document.getElementById('dailyReportClass').value;
    const date = document.getElementById('dailyReportDate').value;
    
    if (!classId || !date) {
        if (typeof showNotification === 'function') {
            showNotification("Please select a class and date.", 'warning');
        }
        return;
    }
    
    const pdfUrl = `/api/attendance/daily-report/pdf?classroomId=${classId}&date=${date}`;
    const excelUrl = `/api/attendance/daily-report/excel?classroomId=${classId}&date=${date}`;
    openReportPreview(pdfUrl, excelUrl);
}

function downloadWeeklyReport() {
    const classId = document.getElementById('weeklyReportClass').value;
    const week = document.getElementById('weeklyReportWeek').value; // Week number
    
    if (!classId || !week) {
        if (typeof showNotification === 'function') {
            showNotification("Please select a class and a week.", 'warning');
        }
        return;
    }
    
    const date = getMondayOfISOWeek(week);
    const pdfUrl = `/api/attendance/weekly-report/pdf?classroomId=${classId}&weekStart=${date}`;
    const excelUrl = `/api/attendance/weekly-report/excel?classroomId=${classId}&weekStart=${date}`;
    openReportPreview(pdfUrl, excelUrl);
}

function downloadSemesterReport() {
    const classId = document.getElementById('semesterReportClass').value;
    const semNumber = document.getElementById('semesterReportNumber').value;
    
    if (!classId || !semNumber) {
        if (typeof showNotification === 'function') {
            showNotification("Please select a class and semester.", 'warning');
        }
        return;
    }
    
    const pdfUrl = `/api/attendance/semester-report/pdf?classroomId=${classId}&semester=${semNumber}`;
    const excelUrl = `/api/attendance/semester-report/excel?classroomId=${classId}&semester=${semNumber}`;
    openReportPreview(pdfUrl, excelUrl);
}
