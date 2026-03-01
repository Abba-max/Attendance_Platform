package group3.en.stuattendance.Timetablemanager.Mapper;

import group3.en.stuattendance.Timetablemanager.DTO.CourseDto;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import org.springframework.stereotype.Component;

@Component
public class CourseMapper {

    public CourseDto toDto(Course course) {
        if (course == null) return null;
        return CourseDto.builder()
                .courseId(course.getCourseId())
                .courseName(course.getCourseName())
                .code(course.getCode())
                .description(course.getDescription())
                .credits(course.getCredits())
                .hoursPerWeek(course.getHoursPerWeek())
                .semester(course.getSemester())
                .level(course.getLevel())
                .specialityId(course.getSpeciality() != null ? course.getSpeciality().getSpecialityId() : null)
                .specialityName(course.getSpeciality() != null ? course.getSpeciality().getName() : null)
                .teacherId(course.getTeacher() != null ? course.getTeacher().getUserId() : null)
                .teacherName(course.getTeacher() != null ? course.getTeacher().getUsername() : null)
                .build();
    }

    public Course toEntity(CourseDto dto) {
        if (dto == null) return null;
        return Course.builder()
                .courseId(dto.getCourseId())
                .courseName(dto.getCourseName())
                .code(dto.getCode())
                .description(dto.getDescription())
                .credits(dto.getCredits())
                .hoursPerWeek(dto.getHoursPerWeek())
                .semester(dto.getSemester())
                .level(dto.getLevel())
                .build();
    }
}