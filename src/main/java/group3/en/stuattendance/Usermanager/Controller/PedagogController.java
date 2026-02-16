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
        // Mapping logic to be handled by UserService or Mapper
        // For now, assuming UserService has a method or we adapt existing registerUser
        // Since registerUser takes UserDto, we might need to map TeacherCreateDto to UserDto or add a specific method
        // Given the instructions, let's look at UserService to see if we can add a specific method or reuse registerUser
        // registerUser takes UserDto. let's adapt.
        
        // Actually, it's better to add specific methods to UserService to keep logic clean and encapsulated
        return ResponseEntity.ok(userService.registerTeacher(dto));
    }

    @PostMapping("/students")
    public ResponseEntity<User> createStudent(@RequestBody StudentCreateDto dto) {
        return ResponseEntity.ok(userService.registerStudent(dto));
    }
}
