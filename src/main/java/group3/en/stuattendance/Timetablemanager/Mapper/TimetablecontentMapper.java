package group3.en.stuattendance.Timetablemanager.Mapper;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import group3.en.stuattendance.Timetablemanager.Model.Course;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import org.springframework.stereotype.Component;

@Component
public class TimetablecontentMapper {

    public TimetablecontentDto toDto(Timetablecontent entity) {
        if (entity == null) return null;
        return TimetablecontentDto.builder()
                .timetableId(entity.getTimetableId())
                .courseId(entity.getCourse() != null ? entity.getCourse().getCourseId() : null)
                .sessionId(entity.getSession() != null ? entity.getSession().getSessionId() : null)
                .day(entity.getDay())
                .week(entity.getWeek())
                .build();
    }

    public Timetablecontent toEntity(TimetablecontentDto dto, Course course, Session session) {
        if (dto == null) return null;
        return Timetablecontent.builder()
                .timetableId(dto.getTimetableId())
                .course(course)
                .session(session)
                .day(dto.getDay())
                .week(dto.getWeek())
                .build();
    }
}
