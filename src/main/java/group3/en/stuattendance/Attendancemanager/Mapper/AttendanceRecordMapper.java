package group3.en.stuattendance.Attendancemanager.Mapper;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import group3.en.stuattendance.Attendancemanager.Model.AttendanceRecord;
import group3.en.stuattendance.Timetablemanager.Model.Session;
import group3.en.stuattendance.Usermanager.Model.User;
import org.springframework.stereotype.Component;

@Component
public class AttendanceRecordMapper {

    public AttendanceRecordDto toDto(AttendanceRecord entity) {
        if (entity == null) return null;
        User student = entity.getUser();
        return AttendanceRecordDto.builder()
                .attendanceId(entity.getAttendanceId())
                .userId(student != null ? student.getUserId() : null)
                .studentId(student != null ? student.getUserId() : null)
                .studentFirstName(student != null ? student.getFirstName() : null)
                .studentLastName(student != null ? student.getLastName() : null)
                .studentName(student != null ? student.getFirstName() + " " + student.getLastName() : null)
                .studentMatricule(student != null ? student.getMatricule() : null)
                .sessionId(entity.getSession() != null ? entity.getSession().getSessionId() : null)
                .status(entity.getStatus())
                .comments(entity.getComments())
                .verifiedByTeacher(entity.getVerifiedByTeacher())
                .timestamp(entity.getTimestamp())
                .locationAtCheckin(entity.getLocationAtCheckin())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public AttendanceRecord toEntity(AttendanceRecordDto dto, User user, Session session) {
        if (dto == null) return null;
        return AttendanceRecord.builder()
                .attendanceId(dto.getAttendanceId())
                .user(user)
                .session(session)
                .status(dto.getStatus())
                .timestamp(dto.getTimestamp())
                .locationAtCheckin(dto.getLocationAtCheckin())
                .build();
    }
}
