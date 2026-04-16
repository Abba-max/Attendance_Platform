package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Timetablemanager.DTO.AssignTeacherDto;
import group3.en.stuattendance.Timetablemanager.Mapper.AssignTeacherMapper;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.TeacherCourseAssignment;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Repository.TeacherCourseAssignmentRepository;
import group3.en.stuattendance.Timetablemanager.Service.TeacherAssignmentService;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TeacherAssignmentServiceImpl implements TeacherAssignmentService {

    private final TeacherCourseAssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final AssignTeacherMapper assignTeacherMapper;

    @Override
    public AssignTeacherDto assignTeacherToCourse(Integer teacherId, Integer courseId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new EntityNotFoundException("Teacher not found with id: " + teacherId));

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + courseId));

        boolean alreadyAssigned = assignmentRepository
                .existsByTeacherUserIdAndCourseCourseId(teacherId, courseId);

        if (alreadyAssigned) {
            throw new IllegalStateException("Teacher is already assigned to this course.");
        }

        TeacherCourseAssignment assignment = TeacherCourseAssignment.builder()
                .teacher(teacher)
                .course(course)
                .build();

        TeacherCourseAssignment saved = assignmentRepository.save(assignment);
        return assignTeacherMapper.toDto(saved);
    }

    @Override
    public void removeTeacherFromCourse(Integer teacherId, Integer courseId) {
        if (!assignmentRepository.existsByTeacherUserIdAndCourseCourseId(teacherId, courseId)) {
            throw new EntityNotFoundException("Assignment not found for teacher: "
                    + teacherId + " and course: " + courseId);
        }
        assignmentRepository.deleteByTeacherUserIdAndCourseCourseId(teacherId, courseId);
    }

    @Override
    public List<AssignTeacherDto> getTeachersByCourse(Integer courseId) {
        return assignmentRepository.findByCourseCourseId(courseId)
                .stream()
                .map(assignTeacherMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<AssignTeacherDto> getCoursesByTeacher(Integer teacherId) {
        return assignmentRepository.findByTeacherUserId(teacherId)
                .stream()
                .map(assignTeacherMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public boolean isTeacherAssignedToCourse(Integer teacherId, Integer courseId) {
        return assignmentRepository.existsByTeacherUserIdAndCourseCourseId(teacherId, courseId);
    }

    @Override
    public List<AssignTeacherDto> searchTeachersByCourseAndName(Integer courseId, String name) {
        return assignmentRepository.searchTeachersByCourseAndName(courseId, name)
                .stream()
                .map(assignTeacherMapper::toDto)
                .collect(Collectors.toList());
    }
}