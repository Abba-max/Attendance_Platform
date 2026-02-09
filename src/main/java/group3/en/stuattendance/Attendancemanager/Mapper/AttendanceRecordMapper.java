package group3.en.stuattendance.Attendancemanager.Mapper;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Usermanager.Model.Student;
import org.springframework.stereotype.Component;

@Component
public class AttendanceRecordMapper {

    public AttendanceRecordDto toDto(AttendanceRecord entity) {
        if (entity == null) return null;
        return AttendanceRecordDto.builder()
                .attendanceId(entity.getAttendanceId())
                .studentId(entity.getStudent() != null ? entity.getStudent().getUserId() : null)
                .sessionId(entity.getSession() != null ? entity.getSession().getSessionId() : null)
                .status(entity.getStatus())
                .timestamp(entity.getTimestamp())
                .locationAtCheckin(entity.getLocationAtCheckin())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public AttendanceRecord toEntity(AttendanceRecordDto dto, Student student, Session session) {
        if (dto == null) return null;
        return AttendanceRecord.builder()
                .attendanceId(dto.getAttendanceId())
                .student(student)
                .session(session)
                .status(dto.getStatus())
                .timestamp(dto.getTimestamp())
                .locationAtCheckin(dto.getLocationAtCheckin())
                .build();
    }
}
