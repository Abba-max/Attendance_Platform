package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.Service.SessionService;
import group3.en.stuattendance.Timetablemanager.Service.PdfExportService;
import group3.en.stuattendance.Attendancemanager.Service.AttendanceService;
import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherClassCourseDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherStudentStatDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherFullStudentDto;
import group3.en.stuattendance.Usermanager.Mapper.UserMapper;
import group3.en.stuattendance.Usermanager.Service.TeacherStatsService;
import group3.en.stuattendance.Usermanager.Service.UserService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.InputStreamResource;

import java.io.ByteArrayInputStream;
import java.util.List;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasAnyRole('TEACHER', 'PEDAGOG', 'ADMIN')")
public class TeacherController {

    private final SessionService sessionService;
    private final UserService userService;
    private final UserMapper userMapper;
    private final group3.en.stuattendance.Attendancemanager.Service.AttendanceExportService attendanceExportService;
    private final PdfExportService pdfExportService;
    private final AttendanceService attendanceService;
    private final TeacherStatsService teacherStatsService;

    public TeacherController(
            SessionService sessionService,
            UserService userService,
            UserMapper userMapper,
            group3.en.stuattendance.Attendancemanager.Service.AttendanceExportService attendanceExportService,
            PdfExportService pdfExportService,
            AttendanceService attendanceService,
            TeacherStatsService teacherStatsService) {
        this.sessionService = sessionService;
        this.userService = userService;
        this.userMapper = userMapper;
        this.attendanceExportService = attendanceExportService;
        this.pdfExportService = pdfExportService;
        this.attendanceService = attendanceService;
        this.teacherStatsService = teacherStatsService;
    }

    /**
     * Get the logged-in teacher's schedule.
     */
    @GetMapping("/sessions/my-schedule")
    public ResponseEntity<List<SessionDto>> getMySchedule(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(sessionService.getSessionsByTeacherSorted(userDetails.getUserId()));
    }

    /**
     * Get students enrolled for a specific session.
     */
    @GetMapping("/sessions/{id}/students")
    public ResponseEntity<List<UserDto>> getSessionStudents(@PathVariable Integer id) {
        SessionDto session = sessionService.getSessionById(id);
        if (session.getClassroomId() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(userService.getStudentsByClassroom(session.getClassroomId())
                .stream()
                .map(userMapper::toDto)
                .toList());
    }

    /**
     * Start a session.
     */
    @PostMapping("/sessions/{id}/start")
    public ResponseEntity<SessionDto> startSession(@PathVariable Integer id) {
        return ResponseEntity.ok(sessionService.startSession(id));
    }

    /**
     * End a session (triggers auto-absence).
     */
    @PostMapping("/sessions/{id}/end")
    public ResponseEntity<SessionDto> endSession(@PathVariable Integer id) {
        return ResponseEntity.ok(sessionService.endSession(id));
    }

    /**
     * Confirm attendance and mark session as completed/validated.
     */
    @PostMapping("/sessions/{id}/confirm-attendance")
    public ResponseEntity<SessionDto> confirmAttendance(@PathVariable Integer id) {
        return ResponseEntity.ok(sessionService.confirmAttendance(id));
    }

    /**
     * Cancel a session.
     */
    @PostMapping("/sessions/{id}/cancel")
    public ResponseEntity<SessionDto> cancelSession(@PathVariable Integer id) {
        return ResponseEntity.ok(sessionService.cancelSession(id));
    }

    /**
     * Export attendance sheet for the teacher (CSV).
     */
    @GetMapping("/sessions/{id}/export")
    public ResponseEntity<String> exportAttendance(@PathVariable Integer id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attendance_session_" + id + ".csv\"")
                .body(attendanceExportService.generateSessionCsv(id));
    }

    /**
     * Export attendance sheet for the teacher (PDF).
     */
    @GetMapping("/sessions/{id}/export/pdf")
    public ResponseEntity<InputStreamResource> exportAttendancePdf(@PathVariable Integer id) {
        SessionDto session = sessionService.getSessionById(id);
        List<AttendanceRecordDto> records = attendanceService.getAttendanceBySession(id);
        ByteArrayInputStream bis = pdfExportService.exportAttendanceToPdf(session, records);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=attendance_session_" + id + ".pdf");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(bis));
    }

    /**
     * Get session details.
     */
    @GetMapping("/sessions/{id}")
    public ResponseEntity<SessionDto> getSession(@PathVariable Integer id) {
        return ResponseEntity.ok(sessionService.getSessionById(id));
    }

    /**
     * Get Course & Classroom mappings for this teacher.
     */
    @GetMapping("/stats/classes")
    public ResponseEntity<List<TeacherClassCourseDto>> getTeacherClasses(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(teacherStatsService.getTeacherClassesAndCourses(userDetails.getUserId()));
    }

    /**
     * Get Student attendance stats for a specific classroom and course.
     */
    @GetMapping("/stats/classes/{classroomId}/courses/{courseId}")
    public ResponseEntity<List<TeacherStudentStatDto>> getStudentAttendanceStats(
            @PathVariable Integer classroomId,
            @PathVariable Integer courseId) {
        return ResponseEntity.ok(teacherStatsService.getStudentAttendanceForCourse(classroomId, courseId));
    }

    /**
     * Get All students across all classes taught by this teacher.
     */
    @GetMapping("/students")
    public ResponseEntity<List<TeacherFullStudentDto>> getMyStudents(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(teacherStatsService.getTeacherFullStudentList(userDetails.getUserId()));
    }
}
