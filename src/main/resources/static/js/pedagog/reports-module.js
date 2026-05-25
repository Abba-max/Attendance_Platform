// Reports module logic

function downloadDailyReport() {
    const classId = document.getElementById('dailyReportClass').value;
    const date = document.getElementById('dailyReportDate').value;
    
    if (!classId || !date) {
        alert("Please select a class and date.");
        return;
    }
    
    window.open(`/api/attendance/daily-report/pdf?classroomId=${classId}&date=${date}`, '_blank');
}

function downloadWeeklyReport() {
    const classId = document.getElementById('weeklyReportClass').value;
    const date = document.getElementById('weeklyReportDate').value; // Expected Monday of the week
    
    if (!classId || !date) {
        alert("Please select a class and start date (Monday).");
        return;
    }
    
    window.open(`/api/attendance/weekly-report/pdf?classroomId=${classId}&weekStart=${date}`, '_blank');
}

function downloadSemesterReport() {
    const classId = document.getElementById('semesterReportClass').value;
    const semNumber = document.getElementById('semesterReportNumber').value;
    
    if (!classId || !semNumber) {
        alert("Please select a class and semester.");
        return;
    }
    
    window.open(`/api/attendance/semester-report/pdf?classroomId=${classId}&semester=${semNumber}`, '_blank');
}
