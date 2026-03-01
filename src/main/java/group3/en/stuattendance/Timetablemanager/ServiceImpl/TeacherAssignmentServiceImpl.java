package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Timetablemanager.DTO.AssignTeacherDto;
import group3.en.stuattendance.Timetablemanager.Mapper.AssignTeacherMapper;
import group3.en.stuattendance.Timetablemanager.Model.TeacherCourseAssignment;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Repository.TeacherCourseAssignmentRepository;
import group3.en.stuattendance.Timetablemanager.Service.TeacherAssignmentService;
import group3.en.stuattendance.Institutionmanager.Model.Teacher;
import group3.en.stuattendance.Institutionmanager.Repository.TeacherRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeacherAssignmentServiceImpl implements TeacherAssignmentService {

    private final TeacherRepository teacherRepository;
    private final CourseRepository courseRepository;
    private final TeacherCourseAssignmentRepository assignmentRepository;
    private final AssignTeacherMapper assignTeacherMapper;

    @Override
    public AssignTeacherDto assignTeacherToCourse(Long teacherId, Long courseId) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new EntityNotFoundException("Teacher not found with id: " + teacherId));

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + courseId));

        boolean alreadyAssigned = assignmentRepository
                .existsByTeacherIdAndCourseId(teacherId, courseId);

        if (alreadyAssigned) {
            throw new IllegalStateException("Teacher is already assigned to this course.");
        }

        TeacherCourseAssignment assignment = new TeacherCourseAssignment();
        assignment.setTeacher(teacher);
        assignment.setCourse(course);

        TeacherCourseAssignment saved = assignmentRepository.save(assignment);
        return assignTeacherMapper.toDto(saved);
    }

    @Override
    public void removeTeacherFromCourse(Long teacherId, Long courseId) {
        TeacherCourseAssignment assignment = assignmentRepository
                .findByTeacherIdAndCourseId(teacherId, courseId)
                .orElseThrow(() -> new EntityNotFoundException("Assignment not found for teacher: "
                        + teacherId + " and course: " + courseId));

        assignmentRepository.delete(assignment);
    }

    @Override
    public List<AssignTeacherDTO> getTeachersByCourse(Long courseId) {
        return assignmentRepository.findByCourseId(courseId)
                .stream()
                .map(assignTeacherMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<AssignTeacherDTO> getCoursesByTeacher(Long teacherId) {
        return assignmentRepository.findByTeacherId(teacherId)
                .stream()
                .map(assignTeacherMapper::toDto)
                .collect(Collectors.toList());
    }
}