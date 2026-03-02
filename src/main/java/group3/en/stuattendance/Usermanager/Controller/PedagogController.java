package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Timetablemanager.Service.CourseService;
import group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto;
import group3.en.stuattendance.Usermanager.DTO.StudentCreateDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherCreateDto;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Service.UserService;
import lombok.RequiredArgsConstructor;
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
    public ResponseEntity<User> createTeacher(@RequestBody TeacherCreateDto dto) {
       return ResponseEntity.ok(userService.registerTeacher(dto));
    }

    @GetMapping("/teachers")
    public ResponseEntity<List<UserDto>> getAllTeachers() {
        return ResponseEntity.ok(userService.getUsersByRole("TEACHER"));
    }

    @PostMapping("/students/bulk-import")
    public ResponseEntity<BulkImportResultDto> bulkImportStudents(
            @RequestParam("file") MultipartFile file,
            @RequestParam("classroomId") Integer classroomId) {
        return ResponseEntity.ok(userService.bulkImportStudents(file, classroomId));
    }

    @PostMapping("/courses/bulk-import")
    public ResponseEntity<BulkImportResultDto> bulkImportCourses(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(courseService.bulkImportCourses(file));
    }
}
