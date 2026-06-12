package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Institutionmanager.DTO.AcademicYearDto;
import group3.en.stuattendance.Institutionmanager.DTO.ClassroomDto;
import group3.en.stuattendance.Institutionmanager.Mapper.ClassroomMapper;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Service.AcademicYearService;
import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import group3.en.stuattendance.Timetablemanager.Service.CourseService;
import group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto;
import group3.en.stuattendance.Usermanager.DTO.PedagogAttendanceStatsDto;
import group3.en.stuattendance.Usermanager.DTO.PedagogStudentAttendanceStatsDto;
import group3.en.stuattendance.Usermanager.DTO.StudentCreateDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherCreateDto;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/pedagog")
@RequiredArgsConstructor
public class PedagogController {

    private final UserService userService;
    private final CourseService courseService;
    private final group3.en.stuattendance.Timetablemanager.Service.SessionService sessionService;
    private final group3.en.stuattendance.Attendancemanager.Service.AttendanceExportService attendanceExportService;
    private final group3.en.stuattendance.Attendancemanager.Service.AttendanceService attendanceService;
    private final group3.en.stuattendance.Justificationmanager.Service.JustificationService justificationService;
    private final group3.en.stuattendance.Usermanager.Service.PedagogStatsService pedagogStatsService;
    private final group3.en.stuattendance.Institutionmanager.Repository.DepartmentRepository departmentRepository;
    private final AcademicYearService academicYearService;
    private final ClassroomRepository classroomRepository;
    private final ClassroomMapper classroomMapper;

    /**
     * Monitor active sessions in delegated classrooms.
     */
    @GetMapping("/sessions/live")
    public ResponseEntity<List<group3.en.stuattendance.Timetablemanager.DTO.SessionDto>> getLiveMonitoring(
            @org.springframework.security.core.annotation.AuthenticationPrincipal group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails userDetails) {
        return ResponseEntity.ok(sessionService.getLiveSessionsByClassrooms(userDetails.getStaffClassroomIds()));
    }

    /**
     * Get monitoring details for a specific session.
     */
    @GetMapping("/sessions/{id}/monitoring")
    public ResponseEntity<List<group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto>> getSessionMonitoring(@PathVariable Integer id) {
        return ResponseEntity.ok(attendanceService.getEnrollmentStatus(id));
    }

    /**
     * Cancel a session.
     */
    @PostMapping("/sessions/{id}/cancel")
    public ResponseEntity<group3.en.stuattendance.Timetablemanager.DTO.SessionDto> cancelSession(@PathVariable Integer id) {
        return ResponseEntity.ok(sessionService.cancelSession(id));
    }

    /**
     * Export attendance sheet for an assistant.
     */
    @GetMapping("/sessions/{id}/export")
    public ResponseEntity<String> exportAttendance(@PathVariable Integer id) {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"attendance_session_" + id + ".csv\"")
                .body(attendanceExportService.generateSessionCsv(id));
    }

    @PostMapping("/teachers")
    public ResponseEntity<UserDto> createTeacher(@RequestBody TeacherCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.registerTeacher(dto));
    }

    @PostMapping("/students")
    public ResponseEntity<UserDto> createStudent(@RequestBody StudentCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.registerStudent(dto));
    }

    @GetMapping("/teachers")
    public ResponseEntity<List<UserDto>> getAllTeachers() {
        return ResponseEntity.ok(userService.getUsersByRole("TEACHER"));
    }

    @PostMapping("/students/bulk-import")
    public ResponseEntity<BulkImportResultDto> bulkImportStudents(
            @RequestParam("file") MultipartFile file,
            @RequestParam("classroomId") Integer classroomId,
            @RequestParam(defaultValue = "false") boolean dryRun) {
        return ResponseEntity.ok(userService.bulkImportStudents(file, classroomId, dryRun));
    }

    @GetMapping("/students/{id}")
    public ResponseEntity<UserDto> getStudentById(@PathVariable Integer id) {
        return ResponseEntity.ok(userService.getUserDtoById(id));
    }

    @PostMapping("/students/{id}/delegate")
    public ResponseEntity<?> toggleDelegate(
            @PathVariable Integer id,
            @RequestParam Boolean isDelegate) {
        try {
            userService.toggleStudentDelegate(id, isDelegate);
            return ResponseEntity.ok().body(new java.util.HashMap<String, String>() {{
                put("message", "Delegate status updated successfully.");
            }});
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new java.util.HashMap<String, String>() {{
                put("message", e.getMessage());
            }});
        }
    }

    @PostMapping("/courses/bulk-import")
    public ResponseEntity<BulkImportResultDto> bulkImportCourses(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "false") boolean dryRun,
            @RequestParam(required = false) Integer specialityId,
            @RequestParam(required = false) Integer level) {
        return ResponseEntity.ok(courseService.bulkImportCourses(file, dryRun, specialityId, level));
    }

    @GetMapping("/courses/{id}")
    public ResponseEntity<CourseDto> getCourseById(@PathVariable Integer id) {
        return ResponseEntity.ok(courseService.getCourseById(id));
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<CourseDto> updateCourse(
            @PathVariable Integer id,
            @RequestBody CourseDto dto) {
        return ResponseEntity.ok(courseService.updateCourse(id, dto));
    }

    @PostMapping("/courses")
    public ResponseEntity<CourseDto> createCourse(@RequestBody CourseDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(courseService.createCourse(dto));
    }

    @GetMapping("/courses/filter")
    public ResponseEntity<List<CourseDto>> getCoursesByFilter(
            @RequestParam Integer specialityId,
            @RequestParam(required = false) Integer level) {
        return ResponseEntity.ok(courseService.getCoursesBySpecialityAndLevel(specialityId, level));
    }

    @GetMapping("/teachers/filter")
    public ResponseEntity<List<UserDto>> getTeachersByFilter(
            @RequestParam Integer specialityId) {
        return ResponseEntity.ok(userService.getTeachersBySpeciality(specialityId));
    }

    /**
     * List all pending justifications for review.
     */
    @GetMapping("/justifications/pending")
    public ResponseEntity<org.springframework.data.domain.Page<group3.en.stuattendance.Justificationmanager.DTO.JustificationDto>> getPendingJustifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(justificationService.getJustificationsByStatus(
                group3.en.stuattendance.Justificationmanager.Enum.JustificationStatus.PENDING, page, size, "createdAt", "desc"));
    }

    /**
     * Approve a justification.
     */
    @PostMapping("/justifications/{id}/approve")
    public ResponseEntity<group3.en.stuattendance.Justificationmanager.DTO.JustificationDto> approveJustification(@PathVariable Integer id) {
        return ResponseEntity.ok(justificationService.approveJustification(id));
    }

    /**
     * Reject a justification.
     */
    @PostMapping("/justifications/{id}/reject")
    public ResponseEntity<group3.en.stuattendance.Justificationmanager.DTO.JustificationDto> rejectJustification(
            @PathVariable Integer id,
            @RequestParam String reason) {
        return ResponseEntity.ok(justificationService.rejectJustification(id, reason));
    }

    /**
     * Get Attendance Statistics for the department.
     */
    @GetMapping("/stats/attendance")
    public ResponseEntity<List<PedagogAttendanceStatsDto>> getAttendanceStats(
            @org.springframework.security.core.annotation.AuthenticationPrincipal group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails userDetails,
            @RequestParam(required = false) Integer specialityId,
            @RequestParam(required = false) Integer classroomId,
            @RequestParam(required = false) Integer courseId,
            @RequestParam(required = false) Integer week) {
        
        // Find the first department this pedagog manages
        var departments = departmentRepository.findByPedagogicAssistants_UserId(userDetails.getUserId());
        if (departments.isEmpty()) return ResponseEntity.ok(List.of());
        
        return ResponseEntity.ok(pedagogStatsService.getAttendanceStats(
                departments.get(0).getDepartmentId(), specialityId, classroomId, courseId, week));
    }

    /**
     * Get detailed student attendance for a classroom and course.
     */
    @GetMapping("/stats/students")
    public ResponseEntity<List<PedagogStudentAttendanceStatsDto>> getStudentStats(
            @RequestParam Integer classroomId,
            @RequestParam Integer courseId,
            @RequestParam(required = false) Integer week) {
        return ResponseEntity.ok(pedagogStatsService.getStudentAttendanceStats(classroomId, courseId, week));
    }

    /**
     * Get All weeks that have completed sessions.
     */
    @GetMapping("/stats/weeks")
    public ResponseEntity<List<Integer>> getCompletedWeeks() {
        return ResponseEntity.ok(pedagogStatsService.getCompletedWeeks());
    }

    /**
     * Get all academic years — used by the migration page to populate the year selector.
     * Intentionally on the /api/pedagog/ path so PEDAGOG role can access it.
     */
    @GetMapping("/academic-years")
    public ResponseEntity<List<AcademicYearDto>> getAcademicYears() {
        return ResponseEntity.ok(academicYearService.getAllAcademicYears());
    }

    /**
     * Return classrooms eligible as migration targets for a given source classroom.
     * Rules: same speciality, level = source level + 1.
     */
    @GetMapping("/classrooms/eligible-targets")
    public ResponseEntity<List<ClassroomDto>> getEligibleTargetClassrooms(
            @RequestParam Integer fromClassroomId) {
        group3.en.stuattendance.Institutionmanager.Model.Classroom source =
                classroomRepository.findById(fromClassroomId).orElse(null);
        if (source == null || source.getSpeciality() == null || source.getLevel() == null) {
            return ResponseEntity.ok(List.of());
        }
        Integer targetLevel = source.getLevel() + 1;
        List<group3.en.stuattendance.Institutionmanager.Model.Classroom> targets =
                classroomRepository.findBySpeciality_SpecialityIdAndLevel(
                        source.getSpeciality().getSpecialityId(), targetLevel);
        List<ClassroomDto> dtos = targets.stream()
                .map(classroomMapper::toDto)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(dtos);
    }
}