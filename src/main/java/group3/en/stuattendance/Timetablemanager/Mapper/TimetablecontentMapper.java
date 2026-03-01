package group3.en.stuattendance.Timetablemanager.Mapper;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import org.springframework.stereotype.Component;

@Component
public class TimetablecontentMapper {

    public TimetablecontentDto toDto(Timetablecontent entity) {
        if (entity == null) return null;
        return TimetablecontentDto.builder()
                .timetableId(entity.getTimetableId())
                .courseId(entity.getCourse() != null ? entity.getCourse().getCourseId() : null)
                .courseName(entity.getCourse() != null ? entity.getCourse().getCourseName() : null)
                .sessionId(entity.getSession() != null ? entity.getSession().getSessionId() : null)
                .sessionDate(entity.getSession() != null ? entity.getSession().getDate() : null)
                .sessionStartTime(entity.getSession() != null ? entity.getSession().getStartTime() : null)
                .sessionEndTime(entity.getSession() != null ? entity.getSession().getEndTime() : null)
                .day(entity.getDay())
                .week(entity.getWeek())
                .build();
    }

    public Timetablecontent toEntity(TimetablecontentDto dto) {
        if (dto == null) return null;
        return Timetablecontent.builder()
                .timetableId(dto.getTimetableId())
                .day(dto.getDay())
                .week(dto.getWeek())
                .build();
    }
}