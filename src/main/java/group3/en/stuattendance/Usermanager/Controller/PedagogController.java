package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Usermanager.DTO.StudentCreateDto;
import group3.en.stuattendance.Usermanager.DTO.TeacherCreateDto;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pedagog")
@RequiredArgsConstructor
public class PedagogController {

    private final UserService userService;

    @PostMapping("/teachers")
    public ResponseEntity<User> createTeacher(@RequestBody TeacherCreateDto dto) {
       return ResponseEntity.ok(userService.registerTeacher(dto));
    }

    @GetMapping("/teachers")
    public ResponseEntity<java.util.List<group3.en.stuattendance.Usermanager.DTO.UserDto>> getAllTeachers() {
        return ResponseEntity.ok(userService.getUsersByRole("TEACHER"));
    }

    @PostMapping("/students/bulk-import")
    public ResponseEntity<group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto> bulkImportStudents(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("classroomId") Integer classroomId) {
        return ResponseEntity.ok(userService.bulkImportStudents(file, classroomId));
    }
}
