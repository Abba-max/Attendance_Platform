package group3.en.stuattendance.Timetablemanager.Mapper;

import group3.en.stuattendance.Timetablemanager.DTO.AssignTeacherDto;
import group3.en.stuattendance.Timetablemanager.Model.TeacherCourseAssignment;
import org.springframework.stereotype.Component;

@Component
public class AssignTeacherMapper {

    public AssignTeacherDto toDto(TeacherCourseAssignment assignment) {
        if (assignment == null) return null;
        return AssignTeacherDto.builder()
                .assignmentId(assignment.getAssignmentId())
                .teacherId(assignment.getTeacher() != null ? assignment.getTeacher().getUserId() : null)
                .teacherName(assignment.getTeacher() != null ?
                        assignment.getTeacher().getFirstName() + " " + assignment.getTeacher().getLastName() : null)
                .teacherEmail(assignment.getTeacher() != null ? assignment.getTeacher().getEmail() : null)
                .courseId(assignment.getCourse() != null ? assignment.getCourse().getCourseId() : null)
                .courseName(assignment.getCourse() != null ? assignment.getCourse().getCourseName() : null)
                .courseCode(assignment.getCourse() != null ? assignment.getCourse().getCode() : null)
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }

    public TeacherCourseAssignment toEntity(AssignTeacherDto dto) {
        if (dto == null) return null;
        return TeacherCourseAssignment.builder()
                .assignmentId(dto.getAssignmentId())
                .build();
    }
}