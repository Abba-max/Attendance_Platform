package group3.en.stuattendance.Timetablemanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.AssignTeacherDto;
import group3.en.stuattendance.Timetablemanager.Service.TeacherAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teacher-assignments")
@RequiredArgsConstructor
public class TeacherAssignmentController {

    private final TeacherAssignmentService teacherAssignmentService;

    @PostMapping("/course/{courseId}/teacher/{teacherId}")
    public ResponseEntity<AssignTeacherDto> assignTeacherToCourse(
            @PathVariable Integer courseId,
            @PathVariable Integer teacherId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(teacherAssignmentService.assignTeacherToCourse(teacherId, courseId));
    }

    @DeleteMapping("/course/{courseId}/teacher/{teacherId}")
    public ResponseEntity<Void> removeTeacherFromCourse(
            @PathVariable Integer courseId,
            @PathVariable Integer teacherId) {
        teacherAssignmentService.removeTeacherFromCourse(teacherId, courseId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/course/{courseId}/teachers")
    public ResponseEntity<List<AssignTeacherDto>> getTeachersByCourse(@PathVariable Integer courseId) {
        return ResponseEntity.ok(teacherAssignmentService.getTeachersByCourse(courseId));
    }

    @GetMapping("/teacher/{teacherId}/courses")
    public ResponseEntity<List<AssignTeacherDto>> getCoursesByTeacher(@PathVariable Integer teacherId) {
        return ResponseEntity.ok(teacherAssignmentService.getCoursesByTeacher(teacherId));
    }

    @GetMapping("/course/{courseId}/teacher/{teacherId}/check")
    public ResponseEntity<Boolean> isTeacherAssignedToCourse(
            @PathVariable Integer courseId,
            @PathVariable Integer teacherId) {
        return ResponseEntity.ok(teacherAssignmentService.isTeacherAssignedToCourse(teacherId, courseId));
    }
}