package group3.en.stuattendance.Attendancemanager.Controller;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Attendancemanager.Service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final group3.en.stuattendance.Notificationmanager.Service.NotificationService notificationService;

    @PostMapping("/mark")
    public ResponseEntity<AttendanceRecordDto> markAttendance(@RequestBody AttendanceRecordDto dto) {
        return ResponseEntity.ok(attendanceService.markAttendance(dto));
    }

    /**
     * Student multi-factor check-in (QR/PIN + Geo).
     */
    @PostMapping("/student/check-in")
    public ResponseEntity<AttendanceRecordDto> studentCheckIn(@RequestBody Map<String, Object> payload) {
        Integer sessionId = (Integer) payload.get("sessionId");
        Integer userId = (Integer) payload.get("userId");
        String qrCode = (String) payload.get("qrCode");
        String pin = (String) payload.get("pin");
        String location = (String) payload.get("location");
        
        return ResponseEntity.ok(attendanceService.studentCheckIn(sessionId, userId, qrCode, pin, location));
    }

    /**
     * Teacher manual verification for a specific student.
     */
    @PostMapping("/teacher/verify")
    public ResponseEntity<AttendanceRecordDto> teacherVerify(@RequestBody Map<String, Integer> payload) {
        Integer sessionId = payload.get("sessionId");
        Integer userId = payload.get("userId");
        return ResponseEntity.ok(attendanceService.teacherVerify(sessionId, userId));
    }

    /**
     * Get real-time enrollment status for a session.
     */
    @GetMapping("/session/{sessionId}/enrollment")
    public ResponseEntity<List<AttendanceRecordDto>> getEnrollmentStatus(@PathVariable Integer sessionId) {
        return ResponseEntity.ok(attendanceService.getEnrollmentStatus(sessionId));
    }

    @PostMapping("/teacher-presence")
    public ResponseEntity<AttendanceRecordDto> markTeacherPresence(@RequestBody Map<String, Integer> payload) {
        Integer sessionId = payload.get("sessionId");
        Integer teacherId = payload.get("teacherId");
        return ResponseEntity.ok(attendanceService.markTeacherPresence(sessionId, teacherId));
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<AttendanceRecordDto>> getSessionAttendance(@PathVariable Integer sessionId) {
        return ResponseEntity.ok(attendanceService.getAttendanceBySession(sessionId));
    }

    @PostMapping("/session-token")
    public ResponseEntity<Map<String, String>> generateToken(@RequestBody Map<String, Object> payload) {
        Integer sessionId = (Integer) payload.get("sessionId");
        String type = (String) payload.get("type"); // PIN or QR
        String token = attendanceService.generateSessionToken(sessionId, type);
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/session/{sessionId}/submit")
    public ResponseEntity<Map<String, String>> submitAttendance(@PathVariable Integer sessionId, @RequestParam Integer teacherId) {
        // 1. Mark teacher presence if not done
        attendanceService.markTeacherPresence(sessionId, teacherId);
        
        // 2. Notify Pedagogic Assistants
        notificationService.notifyRole("PEDAGOG", "ATTENDANCE_SUBMISSION", 
            "Teacher has submitted the attendance sheet for Session #" + sessionId);
            
        return ResponseEntity.ok(Map.of("message", "Attendance sheet submitted successfully to the Pedagogic Assistant."));
    }
}
