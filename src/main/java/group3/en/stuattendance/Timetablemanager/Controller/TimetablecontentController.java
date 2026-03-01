package group3.en.stuattendance.Timetablemanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.Service.TimetablecontentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timetablecontent")
@RequiredArgsConstructor
public class TimetablecontentController {

    private final TimetablecontentService timetablecontentService;

    @PostMapping
    public ResponseEntity<TimetablecontentDto> createTimetablecontent(@RequestBody TimetablecontentDto timetablecontentDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timetablecontentService.createTimetablecontent(timetablecontentDto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TimetablecontentDto> updateTimetablecontent(@PathVariable Integer id, @RequestBody TimetablecontentDto timetablecontentDto) {
        return ResponseEntity.ok(timetablecontentService.updateTimetablecontent(id, timetablecontentDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTimetablecontent(@PathVariable Integer id) {
        timetablecontentService.deleteTimetablecontent(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TimetablecontentDto> getTimetablecontentById(@PathVariable Integer id) {
        return ResponseEntity.ok(timetablecontentService.getTimetablecontentById(id));
    }

    @GetMapping
    public ResponseEntity<List<TimetablecontentDto>> getAllTimetablecontents() {
        return ResponseEntity.ok(timetablecontentService.getAllTimetablecontents());
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<TimetablecontentDto>> getTimetablecontentsByCourse(@PathVariable Integer courseId) {
        return ResponseEntity.ok(timetablecontentService.getTimetablecontentsByCourse(courseId));
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<TimetablecontentDto>> getTimetablecontentsBySession(@PathVariable Integer sessionId) {
        return ResponseEntity.ok(timetablecontentService.getTimetablecontentsBySession(sessionId));
    }

    @GetMapping("/week/{week}")
    public ResponseEntity<List<TimetablecontentDto>> getTimetablecontentsByWeek(@PathVariable Integer week) {
        return ResponseEntity.ok(timetablecontentService.getTimetablecontentsByWeek(week));
    }

    @GetMapping("/day/{day}")
    public ResponseEntity<List<TimetablecontentDto>> getTimetablecontentsByDay(@PathVariable String day) {
        return ResponseEntity.ok(timetablecontentService.getTimetablecontentsByDay(day));
    }

    @GetMapping("/week/{week}/day/{day}")
    public ResponseEntity<List<TimetablecontentDto>> getTimetablecontentsByWeekAndDay(
            @PathVariable Integer week,
            @PathVariable String day) {
        return ResponseEntity.ok(timetablecontentService.getTimetablecontentsByWeekAndDay(week, day));
    }

    @GetMapping("/course/{courseId}/week/{week}")
    public ResponseEntity<List<TimetablecontentDto>> getTimetablecontentsByCourseAndWeek(
            @PathVariable Integer courseId,
            @PathVariable Integer week) {
        return ResponseEntity.ok(timetablecontentService.getTimetablecontentsByCourseAndWeek(courseId, week));
    }
}