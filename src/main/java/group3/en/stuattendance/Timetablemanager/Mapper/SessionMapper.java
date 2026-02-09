package group3.en.stuattendance.Timetablemanager.Mapper;

import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Usermanager.Model.Teacher;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import org.springframework.stereotype.Component;

@Component
public class SessionMapper {

    public SessionDto toDto(Session session) {
        if (session == null) return null;
        return SessionDto.builder()
                .sessionId(session.getSessionId())
                .day(session.getDay())
                .date(session.getDate())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .week(session.getWeek())
                .locationGeographicalCoordinates(session.getLocationGeographicalCoordinates())
                .qrCode(session.getQrCode())
                .courseId(session.getCourse() != null ? session.getCourse().getCourseId() : null)
                .teacherId(session.getTeacher() != null ? session.getTeacher().getUserId() : null)
                .classroomId(session.getClassroom() != null ? session.getClassroom().getClassId() : null)
                .build();
    }

    public Session toEntity(SessionDto dto, Course course, Teacher teacher, Classroom classroom) {
        if (dto == null) return null;
        return Session.builder()
                .sessionId(dto.getSessionId())
                .day(dto.getDay())
                .date(dto.getDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .week(dto.getWeek())
                .locationGeographicalCoordinates(dto.getLocationGeographicalCoordinates())
                .qrCode(dto.getQrCode())
                .course(course)
                .teacher(teacher)
                .classroom(classroom)
                .build();
    }
}
