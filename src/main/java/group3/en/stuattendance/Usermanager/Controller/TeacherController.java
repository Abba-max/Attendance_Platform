package group3.en.stuattendance.Usermanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.Service.SessionService;
import group3.en.stuattendance.Usermanager.Authentication.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {

    private final SessionService sessionService;

    /**
     * Get the logged-in teacher's schedule.
     */
    @GetMapping("/sessions/my-schedule")
    public ResponseEntity<List<SessionDto>> getMySchedule(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(sessionService.getSessionsByTeacherSorted(userDetails.getUserId()));
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
     * Get session details.
     */
    @GetMapping("/sessions/{id}")
    public ResponseEntity<SessionDto> getSession(@PathVariable Integer id) {
        return ResponseEntity.ok(sessionService.getSessionById(id));
    }
}
