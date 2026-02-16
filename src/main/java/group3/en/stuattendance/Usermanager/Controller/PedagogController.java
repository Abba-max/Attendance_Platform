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

    @PostMapping("/students")
    public ResponseEntity<User> createStudent(@RequestBody StudentCreateDto dto) {
        return ResponseEntity.ok(userService.registerStudent(dto));
    }
}
