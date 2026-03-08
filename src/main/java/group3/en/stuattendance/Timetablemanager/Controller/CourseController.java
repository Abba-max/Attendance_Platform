package group3.en.stuattendance.Timetablemanager.Controller;

import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import group3.en.stuattendance.Timetablemanager.Service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @PostMapping
    public ResponseEntity<CourseDto> createCourse(@RequestBody CourseDto courseDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(courseService.createCourse(courseDto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CourseDto> updateCourse(@PathVariable Integer id, @RequestBody CourseDto courseDto) {
        return ResponseEntity.ok(courseService.updateCourse(id, courseDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(@PathVariable Integer id) {
        courseService.deleteCourse(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseDto> getCourseById(@PathVariable Integer id) {
        return ResponseEntity.ok(courseService.getCourseById(id));
    }

    @GetMapping
    public ResponseEntity<List<CourseDto>> getAllCourses() {
        return ResponseEntity.ok(courseService.getAllCourses());
    }

    @GetMapping("/speciality/{specialityId}")
    public ResponseEntity<List<CourseDto>> getCoursesBySpeciality(
            @PathVariable Integer specialityId) {
        return ResponseEntity.ok(courseService.getCoursesBySpeciality(specialityId));
    }

    @PutMapping("/{courseId}/speciality/{specialityId}")
    public ResponseEntity<CourseDto> assignCourseToSpeciality(
            @PathVariable Integer courseId,
            @PathVariable Integer specialityId) {
        return ResponseEntity.ok(courseService.assignCourseToSpeciality(courseId, specialityId));
    }

    @PutMapping("/{courseId}/teacher/{teacherId}")
    public ResponseEntity<CourseDto> assignTeacherToCourse(
            @PathVariable Integer courseId,
            @PathVariable Integer teacherId) {
        return ResponseEntity.ok(courseService.assignTeacherToCourse(courseId, teacherId));
    }

    @GetMapping("/{courseId}/teachers")
    public ResponseEntity<List<group3.en.stuattendance.Usermanager.DTO.UserDto>> getTeachersByCourse(@PathVariable Integer courseId) {
        return ResponseEntity.ok(courseService.getTeachersByCourse(courseId));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<List<CourseDto>> getCoursesByTeacher(@PathVariable Integer teacherId) {
        return ResponseEntity.ok(courseService.getCoursesByTeacher(teacherId));
    }
}