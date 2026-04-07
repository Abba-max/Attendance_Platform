package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus;
import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails;
import group3.en.stuattendance.Usermanager.DTO.*;
import group3.en.stuattendance.Usermanager.Service.StudentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final StudentService studentService;
    private final group3.en.stuattendance.Justificationmanager.Service.JustificationService justificationService;
    private final group3.en.stuattendance.Timetablemanager.Service.SessionService sessionService;

    public StudentController(
            StudentService studentService,
            group3.en.stuattendance.Justificationmanager.Service.JustificationService justificationService,
            group3.en.stuattendance.Timetablemanager.Service.SessionService sessionService) {
        this.studentService = studentService;
        this.justificationService = justificationService;
        this.sessionService = sessionService;
    }

    @GetMapping("/schedule/today")
    public ResponseEntity<List<StudentScheduleDto>> getTodaySchedule(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(studentService.getTodaySchedule(userDetails.getUserId()));
    }

    @GetMapping("/attendance/history")
    public ResponseEntity<Page<StudentAttendanceHistoryDto>> getAttendanceHistory(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) AttendanceStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(studentService.getAttendanceHistory(userDetails.getUserId(), status, pageable));
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<StudentDashboardStatsDto> getDashboardStats(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(studentService.getDashboardStats(userDetails.getUserId()));
    }

    @GetMapping("/attendance/stats")
    public ResponseEntity<List<StudentAttendanceStatsDto>> getCourseAttendanceStats(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(studentService.getCourseAttendanceStats(userDetails.getUserId()));
    }

    @PostMapping(value = "/justifications/upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto> uploadJustification(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("attendanceId") Integer attendanceId,
            @RequestParam("reason") String reason,
            @RequestPart("file") org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.ok(justificationService.submitJustification(userDetails.getUserId(), attendanceId, file, reason));
    }

    @GetMapping("/justifications")
    public ResponseEntity<List<group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto>> getMyJustifications(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(justificationService.getJustificationsForStudent(userDetails.getUserId()));
    }

    @PostMapping("/attendance/check-in")
    public ResponseEntity<java.util.Map<String, String>> checkIn(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody group3.en.stuattendance.Attendancemanager.DTO.AttendanceRequestDTO request) {
        
        var session = sessionService.getSessionById(request.getSessionId());
        
        if (!"IN_PROGRESS".equals(session.getStatus())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Session is not currently in progress."));
        }

        return ResponseEntity.ok(java.util.Map.of(
            "message", "Check-in request received. Status: PENDING_VALIDATION",
            "sessionId", String.valueOf(request.getSessionId())
        ));
    }
}
