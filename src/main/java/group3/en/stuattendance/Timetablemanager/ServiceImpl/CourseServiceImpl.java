package group3.en.stuattendance.Timetablemanager.ServiceImpl;

import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import group3.en.stuattendance.Timetablemanager.Mapper.CourseMapper;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Repository.CourseRepository;
import group3.en.stuattendance.Timetablemanager.Service.CourseService;
import group3.en.stuattendance.Institutionmanager.Model.Speciality;
import group3.en.stuattendance.Institutionmanager.Repository.SpecialityRepository;
import group3.en.stuattendance.Usermanager.Model.User;
import group3.en.stuattendance.Usermanager.Repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final SpecialityRepository specialityRepository;
    private final UserRepository userRepository;
    private final CourseMapper courseMapper;
    private final group3.en.stuattendance.Usermanager.Mapper.UserMapper userMapper;

    @Override
    public CourseDto createCourse(CourseDto courseDto) {
        Course course = courseMapper.toEntity(courseDto);
        
        if (courseDto.getSpecialityId() != null) {
            Speciality speciality = specialityRepository.findById(courseDto.getSpecialityId())
                    .orElseThrow(() -> new EntityNotFoundException("Speciality not found with id: " + courseDto.getSpecialityId()));
            course.setSpeciality(speciality);
        }

        if (courseDto.getTeacherIds() != null && !courseDto.getTeacherIds().isEmpty()) {
            List<User> teachers = userRepository.findAllById(courseDto.getTeacherIds());
            course.setTeachers(new java.util.HashSet<>(teachers));
        }

        Course saved = courseRepository.save(course);
        return courseMapper.toDto(saved);
    }

    @Override
    public CourseDto updateCourse(Integer id, CourseDto courseDto) {
        Course existing = courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + id));

        existing.setCourseName(courseDto.getCourseName());
        existing.setCode(courseDto.getCode());
        existing.setCredits(courseDto.getCredits());
        existing.setHoursPerWeek(courseDto.getHoursPerWeek());
        existing.setDescription(courseDto.getDescription());
        existing.setSemester(courseDto.getSemester());
        existing.setLevel(courseDto.getLevel());

        if (courseDto.getSpecialityId() != null) {
            Speciality speciality = specialityRepository.findById(courseDto.getSpecialityId())
                    .orElseThrow(() -> new EntityNotFoundException("Speciality not found"));
            existing.setSpeciality(speciality);
        }

        if (courseDto.getTeacherIds() != null) {
            List<User> teachers = userRepository.findAllById(courseDto.getTeacherIds());
            existing.setTeachers(new java.util.HashSet<>(teachers));
        }

        Course updated = courseRepository.save(existing);
        return courseMapper.toDto(updated);
    }

    @Override
    public void deleteCourse(Integer id) {
        if (!courseRepository.existsById(id)) {
            throw new EntityNotFoundException("Course not found with id: " + id);
        }
        courseRepository.deleteById(id);
    }

    @Override
    public CourseDto getCourseById(Integer id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + id));
        return courseMapper.toDto(course);
    }

    @Override
    public List<CourseDto> getAllCourses() {
        return courseRepository.findAll()
                .stream()
                .map(courseMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseDto> getCoursesBySpecialityAndSemester(Integer specialityId, Integer semester) {
        return courseRepository.findBySpecialitySpecialityIdAndSemester(specialityId, semester)
                .stream()
                .map(courseMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public CourseDto assignCourseToSpeciality(Integer courseId, Integer specialityId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + courseId));

        Speciality speciality = specialityRepository.findById(specialityId)
                .orElseThrow(() -> new EntityNotFoundException("Speciality not found with id: " + specialityId));

        course.setSpeciality(speciality);
        Course saved = courseRepository.save(course);
        return courseMapper.toDto(saved);
    }

    @Override
    public CourseDto assignTeacherToCourse(Integer courseId, Integer teacherId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + courseId));

        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new EntityNotFoundException("Teacher not found with id: " + teacherId));

        // Optional: Check if user has TEACHER role
        boolean isTeacher = teacher.getRoles().stream()
                .anyMatch(r -> r.getName().equalsIgnoreCase("ROLE_TEACHER") || r.getName().equalsIgnoreCase("TEACHER"));
        if (!isTeacher) {
            throw new IllegalArgumentException("User with ID " + teacherId + " does not have the TEACHER role.");
        }

        course.getTeachers().add(teacher);
        Course saved = courseRepository.save(course);
        return courseMapper.toDto(saved);
    }

    @Override
    public CourseDto removeTeacherFromCourse(Integer courseId, Integer teacherId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
        
        course.getTeachers().removeIf(t -> t.getUserId().equals(teacherId));
        Course saved = courseRepository.save(course);
        return courseMapper.toDto(saved);
    }

    @Override
    public List<group3.en.stuattendance.Usermanager.DTO.UserDto> getTeachersByCourse(Integer courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
        
        return course.getTeachers().stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseDto> getCoursesByTeacher(Integer teacherId) {
        return courseRepository.findAll().stream()
                .filter(c -> c.getTeachers().stream().anyMatch(t -> t.getUserId().equals(teacherId)))
                .map(courseMapper::toDto)
                .collect(Collectors.toList());
    }
}