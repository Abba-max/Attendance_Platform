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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.List;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final StudentService studentService;
    private final group3.en.stuattendance.Justificationmanager.Service.JustificationService justificationService;
    private final group3.en.stuattendance.Timetablemanager.Service.SessionService sessionService;
    private final group3.en.stuattendance.Attendancemanager.Service.AttendanceService attendanceService;
    private final group3.en.stuattendance.Attendancemanager.Service.AttendanceExportService attendanceExportService;

    public StudentController(
            StudentService studentService,
            group3.en.stuattendance.Justificationmanager.Service.JustificationService justificationService,
            group3.en.stuattendance.Timetablemanager.Service.SessionService sessionService,
            group3.en.stuattendance.Attendancemanager.Service.AttendanceService attendanceService,
            group3.en.stuattendance.Attendancemanager.Service.AttendanceExportService attendanceExportService) {
        this.studentService = studentService;
        this.justificationService = justificationService;
        this.sessionService = sessionService;
        this.attendanceService = attendanceService;
        this.attendanceExportService = attendanceExportService;
    }

    @GetMapping("/schedule/today")
    public ResponseEntity<List<StudentScheduleDto>> getTodaySchedule(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(studentService.getTodaySchedule(userDetails.getUserId()));
    }

    @GetMapping("/sessions/grid")
    public ResponseEntity<List<StudentScheduleDto>> getSessionsForGrid(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Integer week) {
        return ResponseEntity.ok(studentService.getSessionsForGrid(userDetails.getUserId(), week));
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

    @GetMapping("/geofence")
    public ResponseEntity<group3.en.stuattendance.Institutionmanager.DTO.InstitutionDto> getGeofence(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(studentService.getInstitutionGeofence(userDetails.getUserId()));
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
            @RequestParam(value = "hourIndex", required = false) Integer hourIndex,
            @RequestPart("file") org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.ok(justificationService.submitJustification(userDetails.getUserId(), attendanceId, file, reason, hourIndex));
    }

    @GetMapping("/justifications")
    public ResponseEntity<List<group3.en.stuattendance.Justificationmanager.DTO.JustificationResponseDto>> getMyJustifications(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(justificationService.getJustificationsForStudent(userDetails.getUserId()));
    }

    @GetMapping("/attendance/export")
    public ResponseEntity<byte[]> exportAttendanceSheet(@AuthenticationPrincipal CustomUserDetails userDetails) {
        String csvContent = attendanceExportService.generateStudentCsv(userDetails.getUserId());
        byte[] bytes = csvContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "attendance_sheet.csv");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @PostMapping("/attendance/check-in")
    public ResponseEntity<?> checkIn(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody group3.en.stuattendance.Attendancemanager.DTO.AttendanceRequestDTO request) {
        
        var session = sessionService.getSessionById(request.getSessionId());
        
        if (!"IN_PROGRESS".equals(session.getStatus())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Session is not currently in progress."));
        }

        try {
            String location = (request.getLatitude() != null && request.getLongitude() != null) 
                    ? request.getLatitude() + "," + request.getLongitude() 
                    : null;
                    
            var record = attendanceService.studentCheckIn(
                    request.getSessionId(), 
                    userDetails.getUserId(), 
                    request.getQrData(), 
                    request.getPinCode(), 
                    location);
                    
            return ResponseEntity.ok(record);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }
}
