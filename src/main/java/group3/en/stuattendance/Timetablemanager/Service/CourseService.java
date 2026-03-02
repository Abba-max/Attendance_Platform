package group3.en.stuattendance.Timetablemanager.Service;

import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import java.util.List;

public interface CourseService {

    CourseDto createCourse(CourseDto courseDto);

    CourseDto updateCourse(Integer id, CourseDto courseDto);

    void deleteCourse(Integer id);

    CourseDto getCourseById(Integer id);

    List<CourseDto> getAllCourses();

    List<CourseDto> getCoursesBySpecialityAndSemester(Integer specialityId, Integer semester);

    CourseDto assignCourseToSpeciality(Integer courseId, Integer specialityId);

    CourseDto assignTeacherToCourse(Integer courseId, Integer teacherId);

    List<group3.en.stuattendance.Usermanager.DTO.UserDto> getTeachersByCourse(Integer courseId);

    CourseDto removeTeacherFromCourse(Integer courseId, Integer teacherId);

    List<CourseDto> getCoursesByTeacher(Integer teacherId);

    group3.en.stuattendance.Usermanager.DTO.BulkImportResultDto bulkImportCourses(org.springframework.web.multipart.MultipartFile file);
}