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
