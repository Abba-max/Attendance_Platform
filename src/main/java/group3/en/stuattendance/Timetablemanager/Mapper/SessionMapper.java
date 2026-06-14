package group3.en.stuattendance.Timetablemanager.Mapper;

import group3.en.stuattendance.Timetablemanager.DTO.SessionDto;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import org.springframework.stereotype.Component;

import java.time.temporal.ChronoUnit;

@Component
public class SessionMapper {

    public SessionDto toDto(Session session) {
        if (session == null) return null;

        long present = 0;
        if (session.getAttendanceRecords() != null) {
            present = session.getAttendanceRecords().stream()
                .filter(r -> r.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.PRESENT || 
                             r.getStatus() == group3.en.stuattendance.Attendancemanager.Enum.AttendanceStatus.LATE ||
                             (r.getHoursAttended() != null && r.getHoursAttended() > 0))
                .count();
        }
        
        int totalEnrolled = (session.getClassroom() != null && session.getClassroom().getStudents() != null) ? 
                            session.getClassroom().getStudents().size() : 0;

        String effectiveStatus = session.getStatus() != null ? session.getStatus().name() : null;
        
        // Logic: If it's still SCHEDULED but the time is past, show as MISSED in UI
        if (group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.SCHEDULED.name().equals(effectiveStatus) && session.isPast()) {
            effectiveStatus = group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.MISSED.name();
        }
        
        // Logic: If it's IN_PROGRESS but from a previous day, show as COMPLETED (orphaned)
        if (group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.IN_PROGRESS.name().equals(effectiveStatus) && 
            session.getDate() != null && session.getDate().isBefore(java.time.LocalDate.now())) {
            effectiveStatus = group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.COMPLETED.name();
        }

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
                .courseName(session.getCourse() != null ? session.getCourse().getCourseName() : null)
                .teacherId(session.getTeacher() != null ? session.getTeacher().getUserId() : null)
                .teacherName(session.getTeacher() != null ? session.getTeacher().getUsername() : null)
                .classroomId(session.getClassroom() != null ? session.getClassroom().getClassId() : null)
                .classroomName(session.getClassroom() != null ? session.getClassroom().getName() : null)
                .status(effectiveStatus)
                .level(session.getClassroom() != null ? session.getClassroom().getLevel() : null)
                .specialityName(session.getClassroom() != null && session.getClassroom().getSpeciality() != null ? session.getClassroom().getSpeciality().getName() : null)
                .actualStartTime(session.getActualStartTime())
                .actualEndTime(session.getActualEndTime())
                .tempPin(session.getTempPin())
                .isValidated(session.getIsValidated())
                .isActive(session.isActive())
                .totalHours(session.getStartTime() != null && session.getEndTime() != null ? 
                    (int) (session.getEndTime().isBefore(session.getStartTime()) ? 
                        24 + ChronoUnit.HOURS.between(session.getStartTime(), session.getEndTime()) : 
                        ChronoUnit.HOURS.between(session.getStartTime(), session.getEndTime())) : 0)
                .presentCount((int) present)
                .totalStudents(totalEnrolled)
                .attendanceRate(totalEnrolled > 0 ? (double) present / totalEnrolled * 100.0 : 0.0)
                .build();
    }

    public Session toEntity(SessionDto dto) {
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
                .tempPin(dto.getTempPin())
                .isValidated(dto.getIsValidated() != null ? dto.getIsValidated() : false)
                .status(dto.getStatus() != null ? group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.valueOf(dto.getStatus()) : group3.en.stuattendance.Timetablemanager.Enum.SessionStatus.SCHEDULED)
                .actualStartTime(dto.getActualStartTime())
                .actualEndTime(dto.getActualEndTime())
                .build();
    }
}