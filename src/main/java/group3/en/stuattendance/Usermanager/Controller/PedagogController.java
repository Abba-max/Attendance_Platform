package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import group3.en.stuattendance.Timetablemanager.Service.CourseService;
import group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto;
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
            @RequestParam Integer level) {
        return ResponseEntity.ok(courseService.getCoursesBySpecialityAndLevel(specialityId, level));
    }

    @GetMapping("/teachers/filter")
    public ResponseEntity<List<UserDto>> getTeachersByFilter(
            @RequestParam Integer specialityId) {
        return ResponseEntity.ok(userService.getTeachersBySpeciality(specialityId));
    }
}