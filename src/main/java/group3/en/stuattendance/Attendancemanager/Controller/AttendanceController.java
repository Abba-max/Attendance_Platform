package group3.en.stuattendance.Attendancemanager.Controller;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Attendancemanager.Service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails;
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
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG')")
    public org.springframework.http.ResponseEntity<AttendanceRecordDto> markAttendance(@RequestBody AttendanceRecordDto dto) {
        return org.springframework.http.ResponseEntity.ok(attendanceService.markAttendance(dto));
    }

    /**
     * Student multi-factor check-in (QR/PIN + Geo).
     */
    @PostMapping("/student/check-in")
    @PreAuthorize("hasRole('STUDENT')")
    public org.springframework.http.ResponseEntity<AttendanceRecordDto> studentCheckIn(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        Integer sessionId = (Integer) payload.get("sessionId");
        Integer userId = userDetails.getUserId(); // Securely pull ID from token
        String qrCode = (String) payload.get("qrCode");
        String pin = (String) payload.get("pin");
        String location = (String) payload.get("location");
        
        return org.springframework.http.ResponseEntity.ok(attendanceService.studentCheckIn(sessionId, userId, qrCode, pin, location));
    }

    /**
     * Teacher manual verification for a specific student and specific hour.
     */
    @PostMapping("/teacher/verify")
    @PreAuthorize("hasRole('TEACHER')")
    public org.springframework.http.ResponseEntity<AttendanceRecordDto> teacherVerify(@RequestBody Map<String, Object> payload) {
        Integer sessionId = (Integer) payload.get("sessionId");
        Integer userId = (Integer) payload.get("userId");
        Integer hourIndex = (Integer) payload.get("hourIndex");
        return org.springframework.http.ResponseEntity.ok(attendanceService.teacherVerify(sessionId, userId, hourIndex));
    }

    /**
     * Teacher bulk verification for all hours of a session for a student.
     */
    @PostMapping("/teacher/verify-all")
    @PreAuthorize("hasRole('TEACHER')")
    public org.springframework.http.ResponseEntity<AttendanceRecordDto> teacherVerifyAll(@RequestBody Map<String, Integer> payload) {
        Integer sessionId = payload.get("sessionId");
        Integer userId = payload.get("userId");
        return org.springframework.http.ResponseEntity.ok(attendanceService.teacherVerify(sessionId, userId, null));
    }

    /**
     * Get real-time enrollment status for a session.
     */
    @GetMapping("/session/{sessionId}/enrollment")
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG')")
    public org.springframework.http.ResponseEntity<List<AttendanceRecordDto>> getEnrollmentStatus(@PathVariable Integer sessionId) {
        return org.springframework.http.ResponseEntity.ok(attendanceService.getEnrollmentStatus(sessionId));
    }

    /**
     * Get unified roll-call view (Classroom students + status).
     */
    @GetMapping("/session/{sessionId}/students")
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG')")
    public org.springframework.http.ResponseEntity<List<group3.en.stuattendance.Attendancemanager.DTO.TeacherRollCallDto>> getSessionRollCall(@PathVariable("sessionId") Integer sessionId) {
        return org.springframework.http.ResponseEntity.ok(attendanceService.getRollCallForSession(sessionId));
    }

    @PostMapping("/teacher-presence")
    @PreAuthorize("hasRole('TEACHER')")
    public org.springframework.http.ResponseEntity<AttendanceRecordDto> markTeacherPresence(@RequestBody Map<String, Integer> payload) {
        Integer sessionId = payload.get("sessionId");
        Integer teacherId = payload.get("teacherId");
        return org.springframework.http.ResponseEntity.ok(attendanceService.markTeacherPresence(sessionId, teacherId));
    }

    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG')")
    public org.springframework.http.ResponseEntity<List<AttendanceRecordDto>> getSessionAttendance(@PathVariable("sessionId") Integer sessionId) {
        return org.springframework.http.ResponseEntity.ok(attendanceService.getAttendanceBySession(sessionId));
    }

    @PostMapping("/session-token")
    @PreAuthorize("hasRole('TEACHER')")
    public org.springframework.http.ResponseEntity<Map<String, String>> generateToken(@RequestBody Map<String, Object> payload) {
        Integer sessionId = (Integer) payload.get("sessionId");
        String type = (String) payload.get("type"); // PIN or QR
        String token = attendanceService.generateSessionToken(sessionId, type);
        return org.springframework.http.ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/session/{sessionId}/submit")
    @PreAuthorize("hasRole('TEACHER')")
    public org.springframework.http.ResponseEntity<Map<String, String>> submitAttendance(@PathVariable("sessionId") Integer sessionId) {
        // 1. Mark session as validated/submitted
        // logic here if needed or just notify
        
        // 2. Notify Pedagogic Assistants
        notificationService.notifyRole("PEDAGOG", "ATTENDANCE_SUBMISSION", 
            "Teacher has submitted the attendance sheet for Session #" + sessionId);
            
        return org.springframework.http.ResponseEntity.ok(Map.of("message", "Attendance sheet submitted successfully to the Pedagogic Assistant."));
    }

    @PostMapping("/session/{sessionId}/student/{userId}/hour/{hourIndex}")
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG')")
    public org.springframework.http.ResponseEntity<Void> markHourStatus(
            @PathVariable("sessionId") Integer sessionId,
            @PathVariable("userId") Integer userId,
            @PathVariable("hourIndex") Integer hourIndex,
            @RequestParam("status") group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status) {
        attendanceService.markHourStatus(sessionId, userId, hourIndex, status);
        return org.springframework.http.ResponseEntity.ok().build();
    }

    @PostMapping("/session/{sessionId}/mark-all")
    @PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG')")
    public org.springframework.http.ResponseEntity<Void> markAllSessionStatus(
            @PathVariable("sessionId") Integer sessionId,
            @RequestParam("status") group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus status) {
        attendanceService.markAllSessionStatus(sessionId, status);
        return org.springframework.http.ResponseEntity.ok().build();
    }
}
