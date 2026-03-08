package group3.en.stuattendance.Timetablemanager.Mapper;

import group3.en.stuattendance.Timetablemanager.DTO.TimetablecontentDto;
import group3.en.stuattendance.Timetablemanager.DTO.TimetableEntryDto;
import group3.en.stuattendance.Timetablemanager.Model.Timetablecontent;
import group3.en.stuattendance.Timetablemanager.Model.TimetableEntry;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;
import java.time.LocalDate;

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
                .semester(entity.getSemester())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .version(entity.getVersion())
                .isActive(entity.getIsActive())
                .entries(entity.getEntries() != null ? entity.getEntries().stream()
                        .map(this::toEntryDto)
                        .collect(Collectors.toList()) : null)
                .build();
    }

    public TimetableEntryDto toEntryDto(TimetableEntry entity) {
        if (entity == null) return null;
        return TimetableEntryDto.builder()
                .entryId(entity.getEntryId())
                .dayOfWeek(entity.getDayOfWeek())
                .day(entity.getDay())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .isEvent(entity.getIsEvent())
                .eventName(entity.getEventName())
                .courseId(entity.getCourse() != null ? entity.getCourse().getCourseId() : null)
                .courseName(entity.getCourse() != null ? entity.getCourse().getCourseName() : null)
                .teacherId(entity.getTeacher() != null ? entity.getTeacher().getUserId() : null)
                .teacherName(entity.getTeacher() != null ? entity.getTeacher().getUsername() : null)
                .color(entity.getColor())
                .build();
    }

    public Timetablecontent toEntity(TimetablecontentDto dto) {
        if (dto == null) return null;
        return Timetablecontent.builder()
                .timetableId(dto.getTimetableId())
                .week(dto.getWeek())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .version(dto.getVersion() != null ? dto.getVersion() : 1)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();
    }

    public TimetableEntry toEntity(TimetableEntryDto dto) {
        if (dto == null) return null;
        return TimetableEntry.builder()
                .entryId(dto.getEntryId())
                .dayOfWeek(dto.getDayOfWeek())
                .day(dto.getDay() != null ? dto.getDay() : dayIndexToName(dto.getDayOfWeek()))
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .isEvent(dto.getIsEvent() != null ? dto.getIsEvent() : false)
                .eventName(dto.getEventName())
                .color(dto.getColor())
                .build();
    }

    /** Converts a 0-based day index (0=Monday … 5=Saturday) to the day name stored in the DB. */
    public static String dayIndexToName(Integer dayOfWeek) {
        if (dayOfWeek == null) return "MONDAY";
        String[] names = {"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"};
        return dayOfWeek >= 0 && dayOfWeek < names.length ? names[dayOfWeek] : "MONDAY";
    }
}