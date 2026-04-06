package group3.en.stuattendance.Attendancemanager.Service;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import java.util.List;
import java.util.Map;

public interface AttendanceExportService {
    
    /**
     * Generate a structured report for a session.
     */
    Map<String, Object> getSessionExportData(Integer sessionId);

    /**
     * Generate CSV content for a session (as a simple placeholder for Excel/PDF).
     */
    String generateSessionCsv(Integer sessionId);
}
