package group3.en.stuattendance.Timetablemanager.Mapper;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.DTO.TimetableEntryDto;
import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import group3.en.stuattendance.Timetablemanager.Model.TimetableEntry;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class TimetablecontentMapper {

    public TimetablecontentDto toDto(Timetablecontent entity) {
        if (entity == null) return null;
        return TimetablecontentDto.builder()
                .timetableId(entity.getTimetableId())
                .classroomId(entity.getClassroom() != null ? entity.getClassroom().getClassId() : null)
                .classroomName(entity.getClassroom() != null ? entity.getClassroom().getName() : null)
                .academicYearId(entity.getAcademicYear() != null ? entity.getAcademicYear().getId() : null)
                .academicYearName(entity.getAcademicYear() != null ? entity.getAcademicYear().getAcademicYear() : null)
                .week(entity.getWeek())
                .entries(entity.getEntries() != null ? entity.getEntries().stream()
                        .map(this::toEntryDto)
                        .collect(Collectors.toList()) : null)
                .build();
    }

    public TimetableEntryDto toEntryDto(TimetableEntry entity) {
        if (entity == null) return null;
        return TimetableEntryDto.builder()
                .entryId(entity.getEntryId())
                .day(entity.getDay())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .courseId(entity.getCourse() != null ? entity.getCourse().getCourseId() : null)
                .courseName(entity.getCourse() != null ? entity.getCourse().getCourseName() : null)
                .teacherId(entity.getTeacher() != null ? entity.getTeacher().getUserId() : null)
                .teacherName(entity.getTeacher() != null ? entity.getTeacher().getUsername() : null)
                .build();
    }

    public Timetablecontent toEntity(TimetablecontentDto dto) {
        if (dto == null) return null;
        return Timetablecontent.builder()
                .timetableId(dto.getTimetableId())
                .week(dto.getWeek())
                .build();
    }

    public TimetableEntry toEntity(TimetableEntryDto dto) {
        if (dto == null) return null;
        return TimetableEntry.builder()
                .entryId(dto.getEntryId())
                .day(dto.getDay())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .build();
    }
}