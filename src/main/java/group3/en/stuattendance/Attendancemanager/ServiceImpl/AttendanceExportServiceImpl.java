package group3.en.stuattendance.Attendancemanager.ServiceImpl;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Attendancemanager.Service.AttendanceExportService;
import group3.en.stuattendance.Attendancemanager.Service.AttendanceService;
import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.Service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceExportServiceImpl implements AttendanceExportService {

    private final AttendanceService attendanceService;
    private final SessionService sessionService;

    @Override
    public Map<String, Object> getSessionExportData(Integer sessionId) {
        SessionDto session = sessionService.getSessionById(sessionId);
        List<AttendanceRecordDto> attendance = attendanceService.getEnrollmentStatus(sessionId);

        Map<String, Object> data = new HashMap<>();
        data.put("sessionId", sessionId);
        data.put("courseName", session.getCourseName());
        data.put("teacherName", session.getTeacherName());
        data.put("date", session.getDate());
        data.put("startTime", session.getActualStartTime() != null ? session.getActualStartTime() : session.getStartTime());
        data.put("endTime", session.getActualEndTime() != null ? session.getActualEndTime() : session.getEndTime());
        data.put("classroom", session.getClassroomName());
        
        List<Map<String, String>> studentData = attendance.stream()
                .map(record -> {
                    Map<String, String> s = new HashMap<>();
                    s.put("matricule", record.getStudentMatricule());
                    s.put("name", record.getStudentName());
                    s.put("status", record.getStatus().name());
                    s.put("timestamp", record.getTimestamp() != null ? record.getTimestamp().toString() : "N/A");
                    s.put("validatedByTeacher", String.valueOf(record.getVerifiedByTeacher()));
                    return s;
                })
                .collect(Collectors.toList());
        
        data.put("students", studentData);
        return data;
    }

    @Override
    public String generateSessionCsv(Integer sessionId) {
        Map<String, Object> data = getSessionExportData(sessionId);
        StringBuilder csv = new StringBuilder();
        
        // Header
        csv.append("Session ID,Course,Teacher,Date,Classroom\n");
        csv.append(data.get("sessionId")).append(",")
           .append(data.get("courseName")).append(",")
           .append(data.get("teacherName")).append(",")
           .append(data.get("date")).append(",")
           .append(data.get("classroom")).append("\n\n");
        
        csv.append("Matricule,Name,Status,Timestamp,Teacher Verified\n");
        List<Map<String, String>> students = (List<Map<String, String>>) data.get("students");
        for (Map<String, String> s : students) {
            csv.append(s.get("matricule")).append(",")
               .append(s.get("name")).append(",")
               .append(s.get("status")).append(",")
               .append(s.get("timestamp")).append(",")
               .append(s.get("validatedByTeacher")).append("\n");
        }
        
        return csv.toString();
    }
}
