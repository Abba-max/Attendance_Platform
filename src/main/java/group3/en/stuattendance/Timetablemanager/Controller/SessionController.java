package group3.en.stuattendance.Timetablemanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.Service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @PostMapping
    public ResponseEntity<SessionDto> createSession(@RequestBody SessionDto sessionDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.createSession(sessionDto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SessionDto> updateSession(@PathVariable Integer id, @RequestBody SessionDto sessionDto) {
        return ResponseEntity.ok(sessionService.updateSession(id, sessionDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable Integer id) {
        sessionService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionDto> getSessionById(@PathVariable Integer id) {
        return ResponseEntity.ok(sessionService.getSessionById(id));
    }

    @GetMapping
    public ResponseEntity<List<SessionDto>> getAllSessions() {
        return ResponseEntity.ok(sessionService.getAllSessions());
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<SessionDto>> getSessionsByCourse(@PathVariable Integer courseId) {
        return ResponseEntity.ok(sessionService.getSessionsByCourse(courseId));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<List<SessionDto>> getSessionsByTeacher(@PathVariable Integer teacherId) {
        return ResponseEntity.ok(sessionService.getSessionsByTeacher(teacherId));
    }

    @GetMapping("/classroom/{classroomId}")
    public ResponseEntity<List<SessionDto>> getSessionsByClassroom(@PathVariable Integer classroomId) {
        return ResponseEntity.ok(sessionService.getSessionsByClassroom(classroomId));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<SessionDto>> getSessionsByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(sessionService.getSessionsByDate(date));
    }

    @GetMapping("/week/{week}")
    public ResponseEntity<List<SessionDto>> getSessionsByWeek(@PathVariable Integer week) {
        return ResponseEntity.ok(sessionService.getSessionsByWeek(week));
    }

    @GetMapping("/course/{courseId}/week/{week}")
    public ResponseEntity<List<SessionDto>> getSessionsByCourseAndWeek(
            @PathVariable Integer courseId,
            @PathVariable Integer week) {
        return ResponseEntity.ok(sessionService.getSessionsByCourseAndWeek(courseId, week));
    }

    @GetMapping("/teacher/{teacherId}/date/{date}")
    public ResponseEntity<List<SessionDto>> getSessionsByTeacherAndDate(
            @PathVariable Integer teacherId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(sessionService.getSessionsByTeacherAndDate(teacherId, date));
    }
}