package group3.en.stuattendance.Timetablemanager.Service;

import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import java.util.List;

public interface CourseService {

    CourseDto createCourse(CourseDto courseDto);

    CourseDto updateCourse(Integer id, CourseDto courseDto);

    void deleteCourse(Integer id);

    CourseDto getCourseById(Integer id);

    List<CourseDto> getAllCourses();

    List<CourseDto> getCoursesBySpeciality(Integer specialityId);

    CourseDto assignCourseToSpeciality(Integer courseId, Integer specialityId);

    CourseDto assignTeacherToCourse(Integer courseId, Integer teacherId);

    List<CourseDto> getCoursesByTeacher(Integer teacherId);
}