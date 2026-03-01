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

    @Override
    public CourseDto createCourse(CourseDto courseDto) {
        Course course = courseMapper.toEntity(courseDto);
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
    public List<CourseDto> getCoursesBySpeciality(Integer specialityId) {
        return courseRepository.findBySpecialitySpecialityId(specialityId)
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

        course.setTeacher(teacher);
        Course saved = courseRepository.save(course);
        return courseMapper.toDto(saved);
    }

    @Override
    public List<CourseDto> getCoursesByTeacher(Integer teacherId) {
        return courseRepository.findByTeacherUserId(teacherId)
                .stream()
                .map(courseMapper::toDto)
                .collect(Collectors.toList());
    }
}