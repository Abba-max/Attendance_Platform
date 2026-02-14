package group3.en.stuattendance.Timetablemanager.Mapper;

import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.stereotype.Component;

@Component
public class CourseMapper {

    public CourseDto toDto(Course course) {
        if (course == null) return null;
        return CourseDto.builder()
                .courseId(course.getCourseId())
                .courseName(course.getCourseName())
                .credits(course.getCredits())
                .description(course.getDescription())
                .teacherId(course.getTeacher() != null ? course.getTeacher().getUserId() : null)
                .build();
    }

    public Course toEntity(CourseDto dto, User teacher) {
        if (dto == null) return null;
        return Course.builder()
                .courseId(dto.getCourseId())
                .courseName(dto.getCourseName())
                .credits(dto.getCredits())
                .description(dto.getDescription())
                .teacher(teacher)
                .build();
    }
}
