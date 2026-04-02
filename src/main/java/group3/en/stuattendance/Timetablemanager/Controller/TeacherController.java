package group3.en.stuattendance.Timetablemanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.Service.SessionService;
import group3.en.stuattendance.Usermanager.DTO.UserDto;
import group3.en.stuattendance.Usermanager.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
public class TeacherController {

    private final SessionService sessionService;
    private final UserService userService;

    @GetMapping("/sessions")
    public ResponseEntity<List<SessionDto>> getTeacherSessions(@RequestParam Integer teacherId) {
        return ResponseEntity.ok(sessionService.getSessionsByTeacherSorted(teacherId));
    }

    @GetMapping("/sessions/{id}/students")
    public ResponseEntity<List<UserDto>> getSessionStudents(@PathVariable Integer id) {
        SessionDto session = sessionService.getSessionById(id);
        if (session.getClassroomId() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(userService.getStudentsByClassroom(session.getClassroomId()));
    }
}
