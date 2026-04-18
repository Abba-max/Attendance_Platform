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
@org.springframework.transaction.annotation.Transactional
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
        existing.setTotalHours(courseDto.getTotalHours());
        existing.setDescription(courseDto.getDescription());
        existing.setLevel(courseDto.getLevel());
        existing.setSemester(courseDto.getSemester());

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
        
        // Force initialization of lazy associations
        if (course.getSpeciality() != null) {
            course.getSpeciality().getName();
        }
        if (course.getTeachers() != null) {
            course.getTeachers().size();
        }
        
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
    public List<CourseDto> getCoursesBySpecialityAndSemester(Integer specialityId, Integer semester) {
        return courseRepository.findBySpecialitySpecialityId(specialityId)
                .stream()
                .filter(c -> c.getSemester() != null && c.getSemester().equals(semester))
                .map(courseMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseDto> getCoursesBySpecialityAndLevel(Integer specialityId, Integer level) {
        return courseRepository.findBySpecialitySpecialityId(specialityId)
                .stream()
                .filter(c -> level == null || (c.getLevel() != null && c.getLevel().equals(level)))
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
        return courseRepository.findByTeachersUserId(teacherId).stream()
                .map(courseMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto bulkImportCourses(org.springframework.web.multipart.MultipartFile file, boolean dryRun, Integer specialityIdFromModal, Integer levelFromModal) {
        group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto result = new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto();
        
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()));
             com.opencsv.CSVReader csvReader = new com.opencsv.CSVReader(reader)) {
            
            List<String[]> rows = csvReader.readAll();
            if (rows.isEmpty()) return result;

            int startRow = 0;
            if (rows.get(0).length > 0 && (rows.get(0)[0].equalsIgnoreCase("courseName") || rows.get(0)[0].equalsIgnoreCase("name") || rows.get(0)[0].equalsIgnoreCase("firstName"))) {
                startRow = 1;
            }

            result.setTotalRows(rows.size() - startRow);

            for (int i = startRow; i < rows.size(); i++) {
                String[] row = rows.get(i);
                int rowNum = i + 1;

                if (row.length < 2) {
                    result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, "N/A", "Missing columns. Required: courseName, code"));
                    result.setFailureCount(result.getFailureCount() + 1);
                    continue;
                }

                String courseName = row[0].trim();
                String code = row[1].trim();
                
                try {
                    // Modal selection is now the EXCLUSIVE source for Speciality and Level
                    if (specialityIdFromModal == null || levelFromModal == null) {
                        result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, courseName, "Speciality and Level must be selected in the dashboard."));
                        result.setFailureCount(result.getFailureCount() + 1);
                        continue;
                    }

                    Integer totalHours = (row.length > 2 && !row[2].trim().isEmpty()) ? Integer.parseInt(row[2].trim()) : 45;
                    Integer semester = (row.length > 3 && !row[3].trim().isEmpty()) ? Integer.parseInt(row[3].trim()) : 1;

                    if (courseRepository.findByCourseName(courseName).isPresent()) {
                         result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, courseName, "Course already exists"));
                         result.setFailureCount(result.getFailureCount() + 1);
                         continue;
                    }

                    // Add to preview data
                    java.util.Map<String, String> previewRow = new java.util.HashMap<>();
                    previewRow.put("courseName", courseName);
                    previewRow.put("code", code);
                    previewRow.put("totalHours", String.valueOf(totalHours));
                    previewRow.put("level", String.valueOf(levelFromModal));
                    previewRow.put("specialityId", String.valueOf(specialityIdFromModal));
                    previewRow.put("semester", String.valueOf(semester));
                    result.getPreviewData().add(previewRow);

                    if (!dryRun) {
                        CourseDto dto = CourseDto.builder()
                                .courseName(courseName)
                                .code(code)
                                .totalHours(totalHours)
                                .level(levelFromModal)
                                .specialityId(specialityIdFromModal)
                                .credits(3)
                                .semester(semester)
                                .build();

                        createCourse(dto);
                    }
                    result.setSuccessCount(result.getSuccessCount() + 1);

                } catch (NumberFormatException e) {
                    result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, courseName, "Invalid number format in numeric columns"));
                    result.setFailureCount(result.getFailureCount() + 1);
                } catch (Exception e) {
                    result.getErrors().add(new group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto.RowError(rowNum, courseName, e.getMessage()));
                    result.setFailureCount(result.getFailureCount() + 1);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV: " + e.getMessage());
        }
        return result;
    }
}